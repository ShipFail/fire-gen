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
 * - <IMAGE_URI_1/> → extractedUrls.images[0]
 * - <VIDEO_URI_1/> → extractedUrls.videos[0]
 * - <AUDIO_URI_1/> → extractedUrls.audio[0]
 */
export function restoreUrls(
  jsonWithTags: Record<string, unknown>,
  extractedUrls: ExtractedUrls,
): Record<string, unknown> {
  const jsonString = JSON.stringify(jsonWithTags);

  let restoredString = jsonString;

  // Restore image URIs
  extractedUrls.images.forEach((uri, index) => {
    const tag = `<IMAGE_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  // Restore video URIs
  extractedUrls.videos.forEach((uri, index) => {
    const tag = `<VIDEO_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  // Restore audio URIs
  extractedUrls.audio.forEach((uri, index) => {
    const tag = `<AUDIO_URI_${index + 1}/>`;
    restoredString = restoredString.replace(new RegExp(tag, "g"), uri);
  });

  return JSON.parse(restoredString) as Record<string, unknown>;
}
