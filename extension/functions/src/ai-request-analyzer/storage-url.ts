/**
 * Storage URL Utilities
 *
 * Converts various Google Storage URL formats to canonical gs:// URIs,
 * replaces URLs with semantic XML tags for AI processing,
 * and restores/cleans URLs after AI analysis.
 */

import mime from "mime";

/**
 * URL replacement metadata
 */
export interface UrlReplacement {
  original: string; // Original URL from user prompt
  gcsUri: string; // Converted gs:// URI
  mimeType: string; // Detected MIME type (e.g., "video/mp4")
  category: "video" | "image" | "audio" | "other"; // Broad category
  tag: string; // Tag name (e.g., "GS_VIDEO_URI_REF_1")
  placeholder: string; // Full XML tag (e.g., "<GS_VIDEO_URI_REF_1 mimeType='video/mp4'/>")
}

/**
 * Converts various Google Storage URL formats to canonical gs:// URI
 *
 * Supported formats:
 * 1. gs://bucket/path (already canonical)
 * 2. https://storage.googleapis.com/bucket/path
 * 3. https://firebasestorage.googleapis.com/v0/b/bucket/o/path?alt=media&token=...
 * 4. Signed URLs with query parameters
 *
 * @throws Error if URL format is not recognized
 */
export function toGcsUri(url: string): string {
  // Already a GCS URI
  if (url.startsWith("gs://")) {
    return url;
  }

  // storage.googleapis.com URLs (including signed URLs)
  const storageMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/?]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    const [, bucket, path] = storageMatch;
    return `gs://${bucket}/${path}`;
  }

  // Firebase Storage URLs
  const firebaseMatch = url.match(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/(.+?)(?:\?|$)/);
  if (firebaseMatch) {
    const [, bucket, encodedPath] = firebaseMatch;
    const path = decodeURIComponent(encodedPath);
    return `gs://${bucket}/${path}`;
  }

  throw new Error(`Unsupported storage URL format: ${url}`);
}

/**
 * Extracts all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  // Match http(s):// URLs and gs:// URIs
  const urlRegex = /(?:https?:\/\/[^\s]+|gs:\/\/[^\s]+)/gi;
  return text.match(urlRegex) || [];
}

/**
 * Detect MIME type from URL or file extension
 *
 * Uses browser-media-mime-type library which returns video/mp4 for .mp4 files.
 */
export function detectMimeType(url: string): string {
  // Extract path from URL (handle query params, encoding, etc.)
  let path: string;

  if (url.startsWith("gs://")) {
    // gs://bucket/path/file.ext
    path = url.substring(5); // Remove "gs://"
  } else if (url.includes("firebasestorage.googleapis.com")) {
    // Extract from Firebase Storage URL
    const match = url.match(/\/o\/(.+?)(?:\?|$)/);
    if (match) {
      path = decodeURIComponent(match[1]);
    } else {
      return "application/octet-stream";
    }
  } else {
    // Regular URL
    path = url;
  }

  // Extract extension
  const extensionMatch = path.match(/\.([^./?]+)(?:\?|$)/);
  if (!extensionMatch) {
    return "application/octet-stream";
  }

  const extension = extensionMatch[1].toLowerCase();
  const mimeType = mime.getType(extension);

  return mimeType || "application/octet-stream";
}

/**
 * Categorize MIME type into broad categories for AI processing
 */
export function getMimeCategory(mimeType: string): "video" | "image" | "audio" | "other" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";

  return "other";
}

/**
 * Replace URLs in prompt with semantic XML tags
 *
 * This makes it clear to the AI what type of resource each URL is,
 * without polluting the prompt with long filenames.
 *
 * @param prompt - User prompt with URLs
 * @returns Processed prompt and replacement metadata
 */
