// functions/src/ai-request-analyzer/url-utils.ts

import {replaceUrlsWithTags, restoreAndCleanUrls, type UrlReplacement} from "./storage-url.js";

/**
 * Preprocess ALL contexts: replace URLs with semantic XML tags.
 *
 * Uses simple category-based tags (e.g., <VIDEO_URI_1/>, <IMAGE_URI_2/>)
 * so the AI can distinguish between video, image, and audio URLs.
 *
 * This prevents URLs from:
 * - Wasting tokens in AI calls (long filenames)
 * - Confusing hint detection
 * - Affecting model selection
 * - Being misclassified (video URL in imageGcsUri field)
 *
 * @param contexts - Array of context strings (prompt + contexts from previous steps)
 * @returns Processed contexts with URLs replaced by semantic tags, and replacements metadata
 */
export function preprocessAllUrls(contexts: string[]): {
  processedContexts: string[];
  replacements: UrlReplacement[];
} {
  // Collect all replacements from all contexts
  const allReplacements: UrlReplacement[] = [];

  const processedContexts = contexts.map((context) => {
    const {processedPrompt, replacements} = replaceUrlsWithTags(context);
    allReplacements.push(...replacements);
    return processedPrompt;
  });

  return {processedContexts, replacements: allReplacements};
}

/**
 * Restore URLs in AI-generated request and prompt.
 *
 * Process:
 * 1. Replace XML tags in request fields with actual gs:// URIs
 * 2. Remove used tags from prompt
 * 3. Restore unused tags back to original URLs in prompt
 *
 * @param aiRequest - Request object from AI (may contain XML tags)
 * @param aiPrompt - Prompt from AI (may contain XML tags)
 * @param replacements - Replacement metadata from preprocessAllUrls
 * @returns Cleaned request and prompt with real gs:// URIs
 */
export function restoreUrlsInRequest(
  aiRequest: any,
  aiPrompt: string,
  replacements: UrlReplacement[]
): {
  cleanedRequest: any;
  cleanedPrompt: string;
} {
  return restoreAndCleanUrls(aiRequest, aiPrompt, replacements);
}

/**
 * Restore URLs in plain text by replacing XML tags with original URLs.
 *
 * Used for restoring URLs in non-request text (e.g., reasoning, error messages).
 *
 * @param text - Text containing URL placeholders
 * @param replacements - Replacement metadata from preprocessAllUrls
 * @returns Text with URLs restored
 */
export function restoreUrlsInText(
  text: string,
  replacements: UrlReplacement[]
): string {
  let restored = text;

  for (const replacement of replacements) {
    // Replace all occurrences of the placeholder with original URL
    restored = restored.replace(
      new RegExp(replacement.placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      replacement.original
    );
  }

  return restored;
}
