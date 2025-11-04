import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  console.log("[OCR DEBUG - Convex] generateUploadUrl called");
  const uploadUrl = await ctx.storage.generateUploadUrl();
  console.log("[OCR DEBUG - Convex] ✅ Upload URL generated:", uploadUrl);
  return uploadUrl;
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    console.log(
      "[OCR DEBUG - Convex] getImageUrl called for storageId:",
      args.storageId,
    );
    const url = await ctx.storage.getUrl(args.storageId);
    if (url) {
      console.log(
        "[OCR DEBUG - Convex] ✅ Image URL retrieved:",
        url.substring(0, 100) + "...",
      );
    } else {
      console.error(
        "[OCR DEBUG - Convex] ❌ Image URL is null for storageId:",
        args.storageId,
      );
    }
    return url;
  },
});

export const getImage = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    console.log(
      "[OCR DEBUG - Convex] getImage called for storageId:",
      args.storageId,
    );
    const blob = await ctx.storage.get(args.storageId);
    if (blob) {
      console.log(
        "[OCR DEBUG - Convex] ✅ Image blob retrieved, size:",
        blob.size,
        "bytes",
      );
    } else {
      console.error(
        "[OCR DEBUG - Convex] ❌ Image blob is null for storageId:",
        args.storageId,
      );
    }
    return blob;
  },
});
