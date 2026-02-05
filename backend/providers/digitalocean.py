from typing import List, Dict, Any
from config import get_settings
import logging
import httpx

logger = logging.getLogger(__name__)


class DigitalOceanProvider:
    def __init__(self):
        self.settings = get_settings()
        self.token = self.settings.do_token
        self.api_base = "https://api.digitalocean.com/v2"

    async def get_droplets(self) -> List[Dict[str, Any]]:
        """Get all DigitalOcean droplets"""
        if not self.token:
            logger.warning("DigitalOcean token not configured")
            return []

        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/droplets",
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                droplets = []
                for droplet in data.get("droplets", []):
                    # Get pricing info from size
                    size_slug = droplet.get("size", {}).get("slug", "")
                    price_monthly = droplet.get("size", {}).get("price_monthly", 0)

                    droplets.append({
                        "id": str(droplet["id"]),
                        "name": droplet["name"],
                        "provider": "DigitalOcean",
                        "size": f"{droplet['vcpus']} vCPU, {droplet['memory']}MB RAM",
                        "cost_monthly": float(price_monthly),
                        "status": droplet["status"],
                        "region": droplet["region"]["slug"]
                    })

                logger.info(f"Fetched {len(droplets)} DigitalOcean droplets")
                return droplets

        except httpx.HTTPError as e:
            logger.error(f"DigitalOcean API error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching DigitalOcean droplets: {str(e)}")
            return []

    async def create_droplet(self, **kwargs) -> Dict[str, Any]:
        """Create a new droplet"""
        # TODO: Implement actual API call
        logger.info("DigitalOcean create not yet implemented")
        return {}

    async def destroy_droplet(self, droplet_id: str) -> bool:
        """Destroy a droplet"""
        # TODO: Implement actual API call
        logger.info("DigitalOcean destroy not yet implemented")
        return True
