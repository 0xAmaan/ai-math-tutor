"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, memo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { hashString, blobToDataUrl } from "@/lib/whiteboard-utils";
import { X } from "lucide-react";
import type { Editor } from "tldraw";

// Dynamically import Tldraw to avoid SSR issues
// IMPORTANT: This must be outside the component to avoid recreating on every render
const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-zinc-500">
      Loading whiteboard...
    </div>
  ),
});

interface ChatWhiteboardPanelProps {
  conversationId: string;
  onClose: () => void;
}

export interface ChatWhiteboardPanelRef {
  exportIfChanged: () => Promise<{ blob: Blob; dataUrl: string } | null>;
}

export const ChatWhiteboardPanel = forwardRef<ChatWhiteboardPanelRef, ChatWhiteboardPanelProps>(
  ({ conversationId, onClose }, ref) => {
    const [editor, setEditor] = useState<Editor | null>(null);
    const lastSentHashRef = useRef<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasLoadedInitialSnapshotRef = useRef(false);
    const isUserEditingRef = useRef(false);
    const isSavingRef = useRef(false);

    // Store the initial snapshot in a ref to prevent re-renders from query updates
    const initialSnapshotRef = useRef<string | null>(null);

    // Debug: Log license key status on mount
    useEffect(() => {
      const licenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE;
      const env = process.env.NODE_ENV;
      console.log("[ChatWhiteboardPanel] Component mounted", {
        hasLicenseKey: !!licenseKey,
        licenseKeyLength: licenseKey?.length || 0,
        licenseKeyPrefix: licenseKey?.substring(0, 10) || "N/A",
        environment: env,
        conversationId,
      });
      
      if (!licenseKey) {
        console.warn("[ChatWhiteboardPanel] ⚠️ TLDRAW_LICENSE key is missing! Whiteboard may not work in production.");
      }

      return () => {
        console.log("[ChatWhiteboardPanel] Component unmounting");
      };
    }, [conversationId]);

    const snapshotFromDB = useQuery(api.chatWhiteboard.getWhiteboardState, {
      conversationId: conversationId as Id<"conversations">,
    });

    // Store the first snapshot we receive, ignore subsequent updates
    // This prevents the Convex query update cycle from triggering re-renders
    if (snapshotFromDB && !initialSnapshotRef.current && !hasLoadedInitialSnapshotRef.current) {
      initialSnapshotRef.current = snapshotFromDB;
    }

    const saveSnapshotMutation = useMutation(api.chatWhiteboard.upsertWhiteboardState);

    // Debug: Track editor state changes
    useEffect(() => {
      console.log("[ChatWhiteboardPanel] Editor state changed", {
        hasEditor: !!editor,
        editorType: editor?.constructor?.name,
        conversationId,
      });
      
      // Warn if editor becomes null unexpectedly
      if (editor === null && hasLoadedInitialSnapshotRef.current) {
        console.warn("[ChatWhiteboardPanel] ⚠️ Editor became null after initialization!", {
          conversationId,
          isUserEditing: isUserEditingRef.current,
          isSaving: isSavingRef.current,
        });
      }
    }, [editor, conversationId]);

    // Reset refs when conversation changes
    useEffect(() => {
      hasLoadedInitialSnapshotRef.current = false;
      isUserEditingRef.current = false;
      lastSentHashRef.current = null;
      isSavingRef.current = false;
      initialSnapshotRef.current = null;
      setEditor(null); // Force editor reset on conversation change
    }, [conversationId]);

    // Load snapshot from Convex ONLY on initial mount (not on every DB update)
    useEffect(() => {
      // CRITICAL: Use initialSnapshotRef instead of snapshotFromDB to prevent re-loading on updates
      if (!editor || !initialSnapshotRef.current || hasLoadedInitialSnapshotRef.current) return;

      const loadSnapshotAsync = async () => {
        try {
          const parsed = JSON.parse(initialSnapshotRef.current!);
          const { loadSnapshot } = await import("tldraw");
          loadSnapshot(editor.store, parsed);
          hasLoadedInitialSnapshotRef.current = true;
          console.log("[ChatWhiteboard] Initial snapshot loaded");
        } catch (error) {
          console.error("[ChatWhiteboard] Failed to load snapshot:", error);
          hasLoadedInitialSnapshotRef.current = true; // Mark as attempted even if failed
        }
      };

      loadSnapshotAsync();
      // IMPORTANT: Only depend on editor, NOT snapshotFromDB
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    // Save snapshot to Convex on change (debounced)
    useEffect(() => {
      if (!editor) return;

      const handleChange = () => {
        // Mark that user is actively editing
        isUserEditingRef.current = true;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            // Set saving flag to prevent reload during save
            isSavingRef.current = true;

            // Import getSnapshot dynamically
            const { getSnapshot } = await import("tldraw");
            const currentSnapshot = getSnapshot(editor.store);
            const snapshotJson = JSON.stringify(currentSnapshot);

            await saveSnapshotMutation({
              conversationId: conversationId as Id<"conversations">,
              snapshot: snapshotJson,
            });

            console.log("[ChatWhiteboard] Snapshot saved to Convex");

            // Reset flags after save completes
            isUserEditingRef.current = false;
            isSavingRef.current = false;
          } catch (error) {
            console.error("[ChatWhiteboard] Failed to save snapshot:", error);
            isUserEditingRef.current = false;
            isSavingRef.current = false;
          }
        }, 2000); // Save 2 seconds after last change
      };

      // Listen to store changes
      const unsubscribe = editor.store.listen(handleChange);

      return () => {
        unsubscribe();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, [editor, conversationId, saveSnapshotMutation]);

    // Expose exportIfChanged method via ref
    useImperativeHandle(
      ref,
      () => ({
        exportIfChanged: async () => {
          if (!editor) return null;

          try {
            // Import getSnapshot dynamically
            const { getSnapshot } = await import("tldraw");
            const currentSnapshot = getSnapshot(editor.store);
            const currentHash = await hashString(JSON.stringify(currentSnapshot));

            // Check if whiteboard has changed since last send
            if (currentHash === lastSentHashRef.current) {
              return null; // No changes, don't export
            }

            // Update the last sent hash
            lastSentHashRef.current = currentHash;

            // Get all shape IDs on current page
            const shapeIds = Array.from(editor.getCurrentPageShapeIds());

            if (shapeIds.length === 0) {
              return null; // Nothing to export
            }

            // Export as PNG
            const result = await editor.getSvgString(shapeIds, {
              background: true,
              padding: 16,
            });

            if (!result) {
              return null;
            }

            // Convert SVG to PNG blob
            const svg = result.svg;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            return new Promise<{ blob: Blob; dataUrl: string } | null>((resolve) => {
              img.onload = async () => {
                canvas.width = img.width * 2; // 2x scale for better quality
                canvas.height = img.height * 2;
                ctx?.scale(2, 2);
                ctx?.drawImage(img, 0, 0);

                canvas.toBlob(async (blob) => {
                  if (!blob) {
                    resolve(null);
                    return;
                  }

                  const dataUrl = await blobToDataUrl(blob);
                  resolve({ blob, dataUrl });
                }, "image/png");
              };

              img.onerror = () => resolve(null);
              img.src = "data:image/svg+xml;base64," + btoa(svg);
            });
          } catch (error) {
            console.error("[ChatWhiteboard] Failed to export:", error);
            return null;
          }
        },
      }),
      [editor]
    );

    return (
      <div className="relative w-full h-[450px] border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
        {/* Header with close button */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-zinc-800/90 backdrop-blur-sm border-b border-zinc-700">
          <span className="text-sm font-medium text-zinc-300">Whiteboard</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
            aria-label="Close whiteboard"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tldraw canvas */}
        <div className="h-full pt-10">
          <Tldraw
            key={conversationId} // Stable key tied to conversation prevents unwanted remounts
            licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE}
            onMount={(mountedEditor) => {
              console.log("[ChatWhiteboardPanel] Tldraw editor mounted successfully", {
                hasEditor: !!mountedEditor,
                editorType: mountedEditor?.constructor?.name,
                licenseKeyProvided: !!process.env.NEXT_PUBLIC_TLDRAW_LICENSE,
                conversationId,
              });
              setEditor(mountedEditor);
            }}
            onError={(error) => {
              console.error("[ChatWhiteboardPanel] Tldraw error:", error, {
                conversationId,
                hasLicenseKey: !!process.env.NEXT_PUBLIC_TLDRAW_LICENSE,
              });
            }}
            // Remove persistenceKey to avoid dual persistence conflict
            // We're handling persistence via Convex instead of localStorage
          />
        </div>
      </div>
    );
  }
);

ChatWhiteboardPanel.displayName = "ChatWhiteboardPanel";
