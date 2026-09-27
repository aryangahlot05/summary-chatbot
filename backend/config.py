import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

# Explicitly load .env with override
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

class Settings(BaseSettings):
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    text_model: str = "meta/llama-3.2-11b-vision-instruct"
    vision_model: str = "meta/llama-3.2-11b-vision-instruct"
    upload_dir: Path = BASE_DIR / "uploads"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def get_active_api_key() -> str:
    """Dynamically retrieves API key, re-checking .env and stripping quotes."""
    key = settings.nvidia_api_key or os.getenv("NVIDIA_API_KEY", "")
    if not key and (BASE_DIR / ".env").exists():
        load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)
        key = os.getenv("NVIDIA_API_KEY", "")
    return key.strip().strip('"').strip("'")

# Ensure uploads directory exists
settings.upload_dir.mkdir(parents=True, exist_ok=True)
