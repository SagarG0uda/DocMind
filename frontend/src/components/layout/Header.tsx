import React from "react";
import { FileText, Sparkles, AlertTriangle, Settings2, HelpCircle, Upload, ChevronDown, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentRecord, SystemStatus } from "@/types";

interface HeaderProps {
  activeDocument: DocumentRecord | null;
  documentsList: DocumentRecord[];
  onSelectDocument: (document: DocumentRecord) => void;
  onOpenUpload: () => void;
  onDeleteDocument: (documentId: string) => void;
  systemStatus: SystemStatus | null;
  onOpenSettings: () => void;
  onOpenHowItWorks: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeDocument,
  documentsList,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  systemStatus,
  onOpenSettings,
  onOpenHowItWorks,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={400}>
      <header className="h-16 border-b border-stone-200 bg-white px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-700 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-200/60 ring-1 ring-white/20 transition-transform duration-fast active:scale-[0.96]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 shrink-0 text-white"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2V8H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 13H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 17H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900 leading-none">DocMind</span>
              <div className="inline-flex items-center justify-center h-5 px-2.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200/80 select-none">
                <span className="text-[10px] font-bold font-mono uppercase tracking-normal leading-none pt-[0.5px]">RAG PDF</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block h-5 w-[1px] bg-stone-200" />

          {activeDocument ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-purple-300 bg-stone-50/80 hover:bg-purple-50/50 text-left transition-all duration-fast active:scale-[0.98] min-h-[44px]"
                aria-expanded={dropdownOpen}
                aria-label="Select active document"
              >
                <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                <div className="max-w-[180px] lg:max-w-[260px] truncate">
                  <span className="text-sm font-medium text-stone-800 truncate block">{activeDocument.filename}</span>
                  <span className="text-[11px] text-stone-600 block">{activeDocument.total_pages} pages • {activeDocument.total_chunks} chunks</span>
                </div>
                <ChevronDown className="h-4 w-4 text-stone-600 shrink-0 ml-1" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-stone-200 rounded-xl shadow-lg z-50 py-1.5 divide-y divide-stone-100 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Switch Document ({documentsList.length})
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {documentsList.map((doc) => (
                        <div
                          key={doc.document_id}
                          className={`flex items-center justify-between px-3 py-2 hover:bg-purple-50/60 cursor-pointer ${
                            doc.document_id === activeDocument.document_id ? "bg-purple-50 text-purple-900" : "text-stone-700"
                          }`}
                          onClick={() => {
                            onSelectDocument(doc);
                            setDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center space-x-2.5 truncate pr-2">
                            <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                            <div className="truncate">
                              <p className="text-sm font-medium truncate">{doc.filename}</p>
                              <p className="text-xs text-stone-600">{doc.total_pages} pages • {doc.total_chunks} chunks</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            {doc.document_id === activeDocument.document_id && (
                              <Check className="h-4 w-4 text-purple-600 mr-1" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteDocument(doc.document_id);
                              }}
                              className="p-1 hover:text-red-600 text-stone-600 rounded transition-transform duration-fast active:scale-[0.96] min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Delete document"
                              aria-label={`Delete ${doc.filename}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs text-purple-700 border-dashed min-h-[44px] transition-transform duration-fast active:scale-[0.98]"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenUpload();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload New PDF
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenUpload}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 min-h-[44px] transition-transform duration-fast active:scale-[0.98]"
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Document
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {systemStatus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  {systemStatus.ox_alpha_configured ? (
                    <div className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100/80 rounded-full text-xs font-medium cursor-pointer transition-colors duration-fast active:scale-[0.98] leading-none">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="hidden sm:inline">Ox Alpha Active</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100/80 rounded-full text-xs font-medium cursor-pointer transition-colors duration-fast active:scale-[0.98] leading-none" onClick={onOpenSettings}>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="hidden sm:inline">Local Fallback Mode</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {systemStatus.ox_alpha_configured ? (
                  <p>Connected to Ox Alpha LLM with grounded RAG prompting</p>
                ) : (
                  <p>Ox Alpha API key not configured. Using local extractive RAG fallback. Click to add API key in Settings.</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenHowItWorks}
                className="text-stone-600 hover:text-purple-700 h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all duration-fast ease-out active:scale-[0.96]"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Help</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                className="text-stone-600 hover:text-purple-700 h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all duration-fast ease-out active:scale-[0.96]"
                aria-label="Settings"
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Settings</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};
