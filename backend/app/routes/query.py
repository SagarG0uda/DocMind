from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Query, status
from app.services.vector_store import vector_store
from app.services.llm_client import llm_client
from app.services.document_manager import document_manager
from app.services.rate_limiter import rate_limiter
from app.config import settings

router = APIRouter(tags=["query"])

class ChatHistoryMessage(BaseModel):
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message text content")

class QueryRequest(BaseModel):
    document_id: str = Field(..., description="Target document identifier")
    question: str = Field(..., min_length=1, description="Question text to answer")
    history: Optional[List[ChatHistoryMessage]] = Field(default=[], description="Previous conversation turns")
    session_id: Optional[str] = Field(default=None, description="Optional anonymous session identifier")

class CitationModel(BaseModel):
    citation_number: int
    page_number: int
    chunk_id: str
    chunk_index: int
    text_snippet: str
    full_text: str
    similarity_score: float

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationModel]
    retrieved_chunks: List[Dict[str, Any]]
    is_fallback: bool
    model_name: str
    document_id: str
    fallback_reason: Optional[str] = None
    rate_limit_status: Optional[Dict[str, Any]] = None

@router.post("/query", response_model=QueryResponse)
async def process_document_query(
    request: QueryRequest,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
) -> QueryResponse:
    sid = x_session_id or session_id or request.session_id or "anonymous_default"

    doc = document_manager.get_document(request.document_id, session_id=sid)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    retrieved_chunks = vector_store.retrieve(
        query=request.question,
        document_id=request.document_id,
        session_id=sid,
        k=settings.retrieval_k_value
    )

    can_proceed, limit_reason = rate_limiter.check_rate_limit(sid)

    if not can_proceed:
        fallback_answer, citations = llm_client.generate_extractive_fallback(request.question, retrieved_chunks)
        return QueryResponse(
            answer=fallback_answer,
            citations=citations,
            retrieved_chunks=retrieved_chunks,
            is_fallback=True,
            model_name="extractive-fallback",
            document_id=request.document_id,
            fallback_reason=limit_reason,
            rate_limit_status=rate_limiter.get_status(sid)
        )

    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]

    generation_result = await llm_client.generate_answer(
        question=request.question,
        retrieved_chunks=retrieved_chunks,
        conversation_history=history_dicts
    )

    if not generation_result.get("is_fallback", False):
        rate_limiter.record_request(sid)

    return QueryResponse(
        answer=generation_result["answer"],
        citations=generation_result["citations"],
        retrieved_chunks=generation_result["retrieved_chunks"],
        is_fallback=generation_result["is_fallback"],
        model_name=generation_result["model_name"],
        document_id=request.document_id,
        fallback_reason="OpenRouter API error / timeout, falling back to local extractor." if generation_result.get("is_fallback") else None,
        rate_limit_status=rate_limiter.get_status(sid)
    )
