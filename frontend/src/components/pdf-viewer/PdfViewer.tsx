import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Loader2, Maximize2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentRecord } from "@/types";
import { getDocumentPdfUrl } from "@/lib/api";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  document: DocumentRecord | null;
  targetPage?: number;
  highlightText?: string;
  jumpRequestId?: number;
}

const ZOOM_STEPS = [0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];

export const PdfViewer: React.FC<PdfViewerProps> = ({
  document,
  targetPage,
  highlightText,
  jumpRequestId,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.75);
  const [isFitToWidthActive, setIsFitToWidthActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNavFeedback, setShowNavFeedback] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const fitToContainerWidth = useCallback((pageViewportWidth: number) => {
    if (!containerRef.current) return 0.75;
    const availableWidth = containerRef.current.clientWidth - 48;
    if (availableWidth <= 0 || pageViewportWidth <= 0) return 0.75;
    return Math.max(0.75, Math.min(availableWidth / pageViewportWidth, 3.0));
  }, []);

  useEffect(() => {
    if (!document) {
      setPdfDoc(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const pdfUrl = getDocumentPdfUrl(document.document_id);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedDoc) => {
        if (isMounted) {
          setPdfDoc(loadedDoc);
          setTotalPages(loadedDoc.numPages);
          setCurrentPage(targetPage || 1);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || "Failed to render PDF document.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      loadingTask.destroy();
    };
  }, [document]);

  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
      setShowNavFeedback(true);
      const timer = setTimeout(() => setShowNavFeedback(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [targetPage, totalPages, highlightText, jumpRequestId]);

  const [displayScaleTrigger, setDisplayScaleTrigger] = useState<number>(0);

  useEffect(() => {
    const handleZoomOrResize = () => {
      setDisplayScaleTrigger((prev) => prev + 1);
    };

    window.addEventListener("resize", handleZoomOrResize);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleZoomOrResize);
    }

    let mediaQuery: MediaQueryList | null = null;
    try {
      mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mediaQuery.addEventListener("change", handleZoomOrResize);
    } catch {
    }

    return () => {
      window.removeEventListener("resize", handleZoomOrResize);
      if (vv) {
        vv.removeEventListener("resize", handleZoomOrResize);
      }
      if (mediaQuery) {
        try {
          mediaQuery.removeEventListener("change", handleZoomOrResize);
        } catch {
        }
      }
    };
  }, []);

  const renderCurrentPage = useCallback(() => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
      }
    }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (!canvasRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const visualScale = window.visualViewport?.scale || 1;
      const effectiveDisplayScale = dpr * visualScale;

      const renderScale = scale * Math.max(effectiveDisplayScale, 2.0);
      const exactViewport = page.getViewport({ scale: renderScale });
      const cssViewport = page.getViewport({ scale: scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      canvas.width = Math.round(exactViewport.width);
      canvas.height = Math.round(exactViewport.height);
      canvas.style.width = `${Math.round(cssViewport.width)}px`;
      canvas.style.height = `${Math.round(cssViewport.height)}px`;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const renderContext = {
        canvasContext: context,
        viewport: exactViewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      renderTask.promise.catch(() => {});
    });
  }, [pdfDoc, currentPage, scale, displayScaleTrigger]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const zoomIn = () => {
    setIsFitToWidthActive(false);
    setScale((prev) => {
      const nextStep = ZOOM_STEPS.find((step) => step > prev + 0.001);
      return nextStep !== undefined ? nextStep : 3.00;
    });
  };

  const zoomOut = () => {
    setIsFitToWidthActive(false);
    setScale((prev) => {
      const prevSteps = ZOOM_STEPS.filter((step) => step < prev - 0.001);
      return prevSteps.length > 0 ? prevSteps[prevSteps.length - 1] : 0.75;
    });
  };

  const handleFitWidth = () => {
    if (!pdfDoc) return;
    pdfDoc.getPage(currentPage).then((page: any) => {
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const fitScale = fitToContainerWidth(unscaledViewport.width);
      setScale(fitScale);
      setIsFitToWidthActive(true);
    });
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-stone-400 bg-stone-50">
        <FileText className="h-16 w-16 mb-4 stroke-1 text-stone-300" />
        <p className="font-serif text-base text-stone-600">No document open</p>
        <p className="text-xs text-stone-400 mt-1">Upload a PDF to view pages and highlighted citations</p>
      </div>
    );
  }

  const isMinZoom = scale <= 0.75 + 0.001;
  const isMaxZoom = scale >= 3.00 - 0.001;

  return (
    <div className="flex flex-col h-full bg-stone-200/70 relative select-none overflow-hidden">
      <div className="h-12 bg-white border-b border-stone-200 px-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="h-9 w-9 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg transition-transform duration-fast easing-standard active:scale-[0.96] text-stone-700 hover:bg-stone-100"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono text-stone-900 bg-white rounded-md border border-stone-300 select-none">
            <span className="font-semibold text-stone-900">{currentPage}</span>
            <span className="text-stone-400">/</span>
            <span className="text-stone-600">{totalPages}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className="h-9 w-9 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg transition-transform duration-fast easing-standard active:scale-[0.96] text-stone-700 hover:bg-stone-100"
            aria-label="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={isMinZoom || isLoading}
            className={`h-9 w-9 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg transition-all duration-fast easing-standard active:scale-[0.96] ${
              isMinZoom
                ? "opacity-35 cursor-not-allowed pointer-events-none text-stone-400"
                : "text-stone-600 hover:bg-stone-100"
            }`}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-[11px] font-mono text-stone-700 px-1 min-w-[42px] text-center font-medium">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={isMaxZoom || isLoading}
            className={`h-9 w-9 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg transition-all duration-fast easing-standard active:scale-[0.96] ${
              isMaxZoom
                ? "opacity-35 cursor-not-allowed pointer-events-none text-stone-400"
                : "text-stone-600 hover:bg-stone-100"
            }`}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFitWidth}
            className={`h-9 w-9 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg transition-all duration-fast easing-standard active:scale-[0.96] ${
              isFitToWidthActive
                ? "bg-purple-100 text-purple-700 border border-purple-300 ring-1 ring-purple-300/50 shadow-2xs hover:bg-purple-150"
                : "text-stone-600 hover:bg-stone-100"
            }`}
            title="Fit to Width"
            aria-label="Fit to Width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showNavFeedback && (
        <div className="bg-purple-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md shrink-0 animate-in fade-in slide-in-from-top-2 duration-base easing-decelerate">
          <div className="flex items-center space-x-2 truncate pr-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-purple-200 shrink-0" />
            <span className="truncate">Jumped to Page {currentPage}</span>
          </div>
          <span className="font-mono text-[10px] bg-purple-700/80 px-2 py-0.5 rounded-full border border-purple-500/50 shrink-0">Active Source</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 min-h-0 relative"
      >
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-100/80 backdrop-blur-xs space-y-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="text-xs font-medium">Rendering PDF Page {currentPage}...</span>
          </div>
        )}

        {loadError ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center max-w-md mx-auto my-8 shadow-xs">
            <p className="font-semibold text-sm mb-1">Failed to load PDF</p>
            <p className="text-xs">{loadError}</p>
          </div>
        ) : (
          <div className="min-h-full flex items-start justify-center">
            <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-stone-300 my-2">
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
