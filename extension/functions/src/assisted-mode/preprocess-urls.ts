// functions/src/assisted-mode/preprocess-urls.ts

/**
 * Pre-process: URL Extraction (Deterministic, No AI)
 *
 * Detects and converts URLs to GCS URI format, tags them in prompt.
 * Uses unified sequential indexing with single flat array storage and deduplication.
 * Tags include MIME type for downstream processing.
 */

import mime from "mime";

export interface UrlExtractionResult {
  taggedPrompt: string;
  extractedUrls: string[];  // Flat array: index (tag number - 1) → URL
}

/**
 * Convert MIME type to tag name format.
 * Examples:
 * - image/jpeg → IMAGE_JPEG
 * - video/mp4 → VIDEO_MP4
 * - audio/mpeg → AUDIO_MPEG
 */
function mimeTypeToTagName(mimeType: string): string {
  return mimeType.replace("/", "_").toUpperCase();
}

/**
 * Get MIME type from URL using mime package.
 * Throws error if MIME type cannot be determined.
 */
function getMimeType(url: string): string {
  const mimeType = mime.getType(url);
  if (!mimeType) {
    throw new Error(`Cannot determine MIME type for URL: ${url}`);
  }
  return mimeType;
}

/**
 * Extract URLs from prompt and replace with tags.
 *
 * Processing priority (most specific first):
 * 1. Firebase Storage URLs → gs://bucket/path
 * 2. GCS API URLs (https://storage.googleapis.com/...) → gs://bucket/path
 * 3. GCS URIs (gs://...) → keep as-is
 * 4. Generic HTTPS URLs with media extensions → keep as-is
 *
 * Deduplication: Same URL gets same tag (reused)
 * Unified indexing: Sequential numbering across all media types (1, 2, 3...)
 * Single array storage: extractedUrls[tagNumber - 1] = URL
 *
 * Tags format (includes MIME type):
 * - <FIREGEN_IMAGE_JPEG_URI_1/>, <FIREGEN_VIDEO_MP4_URI_2/>, <FIREGEN_AUDIO_MPEG_URI_3/>, ...
 */
export function preprocessUrls(prompt: string): UrlExtractionResult {
  const extractedUrls: string[] = [];  // Flat array indexed by tag number
  let taggedPrompt = prompt;
  const urlToTag = new Map<string, string>(); // Deduplication map

  /**
   * Tag a URL. If URL seen before, reuse existing tag.
   * Otherwise, create new tag and track it.
   */
  function tagUrl(gcsUri: string): string {
    // Check if URL already tagged
    const existingTag = urlToTag.get(gcsUri);
    if (existingTag) {
      return existingTag; // Reuse same tag for duplicate URL
    }

    // New URL - create tag with MIME type and global index (1-based)
    const mimeType = getMimeType(gcsUri);
    const mimeTagName = mimeTypeToTagName(mimeType);
    const tagNumber = extractedUrls.length + 1; // Next index (1-based)
    const tag = `<FIREGEN_${mimeTagName}_URI_${tagNumber}/>`;

    // Track URL → tag mapping
    urlToTag.set(gcsUri, tag);

    // Store URL at index (tagNumber - 1)
    extractedUrls.push(gcsUri);

    return tag;
  }

  // 1. Firebase Storage URLs (highest priority - most specific)
  // Example: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Ffile.jpg?alt=media&token=...
  taggedPrompt = taggedPrompt.replace(
    /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^\/]+)\/o\/([^?]+)\?[^\s]*/g,
    (match, bucket, encodedPath) => {
      const path = decodeURIComponent(encodedPath);
      return tagUrl(`gs://${bucket}/${path}`);
    }
  );

  // 2. GCS API URLs (second priority)
  // Example: https://storage.googleapis.com/bucket/path/file.mp4
  taggedPrompt = taggedPrompt.replace(
    /https:\/\/storage\.googleapis\.com\/([^\/\s]+)\/([^\s]+)/g,
    (match, bucket, path) => tagUrl(`gs://${bucket}/${path}`)
  );

  // 3. GCS URIs (already in correct format)
  // Example: gs://bucket/path/file.png
  taggedPrompt = taggedPrompt.replace(
    /gs:\/\/[^\s]+/g,
    (match) => tagUrl(match)
  );

  // 4. Generic HTTPS URLs with media extensions (lowest priority - catch-all)
  // Example: https://example.com/random/image.jpg
  // These are NOT converted to gs:// - they stay as HTTPS URLs
  taggedPrompt = taggedPrompt.replace(
    /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|aac|ogg)/gi,
    (match) => tagUrl(match) // Keep as-is (HTTPS), don't convert to gs://
  );

  return {taggedPrompt, extractedUrls};
}
