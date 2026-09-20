import numpy as np

if not hasattr(np, "float_"):
    np.float_ = np.float64
if not hasattr(np, "int_"):
    np.int_ = np.int64
if not hasattr(np, "uint"):
    np.uint = np.uint64

import hashlib
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
from app.config import settings

class FallbackEmbeddingEngine:
    def __init__(self, dim: int = 384):
        self.dim = dim

    def encode(self, texts: List[str], convert_to_numpy: bool = True, normalize_embeddings: bool = True):
        results = []
        for text in texts:
            vec = np.zeros(self.dim, dtype=np.float32)
            words = text.lower().split()
            for i, w in enumerate(words):
                h = int(hashlib.sha256(w.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dim
                sign = 1.0 if (h >> 16) & 1 else -1.0
                vec[idx] += sign * (1.0 / (1.0 + 0.05 * i))
            
            for i in range(len(words) - 1):
                bg = f"{words[i]}_{words[i+1]}"
                h = int(hashlib.sha256(bg.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dim
                sign = 1.0 if (h >> 16) & 1 else -1.0
                vec[idx] += sign * 1.5
                
            norm = np.linalg.norm(vec)
            if norm > 1e-8 and normalize_embeddings:
                vec = vec / norm
            results.append(vec)
        return np.array(results)

class VectorStore:
    def __init__(self):
        self._chroma_client = None
        self._embedding_model = None
        self._collection = None

    @property
    def chroma_client(self):
        if self._chroma_client is None:
            self._chroma_client = chromadb.PersistentClient(
                path=str(settings.chroma_persistence_directory),
                settings=ChromaSettings(anonymized_telemetry=False, is_persistent=True)
            )
        return self._chroma_client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.chroma_client.get_or_create_collection(
                name="docmind_documents",
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    @property
    def embedding_model(self):
        if self._embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer(settings.embedding_model_name)
            except Exception:
                self._embedding_model = FallbackEmbeddingEngine(dim=384)
        return self._embedding_model

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.tolist()

    def add_chunks(self, document_id: str, chunks: List[Dict[str, Any]], session_id: Optional[str] = None) -> None:
        if not chunks:
            return

        texts = [chunk["text"] for chunk in chunks]
        ids = [chunk["chunk_id"] for chunk in chunks]
        metadatas = [
            {
                "document_id": document_id,
                "session_id": session_id or "anonymous_default",
                "page_number": int(chunk["page_number"]),
                "chunk_index": int(chunk["chunk_index"]),
                "token_count": int(chunk["token_count"])
            }
            for chunk in chunks
        ]
        embeddings = self.generate_embeddings(texts)

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

    def retrieve(
        self,
        query: str,
        document_id: Optional[str] = None,
        session_id: Optional[str] = None,
        k: int = 8
    ) -> List[Dict[str, Any]]:
        query_embeddings = self.generate_embeddings([query])
        
        where_clauses = []
        if document_id:
            where_clauses.append({"document_id": document_id})
        if session_id:
            where_clauses.append({"session_id": session_id})

        if len(where_clauses) == 1:
            where_filter = where_clauses[0]
        elif len(where_clauses) > 1:
            where_filter = {"$and": where_clauses}
        else:
            where_filter = None
        
        total_items = self.collection.count()
        if total_items == 0:
            return []

        results = self.collection.query(
            query_embeddings=query_embeddings,
            n_results=min(k, total_items),
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        retrieved_chunks = []
        if results and results["documents"] and results["documents"][0]:
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            ids = results["ids"][0]
            distances = results["distances"][0] if "distances" in results else [0.0] * len(documents)

            for rank_index in range(len(documents)):
                retrieved_chunks.append({
                    "citation_number": rank_index + 1,
                    "chunk_id": ids[rank_index],
                    "document_id": metadatas[rank_index].get("document_id", ""),
                    "page_number": metadatas[rank_index].get("page_number", 1),
                    "chunk_index": metadatas[rank_index].get("chunk_index", 0),
                    "token_count": metadatas[rank_index].get("token_count", 0),
                    "text": documents[rank_index],
                    "similarity_score": round(1.0 - distances[rank_index], 4) if distances else 1.0
                })

        return retrieved_chunks

    def delete_document_vectors(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})

vector_store = VectorStore()
