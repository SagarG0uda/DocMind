export interface DocumentRecord {
  document_id: string;
  filename: string;
  file_size: number;
  total_pages: number;
  total_chunks: number;
  created_at: number;
  sample_questions: string[];
}

export interface CitationItem {
  citation_number: number;
  page_number: number;
  chunk_id: string;
  chunk_index: number;
  text_snippet: string;
  full_text: string;
  similarity_score: number;
}

export interface RetrievedChunkItem {
  citation_number: number;
  chunk_id: string;
  document_id: string;
  page_number: number;
  chunk_index: number;
  token_count: number;
  text: string;
  similarity_score: number;
}

export interface RateLimitStatus {
  global_daily_used: number;
  global_daily_limit: number;
  global_minute_used: number;
  global_minute_limit: number;
  session_daily_used: number;
  session_daily_limit: number;
  session_minute_used: number;
  session_minute_limit: number;
  current_utc_date: string;
  seconds_until_utc_reset: number;
  is_limited_mode: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[];
  retrieved_chunks?: RetrievedChunkItem[];
  is_fallback?: boolean;
  model_name?: string;
  fallback_reason?: string;
  rate_limit_status?: RateLimitStatus;
  created_at: number;
}

export interface SystemStatus {
  status: string;
  app_name: string;
  ox_alpha_configured: boolean;
  model_name: string;
  base_url: string;
  embedding_model: string;
  retrieval_k: number;
  chunk_size_tokens: number;
  chunk_overlap_percentage: number;
  rate_limiter?: RateLimitStatus;
}
