from anthropic import Anthropic
from typing import Dict, Any, Optional
from config import get_settings


class AIRecommender:
    def __init__(self):
        self.settings = get_settings()
        self.client = Anthropic(api_key=self.settings.anthropic_api_key)

    async def analyze_users(self, users: list) -> Dict[str, Any]:
        """Analyze users and provide cleanup recommendations"""

        # Prepare user data for analysis
        user_summary = []
        for user in users:
            last_sign_in = user.get("last_sign_in")
            if last_sign_in:
                last_sign_in_str = last_sign_in.isoformat() if hasattr(last_sign_in, 'isoformat') else str(last_sign_in)
            else:
                last_sign_in_str = "Never"

            user_summary.append({
                "email": user.get("email"),
                "name": user.get("display_name"),
                "enabled": user.get("account_enabled"),
                "last_sign_in": last_sign_in_str,
                "license": user.get("license_type")
            })

        prompt = f"""Analyze the following Microsoft 365 user accounts and identify which users should be considered for cleanup (disabling or deletion).

Users:
{user_summary}

Please identify:
1. Users who have never signed in
2. Users who haven't signed in for over 90 days
3. Disabled users that still have licenses
4. Any other anomalies

Provide specific recommendations for each user that should be cleaned up, including the action to take (disable or delete) and the reason."""

        message = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text

        return {
            "response": response_text,
            "recommendations": self._parse_recommendations(response_text)
        }

    async def ask(self, question: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Ask Claude for recommendations"""

        prompt = question
        if context:
            prompt = f"Context: {context}\n\nQuestion: {question}"

        message = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return message.content[0].text

    def _parse_recommendations(self, response: str) -> list:
        """Parse recommendations from AI response"""
        # Simple parsing - look for email addresses in the response
        import re

        recommendations = []
        lines = response.split('\n')

        for line in lines:
            # Look for lines that mention actions
            if any(word in line.lower() for word in ['disable', 'delete', 'remove', 'cleanup']):
                # Extract email if present
                emails = re.findall(r'[\w\.-]+@[\w\.-]+', line)
                if emails:
                    recommendations.append(line.strip())

        return recommendations
