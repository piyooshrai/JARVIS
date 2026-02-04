from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Microsoft Graph (O365 Users)
    microsoft_tenant_id: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""

    # DigitalOcean
    do_token: str = ""

    # AWS
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"

    # GoDaddy
    godaddy_api_key: str = ""
    godaddy_api_secret: str = ""

    # Claude API (for AI recommendations)
    anthropic_api_key: str = ""

    # Database
    database_url: str = "sqlite:///./jarvis.db"

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://*.vercel.app"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
