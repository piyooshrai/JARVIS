from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import logging

from config import get_settings
from cache import cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from database import get_db, init_db, AuditLog
from models import (
    Domain,
    User,
    CreateUserRequest,
    UserListResponse,
    AIAnalysisRequest,
    AIAnalysisResponse
)
from providers.microsoft import MicrosoftGraphProvider
from ai.recommender import AIRecommender

app = FastAPI(title="JARVIS API", version="1.0.0")

settings = get_settings()

# CORS configuration
cors_origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()


# User Management Endpoints (PRIORITY)

@app.get("/api/domains", response_model=List[Domain])
async def get_domains():
    """Fetch verified domains from Microsoft 365"""
    try:
        # Check cache first
        cached = cache.get("domains")
        if cached is not None:
            logger.info("Returning cached domains")
            return cached

        # Fetch from API
        provider = MicrosoftGraphProvider()
        domains = await provider.get_domains()

        # Cache for 1 hour
        cache.set("domains", domains, ttl_seconds=3600)

        return domains
    except Exception as e:
        logger.error(f"Error fetching domains: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users", response_model=UserListResponse)
async def get_users(domain: Optional[str] = None, db: Session = Depends(get_db)):
    """List all O365 users, filterable by domain"""
    try:
        # Create cache key based on domain filter
        cache_key = f"users:{domain if domain else 'all'}"

        # Check cache first
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"Returning cached users for domain: {domain or 'all'}")
            return cached

        # Fetch from API
        provider = MicrosoftGraphProvider()
        users = await provider.get_users(domain=domain)

        # Calculate monthly cost (rough estimate)
        # Business Basic: $6/user/month, Business Standard: $12.50/user/month
        monthly_cost = 0.0
        for user in users:
            if user.get("account_enabled") and user.get("license_type"):
                if "Standard" in user.get("license_type", ""):
                    monthly_cost += 12.50
                else:
                    monthly_cost += 6.00

        result = UserListResponse(
            users=users,
            total=len(users),
            monthly_cost=monthly_cost
        )

        # Cache for 1 hour
        cache.set(cache_key, result, ttl_seconds=3600)

        return result
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users", response_model=User)
async def create_user(user_request: CreateUserRequest, db: Session = Depends(get_db)):
    """Create new user with domain selection"""
    try:
        provider = MicrosoftGraphProvider()
        user = await provider.create_user(
            full_name=user_request.full_name,
            username=user_request.username,
            domain=user_request.domain,
            department=user_request.department,
            license_type=user_request.license_type
        )

        # Invalidate user caches (all variations)
        cache.invalidate("users:all")
        # Also invalidate domain-specific caches (simple approach: clear all user caches)
        for key in list(cache.store.keys()):
            if key.startswith("users:"):
                cache.invalidate(key)

        # Log the action
        log = AuditLog(
            action="create_user",
            resource_type="user",
            resource_id=user["id"],
            user="system",  # TODO: Add authentication
            details=f"Created user {user['email']}"
        )
        db.add(log)
        db.commit()

        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users/{user_id}/disable")
async def disable_user(user_id: str, db: Session = Depends(get_db)):
    """Disable user and release license"""
    try:
        provider = MicrosoftGraphProvider()
        success = await provider.disable_user(user_id)

        if success:
            # Invalidate user caches
            for key in list(cache.store.keys()):
                if key.startswith("users:"):
                    cache.invalidate(key)

            # Log the action
            log = AuditLog(
                action="disable_user",
                resource_type="user",
                resource_id=user_id,
                user="system",
                details=f"Disabled user {user_id}"
            )
            db.add(log)
            db.commit()

            return {"success": True, "message": "User disabled successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to disable user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Delete user permanently"""
    try:
        provider = MicrosoftGraphProvider()
        success = await provider.delete_user(user_id)

        if success:
            # Invalidate user caches
            for key in list(cache.store.keys()):
                if key.startswith("users:"):
                    cache.invalidate(key)

            # Log the action
            log = AuditLog(
                action="delete_user",
                resource_type="user",
                resource_id=user_id,
                user="system",
                details=f"Deleted user {user_id}"
            )
            db.add(log)
            db.commit()

            return {"success": True, "message": "User deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# AI Recommendations

@app.post("/api/analyze-users", response_model=AIAnalysisResponse)
async def analyze_users(db: Session = Depends(get_db)):
    """Claude AI analyzes inactive users for cleanup"""
    try:
        # Get all users
        provider = MicrosoftGraphProvider()
        users = await provider.get_users()

        # Analyze with AI
        recommender = AIRecommender()
        analysis = await recommender.analyze_users(users)

        return AIAnalysisResponse(
            response=analysis["response"],
            recommendations=analysis.get("recommendations")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask")
async def ask_jarvis(request: AIAnalysisRequest):
    """Send question to Claude API for recommendations"""
    try:
        recommender = AIRecommender()
        response = await recommender.ask(request.question, request.context)

        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Server Management Endpoints

@app.get("/api/servers")
async def get_servers():
    """List all servers from DO, AWS, GoDaddy"""
    try:
        # Check cache first
        cached = cache.get("servers")
        if cached is not None:
            logger.info("Returning cached servers")
            return cached

        from providers.digitalocean import DigitalOceanProvider
        from providers.aws import AWSProvider
        from providers.godaddy import GoDaddyProvider

        servers = []

        # Fetch DigitalOcean droplets
        try:
            do_provider = DigitalOceanProvider()
            do_servers = await do_provider.get_droplets()
            servers.extend(do_servers)
        except Exception as e:
            logger.error(f"Error fetching DigitalOcean servers: {str(e)}")

        # Fetch AWS EC2 instances across all regions
        try:
            aws_provider = AWSProvider()
            aws_servers = await aws_provider.get_instances()
            servers.extend(aws_servers)
        except Exception as e:
            logger.error(f"Error fetching AWS servers: {str(e)}")

        # Fetch GoDaddy domains
        try:
            godaddy_provider = GoDaddyProvider()
            godaddy_servers = await godaddy_provider.get_servers()
            servers.extend(godaddy_servers)
        except Exception as e:
            logger.error(f"Error fetching GoDaddy servers: {str(e)}")

        result = {
            "servers": servers,
            "total": len(servers),
            "monthly_cost": sum(s.get("cost_monthly", 0) for s in servers)
        }

        # Cache for 1 hour
        cache.set("servers", result, ttl_seconds=3600)

        return result
    except Exception as e:
        logger.error(f"Error fetching servers: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Cache management
@app.post("/api/cache/refresh")
async def refresh_cache():
    """Manually clear all caches to force fresh data"""
    cache.clear()
    return {"success": True, "message": "Cache cleared successfully"}


@app.get("/api/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return cache.get_stats()


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "JARVIS API"}
