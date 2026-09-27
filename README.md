# DocuMind AI — Split-Screen Document Summarizer & Context Chatbot

An end-to-end full-stack Web Application featuring a modern split-screen interface for document & image summarization alongside interactive grounded AI chat. Powered by **FastAPI** on the backend and **React (Vite)** on the frontend, accelerated by **NVIDIA NIM API**.

---

## 🌟 Key Features

1. **Split-Screen Workspace**:
   - **Left Panel (Document & Summarizer)**: Drag-and-drop file upload, instant format detection, metadata inspection, and versatile summarization modes (Bullet Points, Executive Brief, Key Takeaways, Quick TL;DR, Comprehensive Analysis).
   - **Right Panel (Grounded Chatbot)**: Interactive Q&A conversational engine that references the uploaded document or image directly, streaming token responses in real-time.
   - **Interactive Resize & Layout Presets**: Drag the divider to adjust width on the fly, or toggle between 50/50, 70/30 (Focus Doc), and 30/70 (Focus Chat) views.

2. **Multimodal & Multi-Format Parsing**:
   - **Documents**: `.pdf`, `.docx`, `.doc`, `.txt`
   - **Images**: `.png`, `.jpg`, `.jpeg`, `.webp` (sent to vision models for deep visual comprehension)

3. **NVIDIA NIM API Integration**:
   - OpenAI-compatible client configured to `https://integrate.api.nvidia.com/v1`.
   - **Text Model**: `meta/llama-3.1-70b-instruct`
   - **Vision Model**: `meta/llama-3.2-11b-vision-instruct`
   - Real-time token streaming via Server-Sent Events (SSE).

4. **One-Click Demo & In-App Configuration**:
   - Test immediately with a built-in technical whitepaper demo by clicking the **"Demo Doc"** button in the header.
   - Configure or switch API keys and model names directly from the UI Settings modal or via `.env`.

---

## 📂 Project Structure

```
summary_chatbot/
├── backend/
│   ├── .env.example            # Environment variables template
│   ├── .env                    # Active environment file
│   ├── requirements.txt        # Python dependencies
│   ├── main.py                 # FastAPI application & CORS config
│   ├── config.py               # Pydantic settings & directories
│   ├── parsers.py              # Parsing for PDF, DOCX, DOC, TXT, & Images
│   ├── nim_service.py          # NVIDIA NIM client (Text & Vision)
│   └── routers/
│       ├── chat.py             # Chat & SSE streaming endpoints
│       └── summarize.py        # Upload, parsing, & summarization endpoints
├── frontend/
│   ├── package.json            # React & Vite dependencies
│   ├── vite.config.js          # Vite config & API proxying
│   ├── index.html              # HTML shell & modern fonts
│   └── src/
│       ├── main.jsx            # React root
│       ├── App.jsx             # Split-screen container & state
│       ├── index.css           # Glassmorphism dark mode design system
│       ├── utils/api.js        # API client & SSE streaming parser
│       └── components/
│           ├── Header.jsx         # App header, model badge, layout buttons
│           ├── DocumentPanel.jsx  # File dropzone, styles, viewer & exporter
│           ├── ChatPanel.jsx      # Real-time chat & suggestion chips
│           └── SettingsModal.jsx  # NIM API key and model config modal
├── run.ps1                     # PowerShell one-click launcher
├── start.bat                   # Windows batch launcher
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ (Python 3.12 verified)
- Node.js 18+ (Node.js 24 verified) & npm
- NVIDIA NIM API Key (obtain free credits at [build.nvidia.com](https://build.nvidia.com))

---

### Step 1: Configure Environment Variables

Edit `backend/.env` (or configure via the UI Settings modal):
```env
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
TEXT_MODEL=meta/llama-3.1-70b-instruct
VISION_MODEL=meta/llama-3.2-11b-vision-instruct
```

---

### Step 2: Run the Application

#### Option A: One-Click Launcher (PowerShell)
```powershell
.\run.ps1
```

#### Option B: Windows Batch Launcher (Double-click or run)
```cmd
start.bat
```

#### Option C: Manual Launch

**Terminal 1 — Backend:**
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
Backend API will be running at: `http://localhost:8000` (Interactive docs at `/docs`)

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
Frontend Web UI will be running at: `http://localhost:5173`

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Check service health and NIM configuration state |
| `POST` | `/api/settings` | Update NVIDIA API Key and model selections dynamically |
| `POST` | `/api/upload` | Upload and parse document/image (`.pdf`, `.docx`, `.doc`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`) |
| `POST` | `/api/summarize` | Summarize document using specified style (`bullet`, `executive`, `takeaways`, `tldr`, `detailed`) |
| `GET` | `/api/documents` | List uploaded documents |
| `GET` | `/api/documents/{doc_id}` | Retrieve specific document details and parsed content |
| `DELETE` | `/api/documents/{doc_id}` | Delete document and remove from memory |
| `POST` | `/api/chat` | Chat grounded in active document context with optional SSE streaming |
