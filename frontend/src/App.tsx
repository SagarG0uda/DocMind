import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { SplitPaneLayout } from "@/components/layout/SplitPaneLayout";
import { PdfViewer } from "@/components/pdf-viewer/PdfViewer";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { RetrievedChunksDrawer } from "@/components/chat/RetrievedChunksDrawer";
import { DocumentUploadModal } from "@/components/upload/DocumentUploadModal";
import { HowItWorksModal } from "@/components/dialogs/HowItWorksModal";
import { SettingsModal } from "@/components/dialogs/SettingsModal";
import { DocumentRecord, ChatMessage, CitationItem, RetrievedChunkItem, SystemStatus, RateLimitStatus } from "@/types";
import { listDocuments, deleteDocument, submitQuestion, fetchSystemStatus } from "@/lib/api";

export function App() {
  const [documentsList, setDocumentsList] = useState<DocumentRecord[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState<boolean>(false);
  const [targetPdfPage, setTargetPdfPage] = useState<number>(1);
  const [highlightedText, setHighlightedText] = useState<string>("");
  const [jumpRequestId, setJumpRequestId] = useState<number>(0);
  const [drawerChunks, setDrawerChunks] = useState<RetrievedChunkItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const loadDocuments = async () => {
    try {
      const docs = await listDocuments();
      setDocumentsList(docs);
      if (docs.length > 0 && !activeDocument) {
        setActiveDocument(docs[0]);
      }
    } catch {
      setDocumentsList([]);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const status = await fetchSystemStatus();
      setSystemStatus(status);
      if (status?.rate_limiter) {
        setRateLimitStatus(status.rate_limiter);
      }
    } catch {
      setSystemStatus(null);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadSystemStatus();
  }, []);

  const handleSelectDocument = (doc: DocumentRecord) => {
    setActiveDocument(doc);
    setMessages([]);
    setTargetPdfPage(1);
    setHighlightedText("");
    setJumpRequestId((prev) => prev + 1);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      const remainingDocs = documentsList.filter((d) => d.document_id !== documentId);
      setDocumentsList(remainingDocs);
      if (activeDocument?.document_id === documentId) {
        setActiveDocument(remainingDocs.length > 0 ? remainingDocs[0] : null);
        setMessages([]);
      }
    } catch {
      return;
    }
  };

  const handleUploadSuccess = (newDoc: DocumentRecord) => {
    setDocumentsList((prev) => [newDoc, ...prev]);
    setActiveDocument(newDoc);
    setMessages([]);
    setTargetPdfPage(1);
    setHighlightedText("");
    setJumpRequestId((prev) => prev + 1);
  };

  const handleSendMessage = async (questionText: string) => {
    if (!activeDocument || isLoadingAnswer || isSubmittingRef.current) return;
    const cleanText = questionText.trim();
    if (!cleanText) return;

    isSubmittingRef.current = true;
    const userMessageId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: cleanText,
      created_at: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoadingAnswer(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const queryResult = await submitQuestion({
        document_id: activeDocument.document_id,
        question: cleanText,
        history: historyPayload,
      });

      const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: queryResult.answer,
        citations: queryResult.citations,
        retrieved_chunks: queryResult.retrieved_chunks,
        is_fallback: queryResult.is_fallback,
        model_name: queryResult.model_name,
        fallback_reason: queryResult.fallback_reason,
        rate_limit_status: queryResult.rate_limit_status,
        created_at: Date.now(),
      };

      if (queryResult.rate_limit_status) {
        setRateLimitStatus(queryResult.rate_limit_status);
      }

      setMessages((prev) => [...prev, assistantMessage]);

      if (queryResult.citations && queryResult.citations.length > 0) {
        setTargetPdfPage(queryResult.citations[0].page_number);
        setHighlightedText(queryResult.citations[0].text_snippet);
        setJumpRequestId((prev) => prev + 1);
      }
    } catch {
      const errorMessageId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        role: "assistant",
        content: "Sorry, an error occurred while analyzing the document context. Please verify that the backend is running.",
        created_at: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingAnswer(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCitationClick = (citation: CitationItem) => {
    setTargetPdfPage(citation.page_number);
    setHighlightedText(citation.text_snippet);
    setJumpRequestId((prev) => prev + 1);
  };

  const handleOpenChunksDrawer = (chunks: RetrievedChunkItem[]) => {
    setDrawerChunks(chunks);
    setIsDrawerOpen(true);
  };

  const handleSelectChunk = (pageNumber: number, chunkText: string) => {
    setTargetPdfPage(pageNumber);
    setHighlightedText(chunkText);
    setJumpRequestId((prev) => prev + 1);
    setIsDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-stone-900 antialiased font-sans">
      <Header
        activeDocument={activeDocument}
        documentsList={documentsList}
        onSelectDocument={handleSelectDocument}
        onOpenUpload={() => setIsUploadOpen(true)}
        onDeleteDocument={handleDeleteDocument}
        systemStatus={systemStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />

      <SplitPaneLayout
        leftPane={
          <PdfViewer
            document={activeDocument}
            targetPage={targetPdfPage}
            highlightText={highlightedText}
            jumpRequestId={jumpRequestId}
          />
        }
        rightPane={
          <ChatContainer
            activeDocument={activeDocument}
            messages={messages}
            isLoading={isLoadingAnswer}
            rateLimitStatus={rateLimitStatus}
            onSendMessage={handleSendMessage}
            onCitationClick={handleCitationClick}
            onOpenChunksDrawer={handleOpenChunksDrawer}
            onClearMessages={() => setMessages([])}
          />
        }
      />

      <RetrievedChunksDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chunks={drawerChunks}
        onSelectChunk={handleSelectChunk}
      />

      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemStatus={systemStatus}
        onConfigUpdated={loadSystemStatus}
      />


    </div>
  );
}

export default App;
