import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileText, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentRecord, ChatMessage, CitationItem, RetrievedChunkItem, RateLimitStatus } from "@/types";
import { ChatMessageItem } from "./ChatMessageItem";

interface ChatContainerProps {
  activeDocument: DocumentRecord | null;
  messages: ChatMessage[];
  isLoading: boolean;
  rateLimitStatus?: RateLimitStatus | null;
  onSendMessage: (text: string) => void;
  onCitationClick: (citation: CitationItem) => void;
  onOpenChunksDrawer: (chunks: RetrievedChunkItem[]) => void;
  onClearMessages: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  activeDocument,
  messages,
  isLoading,
  rateLimitStatus,
  onSendMessage,
  onCitationClick,
  onOpenChunksDrawer,
  onClearMessages,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || !activeDocument) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="h-12 border-b border-stone-200 px-4 flex items-center justify-between bg-stone-50/50 shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-semibold text-stone-800 uppercase tracking-wider">Document Conversation</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearMessages}
            className="text-xs h-8 text-stone-500 hover:text-stone-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear Chat
          </Button>
        )}
      </div>

      {rateLimitStatus && rateLimitStatus.is_limited_mode && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800 shrink-0">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Limited Mode:</strong> Daily AI quota running low ({rateLimitStatus.global_daily_used}/{rateLimitStatus.global_daily_limit} used) — answers generated via verified extractive grounding.
            </span>
          </div>
          <span className="text-[10px] text-amber-600 font-mono hidden sm:inline">
            Resets in {Math.floor(rateLimitStatus.seconds_until_utc_reset / 3600)}h {Math.floor((rateLimitStatus.seconds_until_utc_reset % 3600) / 60)}m UTC
          </span>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-[#faf9f8]"
      >
        {!activeDocument ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
            <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-800 mb-1">No Document Selected</h3>
            <p className="text-xs max-w-sm text-stone-500 mb-4">
              Please upload or select a PDF document from the header to begin chatting with cited sources.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center max-w-xl mx-auto py-10 my-4">
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-purple-100 text-purple-700 items-center justify-center mb-4 shadow-xs ring-1 ring-purple-200/60">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mb-2.5 leading-tight">
                Chat with {activeDocument.filename}
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                DocMind retrieves the top-8 most relevant passages from this PDF and forces the LLM to strictly cite facts with clickable page numbers.
              </p>
            </div>

            {activeDocument.sample_questions && activeDocument.sample_questions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider text-center mb-2">
                  Suggested Questions
                </p>
                <div className="grid gap-2">
                  {activeDocument.sample_questions.map((question, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSendMessage(question)}
                      className="text-left p-3.5 rounded-xl border border-stone-200 hover:border-purple-300 bg-white hover:bg-purple-50/50 text-xs text-stone-700 font-medium transition-all duration-fast easing-standard hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.99] shadow-xs flex items-center justify-between group min-h-[44px] cursor-pointer"
                    >
                      <span className="line-clamp-1">{question}</span>
                      <Send className="h-3.5 w-3.5 text-stone-300 group-hover:text-purple-600 shrink-0 ml-2 transition-colors duration-fast" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
                onOpenChunksDrawer={onOpenChunksDrawer}
              />
            ))}
            {isLoading && (
              <div className="flex w-full justify-start mb-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-base easing-decelerate">
                <div className="flex max-w-[88%] sm:max-w-[80%] space-x-3">
                  <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2 justify-start">
                      <span className="text-xs font-semibold text-stone-700">DocMind</span>
                    </div>
                    <div className="p-4 rounded-2xl rounded-bl-xs bg-white border border-stone-200 text-stone-900 shadow-sm font-sans flex items-center space-x-1.5 w-fit min-w-[64px]">
                      <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                      <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" style={{ animationDelay: "200ms", animationDuration: "1s" }} />
                      <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" style={{ animationDelay: "400ms", animationDuration: "1s" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="h-16 border-t border-stone-200 bg-white px-4 flex items-center shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center w-full max-w-4xl mx-auto">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeDocument ? `Ask a question about ${activeDocument.filename}... (Press Enter to send)` : "Select a document to ask questions"}
            disabled={!activeDocument || isLoading}
            rows={1}
            className="pr-12 text-sm h-10 min-h-[40px] max-h-24 py-2 rounded-xl border-stone-300 resize-none overflow-y-auto break-words [overflow-wrap:anywhere]"
            aria-label="Question prompt"
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || isLoading || !activeDocument}
            size="icon"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-[0.96] text-white h-8 w-8 min-h-[36px] min-w-[36px] flex items-center justify-center transition-transform duration-fast easing-standard shadow-xs"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
};
