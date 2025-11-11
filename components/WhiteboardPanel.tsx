"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hashString, exportWhiteboardAsPNG } from "@/lib/whiteboard-utils";

// Dynamically import tldraw to avoid SSR issues
const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
});

interface WhiteboardPanelProps {
  conversationId: Id<"conversations">;
  onExport?: (blob: Blob) => void;
}

/**
 * Whiteboard component using tldraw
 * Persists drawing state to Convex and can export as PNG
 */
export const WhiteboardPanel = ({
  conversationId,
  onExport,
}: WhiteboardPanelProps) => {
  const [editor, setEditor] = useState<any>(null);
  const [lastSentHash, setLastSentHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convex queries/mutations
  const snapshot = useQuery(api.whiteboard.getSnapshot, { conversationId });
  const saveSnapshot = useMutation(api.whiteboard.saveSnapshot);

  // Debug: Log license key status on mount
  useEffect(() => {
    const licenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE;
    const env = process.env.NODE_ENV;
    console.log("[WhiteboardPanel] Component mounted", {
      hasLicenseKey: !!licenseKey,
      licenseKeyLength: licenseKey?.length || 0,
      licenseKeyPrefix: licenseKey?.substring(0, 10) || "N/A",
      environment: env,
      conversationId,
    });
    
    if (!licenseKey) {
      console.warn("[WhiteboardPanel] ⚠️ TLDRAW_LICENSE key is missing! Whiteboard may not work in production.");
    }

    return () => {
      console.log("[WhiteboardPanel] Component unmounting");
    };
  }, [conversationId]);

  // Debug: Track editor state changes
  useEffect(() => {
    console.log("[WhiteboardPanel] Editor state changed", {
      hasEditor: !!editor,
      editorType: editor?.constructor?.name,
      isLoading,
    });
  }, [editor, isLoading]);

  // Load snapshot when editor is ready
  useEffect(() => {
    if (!editor || !snapshot) {
      if (editor && !snapshot) {
        setIsLoading(false);
      }
      return;
    }

    const loadSnapshotAsync = async () => {
      try {
        const parsed = JSON.parse(snapshot);
        const { loadSnapshot } = await import("tldraw");
        loadSnapshot(editor.store, parsed);
      } catch (error) {
        console.error("[Whiteboard] Failed to load snapshot:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSnapshotAsync();
  }, [editor, snapshot]);

  // Auto-save snapshot to Convex AND export as PNG (debounced)
  useEffect(() => {
    if (!editor) return;

    let timeoutId: NodeJS.Timeout;

    const handleChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          // Import getSnapshot dynamically
          const { getSnapshot } = await import("tldraw");
          const currentSnapshot = getSnapshot(editor.store);
          const snapshotJson = JSON.stringify(currentSnapshot);
          const currentHash = await hashString(JSON.stringify(currentSnapshot));

          await saveSnapshot({
            conversationId,
            snapshot: snapshotJson,
          });

          // Also export as PNG for voice mode
          if (currentHash !== lastSentHash) {
            const blob = await exportWhiteboardAsPNG(editor);

            if (blob) {
              setLastSentHash(currentHash);
              onExport?.(blob);
            }
          }
        } catch (error) {
          console.error("[Whiteboard] Auto-save failed:", error);
        }
      }, 2000); // 2 second debounce
    };

    const unsubscribe = editor.store.listen(handleChange);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [editor, conversationId, saveSnapshot, lastSentHash, onExport]);

  if (isLoading && snapshot === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900">
        <p className="text-zinc-400">Loading whiteboard...</p>
      </div>
    );
  }

  const licenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE;

  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <Tldraw
        licenseKey={licenseKey}
        onMount={(mountedEditor) => {
          console.log("[WhiteboardPanel] Tldraw editor mounted successfully", {
            hasEditor: !!mountedEditor,
            editorType: mountedEditor?.constructor?.name,
            licenseKeyProvided: !!licenseKey,
          });
          setEditor(mountedEditor);
        }}
        onError={(error) => {
          console.error("[WhiteboardPanel] Tldraw error:", error);
        }}
      />
    </div>
  );
};
