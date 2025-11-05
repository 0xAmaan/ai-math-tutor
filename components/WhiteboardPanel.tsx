"use client";

import { useEffect, useState, useCallback } from "react";
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
        // Import loadSnapshot dynamically
        const { loadSnapshot } = await import("tldraw");
        loadSnapshot(editor.store, parsed);
        console.log("[Whiteboard] Loaded snapshot from database");
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

          console.log("[Whiteboard] Auto-saved snapshot");

          // Also export as PNG for voice mode
          console.log("[Whiteboard] Checking if export needed...");
          console.log("[Whiteboard] Current hash:", currentHash);
          console.log("[Whiteboard] Last sent hash:", lastSentHash);
          console.log("[Whiteboard] Hash match:", currentHash === lastSentHash);

          if (currentHash !== lastSentHash) {
            console.log("[Whiteboard] Exporting PNG...");
            const blob = await exportWhiteboardAsPNG(editor);
            console.log("[Whiteboard] Export result:", blob ? `${blob.size} bytes` : "null");

            if (blob) {
              setLastSentHash(currentHash);
              console.log("[Whiteboard] Exported PNG:", blob.size, "bytes");
              console.log("[Whiteboard] Calling onExport callback:", !!onExport);
              onExport?.(blob);
              console.log("[Whiteboard] onExport called");
            }
          } else {
            console.log("[Whiteboard] Skipping export - content unchanged");
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

  /**
   * Export whiteboard as PNG if content has changed
   */
  const exportIfChanged = useCallback(async (): Promise<Blob | null> => {
    if (!editor) return null;

    try {
      // Import getSnapshot dynamically
      const { getSnapshot } = await import("tldraw");
      const currentSnapshot = getSnapshot(editor.store);
      const currentHash = await hashString(JSON.stringify(currentSnapshot));

      // No changes since last export
      if (currentHash === lastSentHash) {
        console.log("[Whiteboard] No changes detected, skipping export");
        return null;
      }

      // Export as PNG
      const blob = await exportWhiteboardAsPNG(editor);

      if (blob) {
        setLastSentHash(currentHash);
        console.log("[Whiteboard] Exported PNG:", blob.size, "bytes");
        onExport?.(blob);
        return blob;
      }

      return null;
    } catch (error) {
      console.error("[Whiteboard] Export failed:", error);
      return null;
    }
  }, [editor, lastSentHash, onExport]);

  // Expose export function to parent
  useEffect(() => {
    if (editor && onExport) {
      // Store export function on window for voice mode to access
      (window as any).__whiteboardExport = exportIfChanged;
    }
  }, [editor, exportIfChanged, onExport]);

  if (isLoading && snapshot === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900">
        <p className="text-zinc-400">Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <Tldraw
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE}
        onMount={(mountedEditor) => {
          setEditor(mountedEditor);
          console.log("[Whiteboard] Editor mounted");
        }}
      />
    </div>
  );
};
