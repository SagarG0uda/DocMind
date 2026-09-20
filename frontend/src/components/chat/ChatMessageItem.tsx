import React, { useState } from "react";
import { User, Sparkles, Layers, AlertCircle, ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, CitationItem, RetrievedChunkItem } from "@/types";
import { CitationBadge } from "./CitationBadge";

interface ChatMessageItemProps {
  message: ChatMessage;
  onCitationClick: (citation: CitationItem) => void;
  onOpenChunksDrawer: (chunks: RetrievedChunkItem[]) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCitationClick,
  onOpenChunksDrawer,
}) => {
  const isAssistant = message.role === "assistant";
  const [isChunksExpanded, setIsChunksExpanded] = useState(false);

  const renderContentWithCitations = (content: string, citations?: CitationItem[]) => {
    if (!citations || citations.length === 0) {
      return <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content}</span>;
    }

    const citationMap = new Map<number, CitationItem>();
    citations.forEach((c) => citationMap.set(c.citation_number, c));

    const parts = content.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const citationNumber = parseInt(match[1], 10);
        const citation = citationMap.get(citationNumber);
        if (citation) {
          return (
            <CitationBadge
              key={index}
              citation={citation}
              onClick={onCitationClick}
            />
          );
        }
      }
      return <span key={index} className="break-words [overflow-wrap:anywhere]">{part}</span>;
    });
  };

  return (
    <div className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"} mb-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-base easing-decelerate`}>
      <div className={`flex max-w-[88%] sm:max-w-[80%] space-x-3 ${isAssistant ? "flex-row" : "flex-row-reverse space-x-reverse"}`}>
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-xs ${
            isAssistant
              ? "bg-purple-600 text-white"
              : "bg-stone-800 text-white"
          }`}
        >
          {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>

        <div className="flex flex-col space-y-1.5 flex-1 overflow-hidden">
          <div className={`flex items-center space-x-2 ${isAssistant ? "justify-start" : "justify-end"}`}>
            <span className="text-xs font-semibold text-stone-700">
              {isAssistant ? "DocMind" : "You"}
            </span>
            {isAssistant && message.is_fallback && (
              <Badge variant="warning" className="text-[10px] py-0 px-1.5 h-4 gap-1 rounded-md squircle-badge" title={message.fallback_reason || "Grounded extractive fallback"}>
                <AlertCircle className="h-2.5 w-2.5" /> Extractive Fallback
              </Badge>
            )}
            {isAssistant && message.fallback_reason && (
              <span className="text-[10px] text-amber-700 bg-amber-50/90 px-1.5 py-0.2 rounded-md border border-amber-200/80 truncate max-w-[240px] font-sans" title={message.fallback_reason}>
                {message.fallback_reason.length > 38 ? message.fallback_reason.slice(0, 38) + "..." : message.fallback_reason}
              </span>
            )}
            {isAssistant && !message.is_fallback && message.model_name && (
              <span className="text-[10px] text-purple-700 font-mono bg-purple-50 px-1.5 py-0.2 rounded-md squircle-badge border border-purple-200">
                {message.model_name}
              </span>
            )}
          </div>

          <div
            className={`p-4 text-sm leading-relaxed break-words [overflow-wrap:anywhere] shadow-sm transition-all duration-fast ${
              isAssistant
                ? "bg-white border border-stone-200/90 text-stone-900 font-serif text-[15px] rounded-2xl rounded-bl-xs"
                : "bg-purple-600 text-white font-sans font-normal rounded-2xl rounded-br-xs"
            }`}
          >
            {renderContentWithCitations(message.content, message.citations)}
          </div>

          {isAssistant && message.retrieved_chunks && message.retrieved_chunks.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsChunksExpanded(!isChunksExpanded)}
                className="inline-flex items-center space-x-1.5 text-xs text-stone-600 hover:text-purple-700 font-medium py-1 px-2 rounded-lg hover:bg-purple-50/60 transition-colors duration-fast group active:scale-[0.98]"
                aria-expanded={isChunksExpanded}
              >
                <Layers className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>View Top-8 Retrieved Chunks ({message.retrieved_chunks.length})</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-stone-400 group-hover:text-purple-600 transition-transform duration-fast easing-standard shrink-0 ${
                    isChunksExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-base easing-decelerate ${
                  isChunksExpanded ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-3 bg-stone-50/90 rounded-xl border border-stone-200/80 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-200/60 text-[11px] text-stone-500 font-medium">
                    <span>Ranked passages from vector retrieval</span>
                    <button
                      type="button"
                      onClick={() => onOpenChunksDrawer(message.retrieved_chunks || [])}
                      className="text-purple-600 hover:text-purple-800 flex items-center space-x-1 hover:underline transition-colors duration-fast active:scale-[0.96]"
                    >
                      <span>Open in drawer</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  {message.retrieved_chunks.map((chunk, idx) => (
                    <div
                      key={chunk.chunk_id || idx}
                      onClick={() => onCitationClick({
                        citation_number: chunk.citation_number || idx + 1,
                        page_number: chunk.page_number,
                        chunk_id: chunk.chunk_id,
                        chunk_index: chunk.chunk_index,
                        text_snippet: chunk.text.slice(0, 150),
                        full_text: chunk.text,
                        similarity_score: chunk.similarity_score
                      })}
                      className="p-2.5 rounded-lg bg-white border border-stone-200/80 hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-fast cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold text-[11px] text-purple-700">[{chunk.citation_number || idx + 1}] Page {chunk.page_number}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{Math.round(chunk.similarity_score * 100)}% match</span>
                      </div>
                      <p className="text-stone-700 font-serif text-xs line-clamp-2 leading-relaxed">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
