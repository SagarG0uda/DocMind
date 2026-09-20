import re
import tiktoken
from typing import List, Dict, Any
from app.config import settings

class TokenAwareChunker:
    def __init__(self):
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None

    def count_tokens(self, text: str) -> int:
        if self.tokenizer is not None:
            return len(self.tokenizer.encode(text))
        return max(1, len(text.split()))

    def split_into_sentences(self, text: str) -> List[str]:
        sentence_pattern = r"(?<=[.!?])\s+(?=[A-Z0-9])"
        raw_sentences = re.split(sentence_pattern, text)
        sentences = []
        for sentence in raw_sentences:
            cleaned = sentence.strip()
            if cleaned:
                sentences.append(cleaned)
        return sentences if sentences else [text]

    def chunk_document_pages(self, document_id: str, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        target_tokens = settings.target_chunk_size_tokens
        max_tokens = settings.maximum_chunk_size_tokens
        overlap_tokens = int(target_tokens * settings.chunk_overlap_percentage)
        all_chunks = []
        global_chunk_index = 0

        for page in pages:
            page_number = page["page_number"]
            page_text = page["text"]
            sentences = self.split_into_sentences(page_text)
            
            current_chunk_sentences = []
            current_tokens = 0
            sentence_index = 0
            
            while sentence_index < len(sentences):
                sentence = sentences[sentence_index]
                sentence_token_count = self.count_tokens(sentence)
                
                if sentence_token_count > max_tokens:
                    words = sentence.split()
                    sub_sentence = ""
                    for word in words:
                        test_sub = f"{sub_sentence} {word}".strip()
                        if self.count_tokens(test_sub) > target_tokens and sub_sentence:
                            chunk_text = sub_sentence.strip()
                            all_chunks.append({
                                "chunk_id": f"{document_id}_{global_chunk_index}",
                                "document_id": document_id,
                                "page_number": page_number,
                                "chunk_index": global_chunk_index,
                                "text": chunk_text,
                                "token_count": self.count_tokens(chunk_text)
                            })
                            global_chunk_index += 1
                            sub_sentence = word
                        else:
                            sub_sentence = test_sub
                    if sub_sentence:
                        current_chunk_sentences.append(sub_sentence)
                        current_tokens += self.count_tokens(sub_sentence)
                    sentence_index += 1
                    continue

                if current_tokens + sentence_token_count > max_tokens and current_chunk_sentences:
                    chunk_text = " ".join(current_chunk_sentences).strip()
                    all_chunks.append({
                        "chunk_id": f"{document_id}_{global_chunk_index}",
                        "document_id": document_id,
                        "page_number": page_number,
                        "chunk_index": global_chunk_index,
                        "text": chunk_text,
                        "token_count": self.count_tokens(chunk_text)
                    })
                    global_chunk_index += 1
                    
                    overlap_collected = []
                    overlap_token_sum = 0
                    for prev_sentence in reversed(current_chunk_sentences):
                        prev_tokens = self.count_tokens(prev_sentence)
                        if overlap_token_sum + prev_tokens <= overlap_tokens:
                            overlap_collected.insert(0, prev_sentence)
                            overlap_token_sum += prev_tokens
                        else:
                            break
                    current_chunk_sentences = overlap_collected
                    current_tokens = overlap_token_sum

                current_chunk_sentences.append(sentence)
                current_tokens += sentence_token_count
                sentence_index += 1

            if current_chunk_sentences:
                chunk_text = " ".join(current_chunk_sentences).strip()
                if chunk_text:
                    all_chunks.append({
                        "chunk_id": f"{document_id}_{global_chunk_index}",
                        "document_id": document_id,
                        "page_number": page_number,
                        "chunk_index": global_chunk_index,
                        "text": chunk_text,
                        "token_count": self.count_tokens(chunk_text)
                    })
                    global_chunk_index += 1

        return all_chunks

text_chunker = TokenAwareChunker()
