import React from "react";

interface SplitPaneLayoutProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
}

export const SplitPaneLayout: React.FC<SplitPaneLayoutProps> = ({ leftPane, rightPane }) => {
  const [activeTab, setActiveTab] = React.useState<"pdf" | "chat">("chat");
  const [focusedPane, setFocusedPane] = React.useState<"pdf" | "chat">("chat");

  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-[#faf9f8] flex flex-col lg:flex-row">
      <div className="lg:hidden flex border-b border-stone-200 bg-white px-3 py-1.5 shrink-0 justify-center space-x-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("pdf");
            setFocusedPane("pdf");
          }}
          className={`flex-1 max-w-[200px] py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-fast ease-out active:scale-[0.98] min-h-[44px] flex items-center justify-center space-x-1.5 ${
            activeTab === "pdf"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
          aria-label="Show PDF Document View"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            shapeRendering="geometricPrecision"
          >
            <path
              d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>PDF Document</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("chat");
            setFocusedPane("chat");
          }}
          className={`flex-1 max-w-[200px] py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-fast ease-out active:scale-[0.98] min-h-[44px] flex items-center justify-center space-x-1.5 ${
            activeTab === "chat"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
          aria-label="Show Chat and Citations"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            shapeRendering="geometricPrecision"
          >
            <path
              d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Chat & Citations</span>
        </button>
      </div>

      <div
        onClick={() => setFocusedPane("pdf")}
        className={`w-full lg:w-1/2 h-full border-b lg:border-b-0 overflow-hidden flex flex-col relative transition-shadow duration-200 ${
          focusedPane === "pdf"
            ? "lg:z-20 lg:shadow-[8px_0_24px_-4px_rgba(0,0,0,0.1)] bg-stone-100/90"
            : "lg:z-0 bg-stone-100/60"
        } ${activeTab === "pdf" ? "flex" : "hidden lg:flex"}`}
      >
        {leftPane}
      </div>
      <div
        onClick={() => setFocusedPane("chat")}
        className={`w-full lg:w-1/2 h-full overflow-hidden flex flex-col bg-white relative transition-shadow duration-200 border-l border-stone-200/80 shadow-sm ${
          focusedPane === "chat"
            ? "lg:z-20 lg:shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)]"
            : "lg:z-10 lg:shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
        } ${activeTab === "chat" ? "flex" : "hidden lg:flex"}`}
      >
        {rightPane}
      </div>
    </div>
  );
};
