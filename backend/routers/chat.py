import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from nim_service import nim_service
from routers.summarize import DOCUMENT_STORE, get_or_restore_document

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    doc_id: Optional[str] = None
    stream: bool = False

@router.post("")
async def chat_endpoint(req: ChatRequest):
    """Answers user queries grounded in the context of the active uploaded document or image."""
    doc_context = None
    image_uri = None

    if req.doc_id:
        doc = get_or_restore_document(req.doc_id)
        if doc:
            if doc.get("is_image"):
                image_uri = doc.get("image_data_uri")
                doc_context = doc.get("extracted_text")
            else:
                doc_context = doc.get("extracted_text")

    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]

    if req.stream:
        async def event_generator():
            try:
                async for chunk in nim_service.chat_stream(
                    messages=msg_dicts,
                    document_context=doc_context,
                    image_data_uri=image_uri
                ):
                    data = json.dumps({"token": chunk})
                    yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                err_data = json.dumps({"error": str(e)})
                yield f"data: {err_data}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        # Non-streaming fallback
        try:
            full_response = []
            async for chunk in nim_service.chat_stream(
                messages=msg_dicts,
                document_context=doc_context,
                image_data_uri=image_uri
            ):
                full_response.append(chunk)

            return {
                "role": "assistant",
                "content": "".join(full_response),
                "model_used": nim_service.vision_model if image_uri else nim_service.text_model,
                "grounded_in_doc": bool(doc_context)
            }
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"NVIDIA NIM error: {str(e)}")
