import uuid
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from config import settings
from parsers import parse_file, ALLOWED_EXTENSIONS
from nim_service import nim_service

router = APIRouter(prefix="/api", tags=["Document & Summarization"])

# In-memory document registry: doc_id -> metadata & parsed content
DOCUMENT_STORE: Dict[str, Dict[str, Any]] = {}

def get_or_restore_document(doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves document from in-memory store or restores it from disk if server reloaded."""
    if doc_id in DOCUMENT_STORE:
        return DOCUMENT_STORE[doc_id]

    upload_dir = settings.upload_dir
    matching = list(upload_dir.glob(f"{doc_id}_*"))
    if not matching:
        return None

    saved_path = matching[0]
    filename = saved_path.name[len(doc_id) + 1:]
    ext = saved_path.suffix.lower()
    try:
        extracted_text, image_data_uri, meta = parse_file(saved_path)
        doc_record = {
            "id": doc_id,
            "filename": filename,
            "saved_path": str(saved_path),
            "extension": ext,
            "is_image": meta.get("is_image", False),
            "metadata": meta,
            "text_preview": extracted_text[:1200] + ("..." if len(extracted_text) > 1200 else ""),
            "extracted_text": extracted_text,
            "image_data_uri": image_data_uri,
            "char_count": len(extracted_text),
        }
        DOCUMENT_STORE[doc_id] = doc_record
        return doc_record
    except Exception as e:
        print(f"Error restoring document {doc_id} from disk: {e}")
        return None

class SummarizeRequest(BaseModel):
    doc_id: Optional[str] = None
    custom_text: Optional[str] = None
    style: str = "bullet"  # 'bullet', 'executive', 'takeaways', 'tldr', 'detailed'

class SummarizeResponse(BaseModel):
    summary: str
    style: str
    doc_id: Optional[str] = None
    model_used: str

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Uploads a document or image, parses its contents, and prepares it for summarization & chat."""
    filename = file.filename or "uploaded_file"
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    doc_id = str(uuid.uuid4())[:12]
    saved_filename = f"{doc_id}_{filename}"
    saved_path = settings.upload_dir / saved_filename

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        extracted_text, image_data_uri, meta = parse_file(saved_path)
    except Exception as e:
        # Cleanup file if parsing fails
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=422, detail=f"Error parsing file: {str(e)}")

    doc_record = {
        "id": doc_id,
        "filename": filename,
        "saved_path": str(saved_path),
        "extension": ext,
        "is_image": meta.get("is_image", False),
        "metadata": meta,
        "text_preview": extracted_text[:1200] + ("..." if len(extracted_text) > 1200 else ""),
        "extracted_text": extracted_text,
        "image_data_uri": image_data_uri,
        "char_count": len(extracted_text),
    }

    DOCUMENT_STORE[doc_id] = doc_record

    return {
        "status": "success",
        "doc_id": doc_id,
        "filename": filename,
        "is_image": meta.get("is_image", False),
        "metadata": meta,
        "preview": doc_record["text_preview"],
        "has_image_preview": bool(image_data_uri)
    }

@router.get("/documents")
async def list_documents():
    """Returns list of currently uploaded documents, discovering existing uploads from disk."""
    if settings.upload_dir.exists():
        for f in settings.upload_dir.iterdir():
            if f.is_file() and "_" in f.name:
                doc_id = f.name.split("_")[0]
                if doc_id not in DOCUMENT_STORE:
                    get_or_restore_document(doc_id)

    return [
        {
            "id": doc["id"],
            "filename": doc["filename"],
            "extension": doc["extension"],
            "is_image": doc["is_image"],
            "metadata": doc["metadata"],
            "preview": doc["text_preview"],
        }
        for doc in DOCUMENT_STORE.values()
    ]

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """Retrieves document details and text content."""
    doc = get_or_restore_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc["id"],
        "filename": doc["filename"],
        "extension": doc["extension"],
        "is_image": doc["is_image"],
        "metadata": doc["metadata"],
        "extracted_text": doc["extracted_text"],
        "image_data_uri": doc.get("image_data_uri") if doc["is_image"] else None
    }

@router.get("/documents/{doc_id}/image")
async def get_document_image(doc_id: str):
    """Serves the uploaded image file for preview."""
    doc = get_or_restore_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc["is_image"]:
        raise HTTPException(status_code=400, detail="Document is not an image")
    saved_path = Path(doc["saved_path"])
    if not saved_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    return FileResponse(saved_path)

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Deletes uploaded document from storage."""
    doc = get_or_restore_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    DOCUMENT_STORE.pop(doc_id, None)
    saved_path = Path(doc["saved_path"])
    if saved_path.exists():
        saved_path.unlink()
    return {"status": "success", "message": f"Document {doc['filename']} deleted."}

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_document(req: SummarizeRequest):
    """Generates a summary based on a document or direct text input using NVIDIA NIM."""
    text_to_summarize = ""
    image_uri = None

    if req.doc_id:
        doc = get_or_restore_document(req.doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        text_to_summarize = doc["extracted_text"]
        if doc["is_image"]:
            image_uri = doc.get("image_data_uri")
    elif req.custom_text:
        text_to_summarize = req.custom_text
    else:
        raise HTTPException(status_code=400, detail="Provide either doc_id or custom_text")

    try:
        summary_result = await nim_service.summarize_document(
            document_text=text_to_summarize,
            style=req.style,
            image_data_uri=image_uri
        )
        model_used = nim_service.vision_model if image_uri else nim_service.text_model
        return SummarizeResponse(
            summary=summary_result,
            style=req.style,
            doc_id=req.doc_id,
            model_used=model_used
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NVIDIA NIM error: {str(e)}")
