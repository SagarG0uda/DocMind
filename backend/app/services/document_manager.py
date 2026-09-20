import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.vector_store import vector_store

class DocumentManager:
    def __init__(self):
        self.metadata_file = settings.data_directory / "documents.json"
        self._ensure_metadata_file()

    def _ensure_metadata_file(self) -> None:
        if not self.metadata_file.exists():
            with open(self.metadata_file, "w", encoding="utf-8") as file_handle:
                json.dump({}, file_handle, indent=2)

    def _read_metadata(self) -> Dict[str, Dict[str, Any]]:
        try:
            with open(self.metadata_file, "r", encoding="utf-8") as file_handle:
                return json.load(file_handle)
        except Exception:
            return {}

    def _write_metadata(self, data: Dict[str, Dict[str, Any]]) -> None:
        with open(self.metadata_file, "w", encoding="utf-8") as file_handle:
            json.dump(data, file_handle, indent=2)

    def save_document(
        self,
        document_id: str,
        filename: str,
        file_bytes: bytes,
        total_pages: int,
        total_chunks: int,
        sample_questions: Optional[List[str]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        file_path = settings.upload_directory / f"{document_id}.pdf"
        with open(file_path, "wb") as file_handle:
            file_handle.write(file_bytes)

        metadata_records = self._read_metadata()
        document_record = {
            "document_id": document_id,
            "session_id": session_id or "anonymous_default",
            "filename": filename,
            "file_size": len(file_bytes),
            "total_pages": total_pages,
            "total_chunks": total_chunks,
            "created_at": time.time(),
            "sample_questions": sample_questions or []
        }
        metadata_records[document_id] = document_record
        self._write_metadata(metadata_records)
        return document_record

    def get_document(self, document_id: str, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        metadata_records = self._read_metadata()
        doc = metadata_records.get(document_id)
        if not doc:
            return None
        if session_id and doc.get("session_id") and doc.get("session_id") != session_id:
            return None
        return doc

    def list_documents(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        metadata_records = self._read_metadata()
        documents = list(metadata_records.values())
        if session_id:
            documents = [doc for doc in documents if doc.get("session_id") == session_id]
        documents.sort(key=lambda doc: doc.get("created_at", 0), reverse=True)
        return documents

    def delete_document(self, document_id: str, session_id: Optional[str] = None) -> bool:
        metadata_records = self._read_metadata()
        if document_id not in metadata_records:
            return False

        doc = metadata_records[document_id]
        if session_id and doc.get("session_id") and doc.get("session_id") != session_id:
            return False

        del metadata_records[document_id]
        self._write_metadata(metadata_records)

        file_path = settings.upload_directory / f"{document_id}.pdf"
        if file_path.exists():
            file_path.unlink()

        vector_store.delete_document_vectors(document_id)
        return True

    def get_document_file_path(self, document_id: str, session_id: Optional[str] = None) -> Optional[Path]:
        doc = self.get_document(document_id, session_id=session_id)
        if not doc:
            return None
        file_path = settings.upload_directory / f"{document_id}.pdf"
        if file_path.exists():
            return file_path
        return None

document_manager = DocumentManager()
