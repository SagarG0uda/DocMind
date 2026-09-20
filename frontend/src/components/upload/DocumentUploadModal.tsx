import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DocumentRecord } from "@/types";
import { uploadDocument } from "@/lib/api";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (document: DocumentRecord) => void;
}

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setSelectedFile(null);
          setErrorMessage(`File exceeds the ${MAX_FILE_SIZE_MB}MB upload limit.`);
        } else {
          setSelectedFile(file);
          setErrorMessage(null);
        }
      } else {
        setSelectedFile(null);
        setErrorMessage("Please select a valid PDF file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setSelectedFile(null);
        setErrorMessage(`File exceeds the ${MAX_FILE_SIZE_MB}MB upload limit.`);
      } else {
        setSelectedFile(file);
        setErrorMessage(null);
      }
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 300);

    try {
      const uploadedDoc = await uploadDocument(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        setUploadProgress(0);
        onUploadSuccess(uploadedDoc);
        onClose();
      }, 400);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setErrorMessage(err.message || "Failed to process PDF document.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isUploading && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload PDF Document</DialogTitle>
          <DialogDescription>
            DocMind will extract text with PyPDF, generate 500–1000 token chunks with 15% overlap, compute MiniLM vector embeddings, and index into ChromaDB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragOver
                ? "border-purple-600 bg-purple-50/70"
                : "border-stone-300 hover:border-purple-400 bg-stone-50/50 hover:bg-purple-50/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />
            <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-stone-800 mb-1">
              Click to browse or drag & drop PDF here
            </p>
            <p className="text-xs text-stone-500">Supports standard multi-page PDF documents (Max file size: 25MB)</p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5 truncate">
                <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-stone-900 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-stone-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 ml-2" />
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-600 font-medium">
                <span>Ingesting & Embedding Chunks...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleStartUpload}
            disabled={!selectedFile || isUploading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Ingesting PDF...
              </>
            ) : (
              "Ingest & Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
