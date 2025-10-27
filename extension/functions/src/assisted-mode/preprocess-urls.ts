// functions/src/assisted-mode/preprocess-urls.ts

/**
 * Pre-process: URL Extraction (Deterministic, No AI)
 *
 * Detects and converts URLs to GCS URI format, tags them in prompt.
 * Uses unified sequential indexing with single flat array storage and deduplication.
 */

export interface UrlExtractionResult {
  taggedPrompt: string;
  extractedUrls: string[];  // Flat array: index (tag number - 1) → URL
}

/**
 * Detect media type from file extension or URL pattern.
 * Defaults to 'image' if no extension matches.
 */
function getMediaType(url: string): "image" | "video" | "audio" {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return "image";
  if (/\.(mp4|mov|avi|webm)$/i.test(url)) return "video";
  if (/\.(mp3|wav|aac|ogg)$/i.test(url)) return "audio";
  return "image"; // Default to image
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
 * Tags format:
 * - <FIREGEN_IMAGE_URI_1/>, <FIREGEN_VIDEO_URI_2/>, <FIREGEN_AUDIO_URI_3/>, ...
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

    // New URL - create tag with global index (1-based)
    const mediaType = getMediaType(gcsUri);
    const tagNumber = extractedUrls.length + 1; // Next index (1-based)
    const tag = `<FIREGEN_${mediaType.toUpperCase()}_URI_${tagNumber}/>`;

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
