import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CitationItem } from "@/types";

interface CitationBadgeProps {
  citation: CitationItem;
  onClick: (citation: CitationItem) => void;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ citation, onClick }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);
    onClick(citation);
    setTimeout(() => setIsClicked(false), 400);
  };

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={`inline-flex items-center justify-center mx-1 my-0.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border transition-all duration-150 ease-in-out active:scale-95 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none min-h-[32px] sm:min-h-[28px] touch-manipulation cursor-pointer select-none shadow-xs relative before:absolute before:-inset-2 before:content-[''] ${
              isClicked
                ? "bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400"
                : "bg-purple-50 text-purple-800 hover:bg-purple-100 hover:border-purple-400 border-purple-200"
            }`}
            aria-label={`Navigate PDF to Citation ${citation.citation_number} on page ${citation.page_number}`}
          >
            [{citation.citation_number}] Page {citation.page_number}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="p-2.5 bg-stone-900/95 text-stone-100 shadow-xl border border-stone-800 rounded-lg max-w-xs pointer-events-none z-50 backdrop-blur-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 border-b border-stone-700/60 pb-1">
              <span>Citation #{citation.citation_number} • Page {citation.page_number}</span>
              <span className="text-[10px] text-stone-400">Score: {Math.round(citation.similarity_score * 100)}%</span>
            </div>
            <p className="text-[11px] text-stone-200 italic font-serif leading-relaxed line-clamp-2">
              "{citation.text_snippet}"
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
