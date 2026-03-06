"""
Configuration module using pydantic-settings.
All secrets are read from environment variables or a .env file — never hardcoded.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed, validated application configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str

    # Models
    embedding_model: str = "all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    embedding_dim: int = 384  # must match the chosen embedding_model

    # Retrieval hyper-parameters
    top_k: int = 10  # candidates fetched from pgvector
    top_n: int = 3   # final results after cross-encoder re-ranking

    # Chunking defaults
    chunk_size: int = 512
    chunk_overlap: int = 64

    # OpenTelemetry
    otel_service_name: str = "embedding-service"
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"


settings = Settings()  # type: ignore[call-arg]
