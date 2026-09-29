from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Database
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/cityfix"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Admin seeding
    admin_seed_email: str = "admin@cityfix.app"
    admin_seed_password: str = "ChangeMeStrong!123"
    admin_seed_name: str = "CityFix Admin"

    # Hindsight
    hindsight_base_url: str = "https://api.hindsight.vectorize.io"
    hindsight_api_key: str = ""
    hindsight_memory_bank: str = "cityfix"
    hindsight_timeout: float = 60.0

    # LLM
    llm_model: str = "default"

    # URLs / CORS
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    cors_origins_raw: str = Field(
        default="http://localhost:5173",
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins_raw"),
    )

    # Storage
    storage_provider: str = "local"
    upload_dir: str = "uploads"
    max_upload_mb: int = 5

    # Workers
    run_inline_worker: bool = True
    memory_worker_interval_seconds: int = 5
    memory_max_retries: int = 5

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    @property
    def hindsight_enabled(self) -> bool:
        return bool(self.hindsight_api_key and self.hindsight_base_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
