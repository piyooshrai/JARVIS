from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from config import get_settings
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
        provider = MicrosoftGraphProvider()
        domains = await provider.get_domains()
        return domains
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users", response_model=UserListResponse)
async def get_users(domain: Optional[str] = None, db: Session = Depends(get_db)):
    """List all O365 users, filterable by domain"""
    try:
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

        return UserListResponse(
            users=users,
            total=len(users),
            monthly_cost=monthly_cost
        )
    except Exception as e:
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


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "JARVIS API"}
