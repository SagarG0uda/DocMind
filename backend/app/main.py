from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
from app.config import settings
from app.routes import documents, query, system
from app.sample_seed import seed_sample_document_if_empty

app = FastAPI(
    title=settings.app_name,
    description="RAG PDF Chat API with PyPDF, Sentence-Transformers, ChromaDB, and Ox Alpha",
    version="1.0.0"
)

from typing import Dict, List

def get_allowed_origins() -> List[str]:
    origins_str = getattr(settings, "cors_origins", "*").strip()
    if not origins_str or origins_str == "*":
        return ["*"]
    return [origin.strip() for origin in origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)
app.include_router(system.router)

app.add_api_route("/query", query.process_document_query, methods=["POST"], tags=["root"])
app.add_api_route("/upload", documents.upload_document, methods=["POST"], tags=["root"])
app.add_api_route("/documents", documents.list_documents, methods=["GET"], tags=["root"])

@app.get("/health", tags=["system"])
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "app": settings.app_name}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
