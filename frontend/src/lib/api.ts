import { DocumentRecord, CitationItem, RetrievedChunkItem, SystemStatus, RateLimitStatus } from '../types';

const RAW_API_BASE_URL = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_URL 
  ? String(import.meta.env.VITE_API_URL).trim() 
  : 'http://localhost:8006';

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export function getSessionId(): string {
  let sessionId = localStorage.getItem('docmind_session_id');
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('docmind_session_id', sessionId);
  }
  return sessionId;
}

export async function uploadDocument(file: File): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'X-Session-ID': getSessionId(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(errorData.detail || 'Failed to upload document');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}). Please verify that the backend is running.`);
    }
    throw error;
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: {
        'X-Session-ID': getSessionId(),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch documents list');
    }
    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}).`);
    }
    throw error;
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'X-Session-ID': getSessionId(),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}).`);
    }
    throw error;
  }
}

export function getDocumentPdfUrl(documentId: string): string {
  return `${API_BASE_URL}/documents/${documentId}/file?session_id=${encodeURIComponent(getSessionId())}`;
}

export interface QueryPayload {
  document_id: string;
  question: string;
  history: Array<{ role: string; content: string }>;
}

export interface QueryResponseData {
  answer: string;
  citations: CitationItem[];
  retrieved_chunks: RetrievedChunkItem[];
  is_fallback: boolean;
  model_name: string;
  document_id: string;
  fallback_reason?: string;
  rate_limit_status?: RateLimitStatus;
}

export async function submitQuestion(payload: QueryPayload): Promise<QueryResponseData> {
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId(),
      },
      body: JSON.stringify({
        ...payload,
        session_id: getSessionId(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Query failed' }));
      throw new Error(errorData.detail || 'Failed to process question');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}). Please verify that the backend is running.`);
    }
    throw error;
  }
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch system status');
    }
    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}).`);
    }
    throw error;
  }
}

export async function updateSystemConfig(config: {
  ox_alpha_api_key: string;
  ox_alpha_base_url?: string;
  ox_alpha_model_name?: string;
}): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to update system configuration');
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
      throw new Error(`Cannot connect to DocMind backend server (${API_BASE_URL}).`);
    }
    throw error;
  }
}
