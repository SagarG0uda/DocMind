from typing import Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter
from app.config import settings
from app.services.llm_client import llm_client
from app.services.rate_limiter import rate_limiter

router = APIRouter(prefix="/system", tags=["system"])

class UpdateConfigRequest(BaseModel):
    ox_alpha_api_key: str
    ox_alpha_base_url: str = ""
    ox_alpha_model_name: str = ""

@router.get("/status")
async def get_system_status() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "ox_alpha_configured": llm_client.is_configured(),
        "model_name": llm_client.model_name,
        "base_url": llm_client.base_url,
        "embedding_model": settings.embedding_model_name,
        "retrieval_k": settings.retrieval_k_value,
        "chunk_size_tokens": settings.target_chunk_size_tokens,
        "chunk_overlap_percentage": settings.chunk_overlap_percentage,
        "rate_limiter": rate_limiter.get_status()
    }

@router.post("/config")
async def update_system_config(request: UpdateConfigRequest) -> Dict[str, Any]:
    llm_client.update_credentials(
        api_key=request.ox_alpha_api_key,
        base_url=request.ox_alpha_base_url,
        model_name=request.ox_alpha_model_name
    )
    return {
        "message": "System configuration updated successfully.",
        "ox_alpha_configured": llm_client.is_configured(),
        "model_name": llm_client.model_name
    }
