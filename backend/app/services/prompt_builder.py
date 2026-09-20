from typing import List, Dict, Any, Optional

class PromptBuilder:
    def __init__(self):
        self.system_instruction = (
            "You are DocMind, an intelligent document analysis assistant. "
            "Answer the user's question strictly and exclusively based on the numbered context passages provided below. "
            "For every claim or fact you state, you MUST include the citation number in square brackets, e.g. [1], [2]. "
            "If the answer cannot be found in the provided context passages, state clearly and concisely: "
            "'The provided document does not contain information to answer this question.' "
            "Do not invent, extrapolate, or assume any facts outside the provided context passages. "
            "Output strictly and exclusively the final answer. Do not output any thinking steps, reasoning analysis, or preamble."
        )

    def format_context_passages(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "No relevant context passages found."

        formatted_passages = []
        for chunk in chunks:
            citation_number = chunk.get("citation_number", 1)
            page_number = chunk.get("page_number", 1)
            text = chunk.get("text", "").strip()
            formatted_passages.append(f"[{citation_number}] Page {page_number}:\n{text}")

        return "\n\n".join(formatted_passages)

    def build_chat_messages(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, str]]:
        context_block = self.format_context_passages(retrieved_chunks)
        system_content = f"{self.system_instruction}\n\nContext Passages:\n{context_block}"
        messages = [{"role": "system", "content": system_content}]
        
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role")
                content = turn.get("content")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})
                    
        user_prompt = f"Question: {question}\n\nRemember to answer strictly using only the context passages above, cite facts with [1], [2], and output only the direct answer with zero thinking preamble."
        messages.append({"role": "user", "content": user_prompt})
        return messages

prompt_builder = PromptBuilder()
