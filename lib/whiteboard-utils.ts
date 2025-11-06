import { createSHA256 } from "hash-wasm";

/**
 * Generate SHA-256 hash of a string
 */
export const hashString = async (str: string): Promise<string> => {
  const sha256 = await createSHA256();
  sha256.init();
  sha256.update(str);
  return sha256.digest("hex");
};

/**
 * Convert a Blob to a data URL (base64)
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Export tldraw editor content as PNG
 */
export const exportWhiteboardAsPNG = async (
  editor: any,
  options?: {
    scale?: number;
    background?: boolean;
  },
): Promise<Blob | null> => {
  try {
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());

    if (shapeIds.length === 0) {
      console.log("[Whiteboard] No shapes to export");
      return null;
    }

    const result = await editor.toImage(shapeIds, {
      format: "png",
      background: options?.background ?? true,
      scale: options?.scale ?? 2, // Higher res for Claude Vision
    });

    if (!result?.blob) {
      console.warn("[Whiteboard] Export returned no blob");
      return null;
    }

    return result.blob;
  } catch (error) {
    console.error("[Whiteboard] Export error:", error);
    return null;
  }
};

/**
 * Resize an image blob to fit within WebRTC data channel limits
 * WebRTC data channels typically support 16-256KB messages
 * Target: ~100KB base64 (75KB binary) for safe transmission
 */
export const resizeImageForWebRTC = async (
  blob: Blob,
  maxWidth: number = 800,
  maxHeight: number = 800,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate scaled dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Create canvas and resize
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob);
          } else {
            reject(new Error("Failed to create resized blob"));
          }
        },
        "image/jpeg", // JPEG for better compression
        0.8, // 80% quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};
