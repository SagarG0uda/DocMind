import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Split, Binary, Database, Cpu } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">How DocMind Works</DialogTitle>
          <DialogDescription>
            Detailed technical breakdown of the Retrieval-Augmented Generation (RAG) pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                <FileText className="h-4 w-4" />
                <span>1. PDF Extraction (PyPDF)</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Uploaded PDFs are parsed page-by-page, recording exact page numbers and character metadata for verified source attribution.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                <Split className="h-4 w-4" />
                <span>2. Token Chunking (15% Overlap)</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sentence-boundary chunker creates 500–1000 token segments with 15% overlap to preserve semantic continuity across chunk boundaries.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                <Binary className="h-4 w-4" />
                <span>3. Vector Embeddings (MiniLM)</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Dense 384-dimensional vector embeddings are computed locally using <code className="font-mono text-purple-800 bg-purple-100 px-1 rounded">all-MiniLM-L6-v2</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                <Database className="h-4 w-4" />
                <span>4. ChromaDB Top-8 Retrieval</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Cosine similarity search queries the collection and returns the top-8 most pertinent passages formatted as numbered citations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2 sm:col-span-2">
              <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                <Cpu className="h-4 w-4" />
                <span>5. Grounded Ox Alpha LLM Generation</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                A strictly bounded prompt forces the LLM to answer only from the provided top-8 chunks with square bracket citations (e.g. <code className="font-mono text-purple-800 bg-purple-100 px-1 rounded">[1]</code>, <code className="font-mono text-purple-800 bg-purple-100 px-1 rounded">[2]</code>). If information is absent, it explicitly states so.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
