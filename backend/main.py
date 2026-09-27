from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import settings
from nim_service import nim_service
from routers import summarize, chat

app = FastAPI(
    title="Chatbot & Document Summarizer API",
    description="Backend API powered by FastAPI and NVIDIA NIM API for document/image summarization and grounded chat.",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite default port 5173 and any local port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(summarize.router)
app.include_router(chat.router)

class ConfigUpdateRequest(BaseModel):
    api_key: str | None = None
    text_model: str | None = None
    vision_model: str | None = None

@app.get("/api/health")
def health_check():
    """Returns system status and NVIDIA NIM configuration state."""
    status_info = nim_service.check_api_key()
    return {
        "status": "healthy",
        "nim_configured": status_info["configured"],
        "base_url": status_info["base_url"],
        "text_model": status_info["text_model"],
        "vision_model": status_info["vision_model"],
        "supported_formats": [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx", ".doc", ".txt"]
    }

@app.post("/api/settings")
def update_settings(cfg: ConfigUpdateRequest):
    """Allows setting the NVIDIA API key or model dynamically from the UI."""
    if cfg.api_key is not None:
        settings.nvidia_api_key = cfg.api_key.strip()
        nim_service.api_key = cfg.api_key.strip()
    if cfg.text_model is not None and cfg.text_model.strip():
        settings.text_model = cfg.text_model.strip()
        nim_service.text_model = cfg.text_model.strip()
    if cfg.vision_model is not None and cfg.vision_model.strip():
        settings.vision_model = cfg.vision_model.strip()
        nim_service.vision_model = cfg.vision_model.strip()

    return {
        "status": "updated",
        "nim_configured": bool(nim_service.api_key),
        "text_model": nim_service.text_model,
        "vision_model": nim_service.vision_model
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
