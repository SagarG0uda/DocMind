import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Query, status
from fastapi.responses import FileResponse
from app.services.pdf_parser import pdf_parser
from app.services.chunker import text_chunker
from app.services.vector_store import vector_store
from app.services.document_manager import document_manager
from app.config import settings

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
) -> Dict[str, Any]:
    sid = x_session_id or session_id or "anonymous_default"

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported for ingestion."
        )

    all_docs = document_manager.list_documents()
    if len(all_docs) >= settings.max_global_document_capacity:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The service has reached capacity — please try again later."
        )

    session_docs = [doc for doc in all_docs if doc.get("session_id") == sid]
    if len(session_docs) >= settings.max_session_document_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You've reached your personal {settings.max_session_document_capacity}-document limit — delete an existing one to upload a new one."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty."
        )

    if len(file_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit."
        )

    total_stored_bytes = sum(doc.get("file_size", 0) for doc in all_docs)
    if total_stored_bytes + len(file_bytes) > settings.max_global_storage_bytes:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The service has reached total storage capacity — please try again later."
        )

    document_id = str(uuid.uuid4())
    temp_path = settings.upload_directory / f"temp_{document_id}.pdf"
    
    try:
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_bytes)

        pages = pdf_parser.extract_pages(temp_path)
        if not pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract readable text from the uploaded PDF document."
            )

        chunks = text_chunker.chunk_document_pages(document_id, pages)
        vector_store.add_chunks(document_id, chunks, session_id=sid)

        sample_questions = []
        first_few_chunks = chunks[:3]
        sample_topics = []
        for chunk in first_few_chunks:
            sentences = chunk["text"].split(". ")
            if sentences and len(sentences[0]) > 20:
                sample_topics.append(sentences[0][:60].strip())
        
        if sample_topics:
            sample_questions.append(f"What are the main findings regarding {sample_topics[0]}?")
            if len(sample_topics) > 1:
                sample_questions.append(f"Can you summarize the section on {sample_topics[1]}?")
            sample_questions.append("What are the key conclusions in this document?")
        else:
            sample_questions = [
                "What is the main topic of this document?",
                "Can you summarize the key takeaways?",
                "What are the most important conclusions?"
            ]

        saved_doc = document_manager.save_document(
            document_id=document_id,
            filename=file.filename,
            file_bytes=file_bytes,
            total_pages=len(pages),
            total_chunks=len(chunks),
            sample_questions=sample_questions,
            session_id=sid
        )

        return saved_doc
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.get("", response_model=List[Dict[str, Any]])
async def list_documents(
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
) -> List[Dict[str, Any]]:
    sid = x_session_id or session_id or "anonymous_default"
    return document_manager.list_documents(session_id=sid)

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
) -> Dict[str, Any]:
    sid = x_session_id or session_id or "anonymous_default"
    document = document_manager.get_document(document_id, session_id=sid)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return document

@router.get("/{document_id}/file")
async def get_document_file(
    document_id: str,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
):
    sid = x_session_id or session_id or "anonymous_default"
    file_path = document_manager.get_document_file_path(document_id, session_id=sid)
    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document PDF file not found."
        )
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"{document_id}.pdf"
    )

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    session_id: Optional[str] = Query(default=None)
) -> Dict[str, str]:
    sid = x_session_id or session_id or "anonymous_default"
    deleted = document_manager.delete_document(document_id, session_id=sid)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return {"message": "Document and associated vectors deleted successfully."}
