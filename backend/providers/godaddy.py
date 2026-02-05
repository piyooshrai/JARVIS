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
        """Get all GoDaddy domains and SSL certificates"""
        if not self.api_key or not self.api_secret:
            logger.warning("GoDaddy credentials not configured")
            return []

        servers = []

        try:
            headers = {
                "Authorization": f"sso-key {self.api_key}:{self.api_secret}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                # Fetch domains with detailed info
                response = await client.get(
                    f"{self.api_base}/domains",
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                domains = response.json()

                for domain_summary in domains:
                    domain_name = domain_summary["domain"]

                    # Fetch detailed domain info to get expiration
                    try:
                        detail_response = await client.get(
                            f"{self.api_base}/domains/{domain_name}",
                            headers=headers,
                            timeout=10.0
                        )
                        detail_response.raise_for_status()
                        domain_detail = detail_response.json()

                        servers.append({
                            "id": str(domain_detail.get("domainId", domain_name)),
                            "name": domain_name,
                            "provider": "GoDaddy",
                            "size": "Domain Registration",
                            "cost_monthly": 0,  # GoDaddy doesn't expose pricing in API
                            "status": domain_detail.get("status", "ACTIVE").lower(),
                            "region": "global",
                            "expires_at": domain_detail.get("expires")
                        })
                    except Exception as e:
                        logger.warning(f"Could not fetch details for {domain_name}: {str(e)}")
                        # Add basic info if detail fetch fails
                        servers.append({
                            "id": str(domain_summary.get("domainId", domain_name)),
                            "name": domain_name,
                            "provider": "GoDaddy",
                            "size": "Domain Registration",
                            "cost_monthly": 0,
                            "status": domain_summary.get("status", "ACTIVE").lower(),
                            "region": "global"
                        })

                # Fetch SSL certificates
                try:
                    ssl_response = await client.get(
                        f"{self.api_base}/certificates",
                        headers=headers,
                        timeout=10.0
                    )
                    ssl_response.raise_for_status()
                    certificates = ssl_response.json()

                    for cert in certificates:
                        servers.append({
                            "id": cert.get("certificateId", cert.get("commonName", "unknown")),
                            "name": cert.get("commonName", "SSL Certificate"),
                            "provider": "GoDaddy",
                            "size": f"SSL - {cert.get('type', 'Standard')}",
                            "cost_monthly": 0,  # GoDaddy doesn't expose pricing in API
                            "status": cert.get("status", "ACTIVE").lower(),
                            "region": "global",
                            "expires_at": cert.get("validEnd")
                        })
                except httpx.HTTPError as e:
                    logger.info(f"Could not fetch SSL certificates (may not have permission): {str(e)}")
                except Exception as e:
                    logger.warning(f"Error fetching SSL certificates: {str(e)}")

                logger.info(f"Fetched {len(servers)} GoDaddy items (domains + SSL certs)")
                return servers

        except httpx.HTTPError as e:
            logger.error(f"GoDaddy API error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching GoDaddy data: {str(e)}")
            return []

    async def get_domains(self) -> List[Dict[str, Any]]:
        """Get all GoDaddy domains"""
        # Alias to get_servers for now
        return await self.get_servers()
