// functions/src/assisted-mode/restore-urls.ts

/**
 * Post-process: URL Restoration
 *
 * Replace URL tags with actual GCS URIs using unified global indexing.
 * Extracts MIME type from tags and adds mimeType field to media objects.
 */

/**
 * Convert tag name format to MIME type.
 * Examples:
 * - IMAGE_JPEG → image/jpeg
 * - VIDEO_MP4 → video/mp4
 * - AUDIO_MPEG → audio/mpeg
 */
function tagNameToMimeType(tagName: string): string {
  return tagName.replace("_", "/").toLowerCase();
}

/**
 * Restore URLs in JSON by replacing tags with actual URIs.
 *
 * Tags use unified global indexing with MIME type:
 * - <FIREGEN_IMAGE_JPEG_URI_1/> → extractedUrls[0] + mimeType: "image/jpeg"
 * - <FIREGEN_VIDEO_MP4_URI_2/> → extractedUrls[1] + mimeType: "video/mp4"
 * - <FIREGEN_AUDIO_MPEG_URI_3/> → extractedUrls[2] + mimeType: "audio/mpeg"
 *
 * All tags share the same index space.
 * MIME type is extracted from tag name and added to media objects.
 */
export function restoreUrls(
  jsonWithTags: Record<string, unknown>,
  extractedUrls: string[],
): Record<string, unknown> {
  let restoredString = JSON.stringify(jsonWithTags);

  // Match any FIREGEN tag with MIME type and extract tag number
  // Pattern: <FIREGEN_([A-Z]+_[A-Z0-9]+)_URI_(\d+)/>
  // Examples: <FIREGEN_IMAGE_JPEG_URI_1/>, <FIREGEN_VIDEO_MP4_URI_2/>
  restoredString = restoredString.replace(
    /<FIREGEN_([A-Z]+_[A-Z0-9]+)_URI_(\d+)\/>/g,
    (match, mimeTagName, tagNumber) => {
      const index = parseInt(tagNumber, 10) - 1; // Convert 1-based to 0-based
      const url = extractedUrls[index];

      if (!url) {
        console.warn(`[restore-urls] Tag ${match} not found in extractedUrls (index ${index})`);
        return match; // Return original tag if URL not found
      }

      return url;
    }
  );

  const parsed = JSON.parse(restoredString) as Record<string, unknown>;

  // Add mimeType to media objects recursively
  addMimeTypesFromTags(parsed, jsonWithTags);

  return parsed;
}

/**
 * Recursively add mimeType to media objects that have gcsUri.
 * Extracts MIME type from original tags in jsonWithTags.
 */
function addMimeTypesFromTags(
  restored: unknown,
  original: unknown,
): void {
  if (!restored || typeof restored !== "object") return;
  if (!original || typeof original !== "object") return;

  if (Array.isArray(restored) && Array.isArray(original)) {
    restored.forEach((item, i) => addMimeTypesFromTags(item, original[i]));
    return;
  }

  const restoredRecord = restored as Record<string, unknown>;
  const originalRecord = original as Record<string, unknown>;

  // If this object has gcsUri, check if original had a tag and extract MIME type
  if (typeof restoredRecord.gcsUri === "string" && typeof originalRecord.gcsUri === "string") {
    const tagMatch = originalRecord.gcsUri.match(/<FIREGEN_([A-Z]+_[A-Z0-9]+)_URI_\d+\/>/);
    if (tagMatch) {
      const mimeType = tagNameToMimeType(tagMatch[1]);
      restoredRecord.mimeType = mimeType;
    }
  }

  // If this object has fileUri, check if original had a tag and extract MIME type
  if (typeof restoredRecord.fileUri === "string" && typeof originalRecord.fileUri === "string") {
    const tagMatch = originalRecord.fileUri.match(/<FIREGEN_([A-Z]+_[A-Z0-9]+)_URI_\d+\/>/);
    if (tagMatch) {
      const mimeType = tagNameToMimeType(tagMatch[1]);
      restoredRecord.mimeType = mimeType;
    }
  }

  // Recurse into nested objects
  Object.keys(restoredRecord).forEach(key => {
    addMimeTypesFromTags(restoredRecord[key], originalRecord[key]);
  });
}
