// functions/src/assisted-mode/restore-urls.ts

/**
 * Post-process: URL Restoration
 *
 * Replace URL tags with actual GCS URIs.
 */

import type {ExtractedUrls} from "./preprocess-urls.js";

/**
 * Restore URLs in JSON by replacing tags with actual URIs.
 *
 * Tags:
 * - <FIREGEN_IMAGE_URI_1/> → extractedUrls.images[0]
 * - <FIREGEN_VIDEO_URI_1/> → extractedUrls.videos[0]
 * - <FIREGEN_AUDIO_URI_1/> → extractedUrls.audio[0]
 */
export function restoreUrls(
  jsonWithTags: Record<string, unknown>,
  extractedUrls: ExtractedUrls,
): Record<string, unknown> {
  const jsonString = JSON.stringify(jsonWithTags);

  let restoredString = jsonString;

  // Restore image URIs
  extractedUrls.images.forEach((uri, index) => {
    const tag = `<FIREGEN_IMAGE_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  // Restore video URIs
  extractedUrls.videos.forEach((uri, index) => {
    const tag = `<FIREGEN_VIDEO_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  // Restore audio URIs
  extractedUrls.audio.forEach((uri, index) => {
    const tag = `<FIREGEN_AUDIO_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  return JSON.parse(restoredString) as Record<string, unknown>;
}
