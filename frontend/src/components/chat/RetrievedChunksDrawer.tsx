import React from "react";
import { X, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RetrievedChunkItem } from "@/types";

interface RetrievedChunksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chunks: RetrievedChunkItem[];
  onSelectChunk: (pageNumber: number, chunkText: string) => void;
}

export const RetrievedChunksDrawer: React.FC<RetrievedChunksDrawerProps> = ({
  isOpen,
  onClose,
  chunks,
  onSelectChunk,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl border-l border-stone-200 z-50 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 rounded text-purple-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-stone-900">Top-8 Retrieved Context Chunks</h3>
            <p className="text-xs text-stone-500">Ranked by cosine similarity in ChromaDB</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
          <X className="h-5 w-5 text-stone-500" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chunks.map((chunk, index) => (
          <div
            key={chunk.chunk_id || index}
            onClick={() => onSelectChunk(chunk.page_number, chunk.text)}
            className="p-3.5 rounded-xl border border-stone-200 hover:border-purple-400 bg-white hover:bg-purple-50/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Badge variant="citation" className="font-mono text-xs">
                  [{chunk.citation_number || index + 1}]
                </Badge>
                <span className="text-xs font-medium text-stone-700">Page {chunk.page_number}</span>
                <span className="text-[11px] text-stone-400 font-mono">• {chunk.token_count} tokens</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-mono font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {Math.round(chunk.similarity_score * 100)}% match
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-stone-700 font-serif leading-relaxed line-clamp-4">
              {chunk.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