export function replaceUrlsWithTags(prompt: string): {
  processedPrompt: string;
  replacements: UrlReplacement[];
} {
  const urls = extractUrls(prompt);
  const replacements: UrlReplacement[] = [];

  // Group by category for sequential numbering
  const counters = {video: 0, image: 0, audio: 0, other: 0};

  let processedPrompt = prompt;

  for (const url of urls) {
    try {
      const gcsUri = toGcsUri(url);
      const mimeType = detectMimeType(url);
      const category = getMimeCategory(mimeType);

      const index = ++counters[category];
      const tag = `GS_${category.toUpperCase()}_URI_REF_${index}`;
      const placeholder = `<${tag} mimeType='${mimeType}'/>`;

      replacements.push({
        original: url,
        gcsUri,
        mimeType,
        category,
        tag,
        placeholder,
      });

      // Replace URL with placeholder
      processedPrompt = processedPrompt.replace(url, placeholder);
    } catch (error) {
      // If URL conversion fails, leave it as-is
      // This allows the AI to potentially handle it or report an error
      continue;
    }
  }

  return {processedPrompt, replacements};
}

/**
 * Restore and clean URLs after AI processing
 *
 * Process:
 * 1. Replace placeholder tags in request fields with actual gs:// URIs
 * 2. Remove placeholder tags from prompt if they're used in request fields
 * 3. Restore original URLs for placeholders NOT used in request fields
 * 4. Clean up extra whitespace
 *
 * @param aiRequest - Request object from AI (may contain placeholder tags)
 * @param aiPrompt - Prompt from AI (may contain placeholder tags)
 * @param replacements - Replacement metadata from replaceUrlsWithTags
 * @returns Cleaned request and prompt with real gs:// URIs
 */
export function restoreAndCleanUrls(
  aiRequest: any,
  aiPrompt: string,
  replacements: UrlReplacement[]
): {
  cleanedRequest: any;
  cleanedPrompt: string;
} {
  const cleanedRequest = {...aiRequest};

  // Fields that may contain URL placeholders
  const fieldsToCheck = [
    "imageGcsUri",
    "videoGcsUri",
    "lastFrameGcsUri",
    "referenceSubjectImages",
  ];

  const usedTags = new Set<string>();

  // Step 1: Replace placeholders in request fields with actual gs:// URIs
  for (const field of fieldsToCheck) {
    if (field === "referenceSubjectImages" && Array.isArray(cleanedRequest[field])) {
      cleanedRequest[field] = cleanedRequest[field].map((value: string) => {
        const replacement = findReplacementByPlaceholder(value, replacements);
        if (replacement) {
          usedTags.add(replacement.tag);
          return replacement.gcsUri; // Convert to gs:// format
        }
        return value;
      });
    } else if (cleanedRequest[field]) {
      const replacement = findReplacementByPlaceholder(cleanedRequest[field], replacements);
      if (replacement) {
        usedTags.add(replacement.tag);
        cleanedRequest[field] = replacement.gcsUri; // Convert to gs:// format
      }
    }
  }

  // Step 2 & 3: Process prompt
  let cleanedPrompt = aiPrompt;

  for (const replacement of replacements) {
    if (usedTags.has(replacement.tag)) {
      // This URL is in request parameters - remove from prompt
      cleanedPrompt = cleanedPrompt.replace(replacement.placeholder, "");
    } else {
      // This URL is NOT in request parameters - restore original URL
      cleanedPrompt = cleanedPrompt.replace(replacement.placeholder, replacement.original);
    }
  }

  // Step 4: Clean up extra whitespace
  cleanedPrompt = cleanedPrompt
    .replace(/\s+/g, " ") // Multiple spaces → single space
    .replace(/\s+([.,!?;:])/g, "$1") // Space before punctuation
    .trim();

  return {cleanedRequest, cleanedPrompt};
}

/**
 * Find replacement by placeholder tag
 */
function findReplacementByPlaceholder(
  value: string,
  replacements: UrlReplacement[]
): UrlReplacement | undefined {
  return replacements.find((r) =>
    value.includes(r.placeholder) || value.includes(`<${r.tag}`)
  );
}
