import numpy as np

if not hasattr(np, "float_"):
    np.float_ = np.float64
if not hasattr(np, "int_"):
    np.int_ = np.int64
if not hasattr(np, "uint"):
    np.uint = np.uint64

import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "DocMind RAG Backend"
    host: str = "0.0.0.0"
    port: int = 8006
    cors_origins: str = "*"
    embedding_model_name: str = "all-MiniLM-L6-v2"
    retrieval_k_value: int = 8
    target_chunk_size_tokens: int = 750
    maximum_chunk_size_tokens: int = 1000
    minimum_chunk_size_tokens: int = 500
    chunk_overlap_percentage: float = 0.15
    ox_alpha_api_key: str = ""
    ox_alpha_base_url: str = "https://openrouter.ai/api/v1"
    ox_alpha_model_name: str = "nex-agi/nex-n2.5-pro:free"
    
    max_upload_size_mb: int = 25
    max_upload_size_bytes: int = 25 * 1024 * 1024
    max_session_document_capacity: int = 50
    max_document_library_capacity: int = 50
    max_global_document_capacity: int = 500
    max_global_storage_bytes: int = 5 * 1024 * 1024 * 1024
    max_global_storage_mb: int = 5120

    upload_directory: Path = Path("./data/uploads")
    chroma_persistence_directory: Path = Path("./data/chroma_db")
    data_directory: Path = Path("./data")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
settings.upload_directory.mkdir(parents=True, exist_ok=True)
settings.chroma_persistence_directory.mkdir(parents=True, exist_ok=True)
settings.data_directory.mkdir(parents=True, exist_ok=True)
