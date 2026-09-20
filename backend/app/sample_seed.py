import uuid
import textwrap
from pathlib import Path
from pypdf import PdfReader
from app.config import settings
from app.services.pdf_parser import pdf_parser
from app.services.chunker import text_chunker
from app.services.vector_store import vector_store
from app.services.document_manager import document_manager

def create_formatted_pdf(file_path: Path, pages_content: list[str]) -> None:
    objects = []
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    page_count = len(pages_content)
    page_kids = " ".join([f"{3 + i * 2} 0 R" for i in range(page_count)])
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{page_kids}] /Count {page_count} >>\nendobj\n")

    for i, page_text in enumerate(pages_content):
        page_obj_idx = 3 + i * 2
        content_obj_idx = 4 + i * 2
        
        raw_paragraphs = page_text.strip().split("\n\n")
        wrapped_lines = []
        for paragraph in raw_paragraphs:
            cleaned_paragraph = " ".join(paragraph.split())
            if cleaned_paragraph:
                lines = textwrap.wrap(cleaned_paragraph, width=64)
                wrapped_lines.extend(lines)
                wrapped_lines.append("")

        stream_content = "BT\n/F1 11 Tf\n15 TL\n48 740 Td\n"
        for line in wrapped_lines:
            safe_line = line.replace("(", "\\(").replace(")", "\\)")
            stream_content += f"({safe_line}) ' \n"
        stream_content += "ET\n"
        
        stream_bytes = stream_content.encode("latin-1")
        stream_len = len(stream_bytes)
        page_obj = f"{page_obj_idx} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents {content_obj_idx} 0 R >>\nendobj\n"
        content_obj = f"{content_obj_idx} 0 obj\n<< /Length {stream_len} >>\nstream\n{stream_content}endstream\nendobj\n"
        objects.append(page_obj)
        objects.append(content_obj)

    xref_offsets = [0]
    pdf_bytes = b"%PDF-1.4\n"
    for obj in objects:
        xref_offsets.append(len(pdf_bytes))
        pdf_bytes += obj.encode("latin-1")

    xref_start = len(pdf_bytes)
    pdf_bytes += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1")
    for offset in xref_offsets[1:]:
        pdf_bytes += f"{offset:010d} 00000 n \n".encode("latin-1")

    pdf_bytes += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin-1")
    file_path.write_bytes(pdf_bytes)

def seed_sample_document_if_empty(force_reseed: bool = False) -> None:
    existing_docs = document_manager.list_documents()
    if existing_docs and not force_reseed:
        return

    sample_doc_id = "sample_rag_paper_001"
    sample_file_path = settings.upload_directory / f"{sample_doc_id}.pdf"
    
    pages = [
        "DocMind: Neural Retrieval-Augmented Generation Architecture\n\nSection 1: Architecture Overview and Ingestion Pipeline\n\nModern knowledge retrieval systems bridge language models and document repositories. DocMind implements a high-performance RAG ingestion pipeline consisting of document parsing, semantic chunking, vector embedding generation, and persistent similarity indexing.\n\nWhen a PDF document is uploaded, PyPDF extracts textual content across every page while tracking exact 1-indexed page coordinates. Text is partitioned into 500 to 1000 token segments using a sliding window chunking algorithm with 15 percent overlap across boundaries. This overlap ensures that sentences crossing chunk borders preserve semantic context and coreference resolution without information loss.",
        "Section 2: Vector Embeddings and ChromaDB Indexing\n\nVector embeddings convert unstructured text passages into dense mathematical representations. DocMind employs the all-MiniLM-L6-v2 sentence transformer model, producing 384-dimensional dense vectors. The embedding model runs efficiently on CPU architectures with sub-millisecond execution times.\n\nEmbeddings and associated metadata (document ID, page number, chunk index) are indexed inside ChromaDB. ChromaDB utilizes an Hierarchical Navigable Small World (HNSW) cosine similarity graph. During user queries, the similarity search retrieves the top-8 most pertinent passages (k=8), which are subsequently formatted with bracketed citation identifiers for LLM grounding.",
        "Section 3: Grounded LLM Prompting and Citation Guarantees\n\nTo prevent hallucinations, DocMind constructs a bounded system prompt for the Ox Alpha LLM. The prompt builder injects the top-8 retrieved context passages with explicit instructions to answer exclusively based on the provided context passages, attach bracketed citation markers like [1] or [2] to every stated fact, and explicitly state when information is absent.\n\nIn the React split-pane user interface, clicking any citation badge immediately scrolls the PDF viewer to the corresponding page and highlights the source passage for instant visual verification."
    ]

    create_formatted_pdf(sample_file_path, pages)
    extracted_pages = pdf_parser.extract_pages(sample_file_path)
    chunks = text_chunker.chunk_document_pages(sample_doc_id, extracted_pages)
    vector_store.add_chunks(sample_doc_id, chunks)

    sample_questions = [
        "What chunking strategy does this pipeline use?",
        "Which embedding model does DocMind use and what is its vector dimension?",
        "What guarantees are enforced in the prompt to prevent LLM hallucinations?"
    ]

    file_bytes = sample_file_path.read_bytes()
    document_manager.save_document(
        document_id=sample_doc_id,
        filename="DocMind_RAG_Architecture_Paper.pdf",
        file_bytes=file_bytes,
        total_pages=len(extracted_pages),
        total_chunks=len(chunks),
        sample_questions=sample_questions
    )
