from pathlib import Path
from pypdf import PdfReader
from typing import List, Dict, Any
class PdfParser:
    def extract_pages(self, file_path: Path) -> List[Dict[str, Any]]:
        try:
            reader = PdfReader(str(file_path))
            extracted_pages = []
            for page_index, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                cleaned_text = page_text.strip()
                if cleaned_text:
                    extracted_pages.append({
                        "page_number": page_index + 1,
                        "text": cleaned_text,
                        "character_count": len(cleaned_text)
                    })
            return extracted_pages
        except Exception:
            return []

pdf_parser = PdfParser()
