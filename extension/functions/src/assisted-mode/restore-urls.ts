// functions/src/assisted-mode/restore-urls.ts

/**
 * Post-process: URL Restoration
 *
 * Replace URL tags with actual GCS URIs using unified global indexing.
 */

/**
 * Restore URLs in JSON by replacing tags with actual URIs.
 *
 * Tags use unified global indexing:
 * - <FIREGEN_IMAGE_URI_1/> → extractedUrls[0]
 * - <FIREGEN_VIDEO_URI_2/> → extractedUrls[1]
 * - <FIREGEN_AUDIO_URI_3/> → extractedUrls[2]
 *
 * All tags (IMAGE/VIDEO/AUDIO) share the same index space,
 * so we can extract the tag number and look up directly in the flat array.
 */
export function restoreUrls(
  jsonWithTags: Record<string, unknown>,
  extractedUrls: string[],
): Record<string, unknown> {
  let restoredString = JSON.stringify(jsonWithTags);

  // Match any FIREGEN tag and extract the tag number
  // Pattern: <FIREGEN_(IMAGE|VIDEO|AUDIO)_URI_(\d+)/>
  restoredString = restoredString.replace(
    /<FIREGEN_(IMAGE|VIDEO|AUDIO)_URI_(\d+)\/>/g,
    (match, mediaType, tagNumber) => {
      const index = parseInt(tagNumber, 10) - 1; // Convert 1-based to 0-based
      const url = extractedUrls[index];

      if (!url) {
        console.warn(`[restore-urls] Tag ${match} not found in extractedUrls (index ${index})`);
        return match; // Return original tag if URL not found
      }

      return url;
    }
  );

  return JSON.parse(restoredString) as Record<string, unknown>;
}
