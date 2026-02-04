import msal
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime
from config import get_settings
import logging

logger = logging.getLogger(__name__)


class MicrosoftGraphProvider:
    def __init__(self):
        self.settings = get_settings()
        self.authority = f"https://login.microsoftonline.com/{self.settings.microsoft_tenant_id}"
        self.scope = ["https://graph.microsoft.com/.default"]
        self.graph_endpoint = "https://graph.microsoft.com/v1.0"

        # Debug logging
        logger.info(f"Initializing Microsoft Graph Provider")
        logger.info(f"Tenant ID from settings: {self.settings.microsoft_tenant_id}")
        logger.info(f"Client ID from settings: {self.settings.microsoft_client_id}")
        logger.info(f"Authority URL: {self.authority}")

    def _get_access_token(self) -> str:
        """Get access token for Microsoft Graph API"""
        app = msal.ConfidentialClientApplication(
            self.settings.microsoft_client_id,
            authority=self.authority,
            client_credential=self.settings.microsoft_client_secret,
        )

        result = app.acquire_token_silent(self.scope, account=None)
        if not result:
            result = app.acquire_token_for_client(scopes=self.scope)

        if "access_token" in result:
            return result["access_token"]
        else:
            raise Exception(f"Failed to acquire token: {result.get('error_description', 'Unknown error')}")

    async def get_domains(self) -> List[Dict[str, Any]]:
        """Fetch verified domains from Microsoft 365"""
        token = self._get_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.graph_endpoint}/domains",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            domains = []
            for domain in data.get("value", []):
                domains.append({
                    "id": domain.get("id"),
                    "name": domain.get("id"),
                    "is_verified": domain.get("isVerified", False)
                })

            return [d for d in domains if d["is_verified"]]

    async def get_users(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all O365 users, optionally filtered by domain"""
        token = self._get_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Request user properties including sign-in activity
        select_params = "id,displayName,mail,userPrincipalName,accountEnabled,department,assignedLicenses,signInActivity"
        url = f"{self.graph_endpoint}/users?$select={select_params}"

        users = []
        async with httpx.AsyncClient() as client:
            while url:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()

                for user in data.get("value", []):
                    email = user.get("mail") or user.get("userPrincipalName")
                    user_domain = email.split("@")[1] if email and "@" in email else ""

                    # Filter by domain if specified
                    if domain and user_domain != domain:
                        continue

                    # Extract last sign-in time
                    last_sign_in = None
                    sign_in_activity = user.get("signInActivity", {})
                    if sign_in_activity:
                        last_sign_in_str = sign_in_activity.get("lastSignInDateTime")
                        if last_sign_in_str:
                            last_sign_in = datetime.fromisoformat(last_sign_in_str.replace("Z", "+00:00"))

                    # Determine license type
                    licenses = user.get("assignedLicenses", [])
                    license_type = "Business Standard" if len(licenses) > 0 else None

                    users.append({
                        "id": user.get("id"),
                        "email": email,
                        "display_name": user.get("displayName"),
                        "domain": user_domain,
                        "last_sign_in": last_sign_in,
                        "account_enabled": user.get("accountEnabled", False),
                        "license_type": license_type,
                        "department": user.get("department"),
                        "manager": None  # Would require additional API call
                    })

                # Handle pagination
                url = data.get("@odata.nextLink")

        return users

    async def create_user(
        self,
        full_name: str,
        username: str,
        domain: str,
        department: Optional[str] = None,
        license_type: str = "Business Basic"
    ) -> Dict[str, Any]:
        """Create a new O365 user"""
        token = self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        user_principal_name = f"{username}@{domain}"

        # Split full name into given name and surname
        name_parts = full_name.strip().split(" ", 1)
        given_name = name_parts[0]
        surname = name_parts[1] if len(name_parts) > 1 else ""

        user_data = {
            "accountEnabled": True,
            "displayName": full_name,
            "mailNickname": username,
            "userPrincipalName": user_principal_name,
            "givenName": given_name,
            "surname": surname,
            "passwordProfile": {
                "forceChangePasswordNextSignIn": True,
                "password": self._generate_temp_password()
            }
        }

        if department:
            user_data["department"] = department

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.graph_endpoint}/users",
                headers=headers,
                json=user_data
            )
            response.raise_for_status()
            created_user = response.json()

            # TODO: Assign license based on license_type
            # This would require additional API call to /users/{id}/assignLicense

            return {
                "id": created_user.get("id"),
                "email": created_user.get("userPrincipalName"),
                "display_name": created_user.get("displayName"),
                "domain": domain,
                "last_sign_in": None,
                "account_enabled": True,
                "license_type": license_type,
                "department": department,
                "manager": None
            }

    async def disable_user(self, user_id: str) -> bool:
        """Disable a user account and release license"""
        token = self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            # Disable the account
            response = await client.patch(
                f"{self.graph_endpoint}/users/{user_id}",
                headers=headers,
                json={"accountEnabled": False}
            )
            response.raise_for_status()

            # TODO: Remove licenses
            # This would require additional API call to /users/{id}/assignLicense

            return True

    async def delete_user(self, user_id: str) -> bool:
        """Permanently delete a user"""
        token = self._get_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.graph_endpoint}/users/{user_id}",
                headers=headers
            )
            response.raise_for_status()
            return True

    def _generate_temp_password(self) -> str:
        """Generate a temporary password for new users"""
        import secrets
        import string

        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = ''.join(secrets.choice(alphabet) for i in range(16))

        # Ensure complexity requirements
        if not any(c.isupper() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_uppercase)
        if not any(c.islower() for c in password):
            password = password[:-2] + secrets.choice(string.ascii_lowercase) + password[-1]
        if not any(c.isdigit() for c in password):
            password = password[:-3] + secrets.choice(string.digits) + password[-2:]

        return password
