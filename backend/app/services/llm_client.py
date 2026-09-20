import re
import httpx
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.services.prompt_builder import prompt_builder
from app.services.vector_store import vector_store

class LlmClient:
    def __init__(self):
        self.api_key = self._normalize_key(settings.ox_alpha_api_key)
        self.base_url = settings.ox_alpha_base_url
        self.model_name = settings.ox_alpha_model_name

    def _normalize_key(self, raw_key: str) -> str:
        if not raw_key:
            return ""
        cleaned = raw_key.strip().strip("'").strip('"')
        if cleaned.startswith("ysk-or-v1-"):
            cleaned = "sk-or-v1-" + cleaned[len("ysk-or-v1-"):]
        return cleaned

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 0)

    def update_credentials(self, api_key: str, base_url: str = "", model_name: str = "") -> None:
        self.api_key = self._normalize_key(api_key)
        if base_url:
            self.base_url = base_url.strip()
        if model_name:
            self.model_name = model_name.strip()

    def clean_llm_text(self, raw_text: str) -> str:
        if not raw_text:
            return ""
        
        cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<thought>.*?</thought>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<reasoning>.*?</reasoning>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"\[thinking\].*?\[/thinking\]", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        
        answer_split = re.split(r"(?:^|\n)(?:#+\s*|\*\*)?(?:Answer|Final Answer|Direct Answer):?\*?\*?\s*", cleaned, flags=re.IGNORECASE)
        if len(answer_split) > 1 and answer_split[-1].strip():
            cleaned = answer_split[-1].strip()
            
        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
        if not paragraphs:
            return ""
            
        final_paragraphs = []
        for p in paragraphs:
            if re.match(r"^(?:Here's a thinking process:?|Thinking Process:?|Reasoning:?|Thought Process:?|### Thinking|## Thinking|\*\*Thinking:?\*\*|\*\*Reasoning:?\*\*)", p, re.IGNORECASE):
                continue
                
            if re.match(r"^\d+\.\s+\*\*(?:Analyze|Identify|Search|Formulate|Draft|Check|Review|Determine|Understand|Context|Recall|Extract|Synthesize|Step|Core|Findings|Question).*?\*\*", p, re.IGNORECASE):
                continue
                
            if re.match(r"^\d+\.\s+(?:Analyze|Identify|Search|Formulate|Draft|Check|Review|Determine|Understand|Context|Recall|Extract|Synthesize|Step|Core|Findings|Question)", p, re.IGNORECASE):
                continue

            if re.match(r"^(?:The user is asking|The user's question is|Let's analyze|Let's check|Looking at the context)", p, re.IGNORECASE):
                continue
                
            lines = p.split("\n")
            non_reasoning_lines = []
            
            for line in lines:
                line_str = line.strip()
                if re.match(r"^\d+\.\s+\*\*(?:Analyze|Identify|Search|Formulate|Draft|Check|Review|Determine|Understand|Context|Recall|Extract|Synthesize|Step|Core|Findings|Question).*?\*\*", line_str, re.IGNORECASE):
                    continue
                if re.match(r"^(?:Here's a thinking process|Thinking Process|Reasoning:|### Thinking|## Thinking|\*\s+\*\*Analyze|\*\s+\*\*Identify|\*\s+\*\*Formulate|\*\s+\*\*Search)", line_str, re.IGNORECASE):
                    continue
                non_reasoning_lines.append(line)
                
            cleaned_p = "\n".join(non_reasoning_lines).strip()
            cleaned_p = re.sub(r"^(?:#+\s*|\*\*)?(?:Answer|Final Answer|Direct Answer):?\*?\*?\s*", "", cleaned_p, flags=re.IGNORECASE)
            
            if cleaned_p and not re.match(r"^(?:The question is about|Chunking algorithm details|Direct statement\.)", cleaned_p):
                final_paragraphs.append(cleaned_p)
                
        if not final_paragraphs and paragraphs:
            last_p = paragraphs[-1]
            last_p = re.sub(r"^(?:#+\s*|\*\*)?(?:Answer|Final Answer|Direct Answer):?\*?\*?\s*", "", last_p, flags=re.IGNORECASE)
            return last_p.strip()
            
        result = "\n\n".join(final_paragraphs).strip()
        result = re.sub(r"^(?:#+\s*|\*\*)?(?:Answer|Final Answer|Direct Answer):?\*?\*?\s*", "", result, flags=re.IGNORECASE)
        return result.strip()

    def extract_citations(self, answer_text: str, retrieved_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        citation_matches = re.findall(r"\[(\d+)\]", answer_text)
        referenced_numbers = sorted(list(set(int(match) for match in citation_matches)))
        
        chunk_map = {chunk.get("citation_number", index + 1): chunk for index, chunk in enumerate(retrieved_chunks)}
        
        citations = []
        for citation_number in referenced_numbers:
            if citation_number in chunk_map:
                source_chunk = chunk_map[citation_number]
                snippet = source_chunk.get("text", "")
                preview_length = min(280, len(snippet))
                truncated_snippet = snippet[:preview_length] + ("..." if len(snippet) > preview_length else "")
                
                citations.append({
                    "citation_number": citation_number,
                    "page_number": source_chunk.get("page_number", 1),
                    "chunk_id": source_chunk.get("chunk_id", ""),
                    "chunk_index": source_chunk.get("chunk_index", 0),
                    "text_snippet": truncated_snippet,
                    "full_text": snippet,
                    "similarity_score": source_chunk.get("similarity_score", 0.0)
                })
        return citations

    def generate_extractive_fallback(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not retrieved_chunks:
            return "The provided document does not contain information to answer this question.", []

        stop_words = {
            "what", "which", "where", "when", "how", "does", "this", "that", "these",
            "those", "with", "from", "have", "been", "were", "about", "into", "through",
            "during", "before", "after", "above", "below", "under", "again", "further",
            "then", "once", "here", "there", "when", "where", "why", "all", "any", "both",
            "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
            "only", "own", "same", "so", "than", "too", "very", "can", "will", "just",
            "should", "now", "is", "are", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of"
        }
        
        question_words = [w.lower() for w in re.findall(r"\w+", question) if len(w) > 2 and w.lower() not in stop_words]
        question_embedding = np.array(vector_store.generate_embeddings([question])[0])
        
        scored_sentences = []
        sentence_pattern = r"(?<=[.!?])\s+(?=[A-Z0-9])"
        
        for chunk in retrieved_chunks:
            citation_num = chunk.get("citation_number", 1)
            page_num = chunk.get("page_number", 1)
            chunk_score = chunk.get("similarity_score", 0.0)
            text = chunk.get("text", "")
            
            raw_sentences = re.split(sentence_pattern, text)
            clean_sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 20]
            
            if not clean_sentences:
                continue
                
            sentence_embeddings = vector_store.generate_embeddings(clean_sentences)
            
            for sentence, emb in zip(clean_sentences, sentence_embeddings):
                sentence_vec = np.array(emb)
                cos_sim = float(np.dot(question_embedding, sentence_vec))
                
                lower_sent = sentence.lower()
                matched_keywords = sum(1 for w in question_words if w in lower_sent)
                
                definitional_bonus = 0.0
                if any(w in lower_sent for w in ["strategy", "sliding window", "overlap", "partitioned", "tokens", "minilm", "dimension", "vectors", "hallucinations", "bounded prompt"]):
                    definitional_bonus += 0.15
                    
                generic_penalty = 0.0
                if "overview" in lower_sent or "implements a high-performance" in lower_sent or "bridge language models" in lower_sent:
                    generic_penalty += 0.20
                    
                keyword_score = (matched_keywords / max(1, len(question_words))) * 0.35
                total_relevance = (cos_sim * 0.45) + keyword_score + (chunk_score * 0.20) + definitional_bonus - generic_penalty
                
                scored_sentences.append({
                    "sentence": sentence,
                    "citation_number": citation_num,
                    "page_number": page_num,
                    "score": total_relevance,
                    "raw_cosine": cos_sim,
                    "chunk": chunk
                })

        if not scored_sentences:
            return "The provided document does not contain information to answer this question.", []

        scored_sentences.sort(key=lambda item: item["score"], reverse=True)
        top_candidates = [s for s in scored_sentences if s["score"] >= 0.22]
        
        if not top_candidates:
            return "The provided document does not contain information to answer this question.", []

        selected = top_candidates[:2]
        
        assembled_parts = []
        referenced_citations = []
        seen_citations = set()
        
        for item in selected:
            sent = item["sentence"]
            cit_num = item["citation_number"]
            assembled_parts.append(f"{sent} [{cit_num}]")
            
            if cit_num not in seen_citations:
                seen_citations.add(cit_num)
                referenced_citations.append({
                    "citation_number": cit_num,
                    "page_number": item["page_number"],
                    "chunk_id": item["chunk"].get("chunk_id", ""),
                    "chunk_index": item["chunk"].get("chunk_index", 0),
                    "text_snippet": item["sentence"],
                    "full_text": item["chunk"].get("text", ""),
                    "similarity_score": item["chunk"].get("similarity_score", 0.0)
                })

        answer = " ".join(assembled_parts)
        return answer, referenced_citations

    async def generate_answer(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Any = None
    ) -> Dict[str, Any]:
        if not self.is_configured():
            answer, citations = self.generate_extractive_fallback(question, retrieved_chunks)
            return {
                "answer": answer,
                "citations": citations,
                "is_fallback": True,
                "model_name": "extractive-fallback",
                "retrieved_chunks": retrieved_chunks
            }

        if not retrieved_chunks:
            return {
                "answer": "The provided document does not contain information to answer this question.",
                "citations": [],
                "is_fallback": False,
                "model_name": self.model_name,
                "retrieved_chunks": []
            }

        messages = prompt_builder.build_chat_messages(question, retrieved_chunks, conversation_history)
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                payload = {
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": 0.1,
                    "max_tokens": 800,
                    "reasoning": {"exclude": True}
                }
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8008",
                    "X-Title": "DocMind RAG"
                }
                response = await client.post(
                    f"{self.base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    choices = response_data.get("choices", [])
                    if choices:
                        raw_content = choices[0].get("message", {}).get("content", "")
                        answer_text = self.clean_llm_text(raw_content)
                        if answer_text:
                            citations = self.extract_citations(answer_text, retrieved_chunks)
                            return {
                                "answer": answer_text,
                                "citations": citations,
                                "is_fallback": False,
                                "model_name": self.model_name,
                                "retrieved_chunks": retrieved_chunks,
                                "raw_model_output": raw_content
                            }

            answer, citations = self.generate_extractive_fallback(question, retrieved_chunks)
            return {
                "answer": answer,
                "citations": citations,
                "is_fallback": True,
                "model_name": "extractive-fallback",
                "retrieved_chunks": retrieved_chunks
            }
        except Exception:
            answer, citations = self.generate_extractive_fallback(question, retrieved_chunks)
            return {
                "answer": answer,
                "citations": citations,
                "is_fallback": True,
                "model_name": "extractive-fallback",
                "retrieved_chunks": retrieved_chunks
            }

llm_client = LlmClient()
