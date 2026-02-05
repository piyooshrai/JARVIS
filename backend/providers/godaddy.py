from typing import List, Dict, Any
from config import get_settings
import logging
import httpx

logger = logging.getLogger(__name__)


class GoDaddyProvider:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.godaddy_api_key
        self.api_secret = self.settings.godaddy_api_secret
        self.api_base = "https://api.godaddy.com/v1"

    async def get_servers(self) -> List[Dict[str, Any]]:
        """Get all GoDaddy domains (represented as servers for display)"""
        if not self.api_key or not self.api_secret:
            logger.warning("GoDaddy credentials not configured")
            return []

        try:
            headers = {
                "Authorization": f"sso-key {self.api_key}:{self.api_secret}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/domains",
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                domains = response.json()

                servers = []
                for domain in domains:
                    # GoDaddy doesn't expose pricing via API, use placeholder
                    servers.append({
                        "id": str(domain.get("domainId", domain["domain"])),
                        "name": domain["domain"],
                        "provider": "GoDaddy",
                        "size": "Domain Registration",
                        "cost_monthly": 0,  # GoDaddy doesn't expose pricing in API
                        "status": domain.get("status", "ACTIVE").lower(),
                        "region": "global"
                    })

                logger.info(f"Fetched {len(servers)} GoDaddy domains")
                return servers

        except httpx.HTTPError as e:
            logger.error(f"GoDaddy API error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching GoDaddy domains: {str(e)}")
            return []

    async def get_domains(self) -> List[Dict[str, Any]]:
        """Get all GoDaddy domains"""
        # Alias to get_servers for now
        return await self.get_servers()
