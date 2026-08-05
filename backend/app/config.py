from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central config. Never hardcode secrets here — everything comes from
    environment variables (or a local .env file during development, which
    must never be committed).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DB_A_URL: str
    DB_B_URL: str | None = None  # scaffolded for later — not used in Phase A

    SUPABASE_JWKS_URL: str

    ALLOWED_ORIGINS: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        """Comma-separated ALLOWED_ORIGINS -> list, trimmed, empty entries dropped."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
