import os
from typing import AsyncGenerator, Optional, List, Dict, Any
from openai import OpenAI, AsyncOpenAI
from config import settings, get_active_api_key

class NimService:
    def __init__(self):
        self._override_key: Optional[str] = None
        self.base_url = settings.nvidia_base_url
        self.text_model = settings.text_model
        self.vision_model = settings.vision_model

    @property
    def api_key(self) -> str:
        if self._override_key:
            return self._override_key.strip().strip('"').strip("'")
        return get_active_api_key()

    @api_key.setter
    def api_key(self, value: str):
        self._override_key = value

    def _get_async_client(self) -> AsyncOpenAI:
        key = self.api_key
        if not key:
            raise ValueError(
                "NVIDIA_API_KEY is not configured. Please set your API key in backend/.env"
            )
        return AsyncOpenAI(
            base_url=self.base_url,
            api_key=key
        )

    def _get_client(self) -> OpenAI:
        key = self.api_key
        if not key:
            raise ValueError(
                "NVIDIA_API_KEY is not configured. Please set your API key in backend/.env"
            )
        return OpenAI(
            base_url=self.base_url,
            api_key=key
        )

    async def summarize_document(
        self,
        document_text: str,
        style: str = "bullet",
        image_data_uri: Optional[str] = None
    ) -> str:
        """
        Summarizes a document or image.
        Supported styles:
        - 'bullet': Concise bulleted list with key highlights
        - 'executive': High-level executive overview with actionable insights
        - 'takeaways': Top 5-7 key takeaways & critical points
        - 'tldr': Ultra-short 2-3 sentence TL;DR
        - 'detailed': Comprehensive section-by-section breakdown
        """
        style_prompts = {
            "bullet": "Provide a clean, well-structured bullet-point summary highlighting the key points, findings, and figures.",
            "executive": "Provide an executive summary tailored for decision makers, focusing on core purpose, major achievements/conclusions, and strategic takeaways.",
            "takeaways": "Extract the top 5 to 7 key takeaways and critical learnings in numbered format with short explanations.",
            "tldr": "Provide a crisp, punchy TL;DR summary in 2 to 3 sentences maximum.",
            "detailed": "Provide a thorough, comprehensive summary breaking down each main section or concept with context and supporting details."
        }

        instruction = style_prompts.get(style, style_prompts["bullet"])

        if image_data_uri:
            # Use Vision Model
            client = self._get_async_client()
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert visual and document intelligence assistant. "
                        "Thoroughly analyze all visual elements, text, handwriting, figures, tables, and details in the provided image. "
                        "Generate high-clarity, comprehensive, and accurate summaries in clean Markdown format."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{instruction}\n\nHere is the uploaded image/document to analyze and summarize:"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_uri
                            }
                        }
                    ]
                }
            ]
            response = await client.chat.completions.create(
                model=self.vision_model,
                messages=messages,
                temperature=0.2,
                max_tokens=2048
            )
            return response.choices[0].message.content or "No summary generated."
        else:
            # Use Text Model
            client = self._get_async_client()
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert document summarization assistant. "
                        "Produce clean, markdown-formatted summaries that are accurate, engaging, and easy to skim. "
                        "Thoroughly capture key points, data, and conclusions from the provided text."
                    )
                },
                {
                    "role": "user",
                    "content": f"{instruction}\n\nDocument Content to Summarize:\n\"\"\"\n{document_text}\n\"\"\""
                }
            ]
            response = await client.chat.completions.create(
                model=self.text_model,
                messages=messages,
                temperature=0.2,
                max_tokens=2048
            )
            return response.choices[0].message.content or "No summary generated."

    async def chat_stream(
        self,
        messages: List[Dict[str, Any]],
        document_context: Optional[str] = None,
        image_data_uri: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streams chat responses grounded in document context or image data.
        """
        client = self._get_async_client()

        if image_data_uri:
            system_content = (
                "You are DocuMind, an expert multimodal and document intelligence assistant powered by NVIDIA NIM.\n"
                "- The user has provided an image/document. Thoroughly examine and understand all visual details, text, diagrams, tables, figures, numbers, and contents.\n"
                "- Always fulfill user requests to summarize, analyze, explain, extract key takeaways, or answer questions about the uploaded image or document thoroughly, accurately, and without refusal.\n"
                "- Format your responses with clean Markdown, clear headings, bullet points, or tables to structure your answers.\n"
                "- If the user asks a broader or related question, provide a helpful and comprehensive answer, referencing the image or document whenever relevant."
            )
            model = self.vision_model
        elif document_context:
            system_content = (
                "You are DocuMind, an expert document intelligence assistant powered by NVIDIA NIM.\n"
                "- The user has provided document content. Thoroughly examine and analyze its contents, structure, facts, figures, and concepts.\n"
                "- Always fulfill user requests to summarize, extract insights, identify key takeaways, explain sections, or answer questions about the document thoroughly, accurately, and without refusal.\n"
                "- Format your responses with clean Markdown, clear headings, bullet points, or tables to structure your answers.\n"
                "- If the user asks a broader or related question, provide a helpful and comprehensive answer, referencing the document whenever relevant."
            )
            model = self.text_model
        else:
            system_content = (
                "You are DocuMind, an intelligent and helpful AI assistant powered by NVIDIA NIM.\n"
                "- You excel at analyzing, summarizing, and synthesizing documents, images, and text.\n"
                "- Answer the user's questions or summarize any text provided in the conversation with high clarity and helpfulness.\n"
                "- If the user wants to analyze a file, remind them they can upload or attach documents (PDF, Word, TXT) or images (PNG, JPG, WEBP) anytime."
            )
            model = self.text_model

        formatted_messages = [{"role": "system", "content": system_content}]

        # Add document context if present
        if document_context:
            formatted_messages.append({
                "role": "system",
                "content": f"Document Content:\n\"\"\"\n{document_context[:25000]}\n\"\"\""
            })

        # Append conversation messages
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"]:
                formatted_messages.append({"role": role, "content": content})

        # If image is attached, convert the last user message to multimodal for vision model
        if image_data_uri:
            for i in range(len(formatted_messages) - 1, -1, -1):
                if formatted_messages[i]["role"] == "user":
                    user_text = formatted_messages[i]["content"]
                    if isinstance(user_text, str):
                        formatted_messages[i]["content"] = [
                            {"type": "text", "text": user_text},
                            {"type": "image_url", "image_url": {"url": image_data_uri}}
                        ]
                    break

        stream = await client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            temperature=0.2,
            max_tokens=2048,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def check_api_key(self) -> Dict[str, Any]:
        """Validates if API key is present."""
        configured = bool(self.api_key and len(self.api_key.strip()) > 5)
        return {
            "configured": configured,
            "base_url": self.base_url,
            "text_model": self.text_model,
            "vision_model": self.vision_model
        }

nim_service = NimService()
