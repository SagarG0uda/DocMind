import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SystemStatus } from "@/types";
import { updateSystemConfig } from "@/lib/api";
import { Key, Sparkles, Check, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemStatus: SystemStatus | null;
  onConfigUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemStatus,
  onConfigUpdated,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [modelName, setModelName] = useState("nex-agi/nex-n2.5-pro:free");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (systemStatus) {
      setBaseUrl(systemStatus.base_url || "https://openrouter.ai/api/v1");
      setModelName(systemStatus.model_name || "nex-agi/nex-n2.5-pro:free");
    }
  }, [systemStatus]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateSystemConfig({
        ox_alpha_api_key: apiKey,
        ox_alpha_base_url: baseUrl,
        ox_alpha_model_name: modelName,
      });
      setSuccessMessage("Settings updated successfully!");
      onConfigUpdated();
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>LLM Engine Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure Ox Alpha API credentials for generative multi-chunk answer synthesis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-700 block">
              Ox Alpha API Key
            </label>
            <div className="relative">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={systemStatus?.ox_alpha_configured ? "••••••••••••••••" : "Enter OX_ALPHA_API_KEY"}
                className="font-mono text-xs pr-8"
              />
              <Key className="h-4 w-4 text-stone-400 absolute right-2.5 top-3.5" />
            </div>
            <p className="text-[11px] text-stone-500">
              When empty, DocMind runs in local extractive RAG fallback mode.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-700 block">
              API Base URL
            </label>
            <Input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-stone-700 block">
              Model Identifier
            </label>
            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="nex-agi/nex-n2.5-pro:free"
              className="font-mono text-xs"
            />
          </div>

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-800">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
