// functions/src/ai-request-analyzer/url-utils.ts

import {replaceUrisWithSemanticTags, restoreSemanticTagsToUris, type UriReplacement} from "./storage-url.js";

/**
 * Preprocess ALL contexts: replace URIs with semantic XML tags.
 *
 * Uses simple category-based tags (e.g., <VIDEO_URI_1/>, <IMAGE_URI_2/>)
 * so the AI can distinguish between video, image, and audio URIs.
 *
 * This prevents URIs from:
 * - Wasting tokens in AI calls (long filenames)
 * - Confusing hint detection
 * - Affecting model selection
 * - Being misclassified (video URI in imageGcsUri field)
 *
 * @param contexts - Array of context strings (prompt + contexts from previous steps)
 * @returns Processed contexts with URIs replaced by semantic tags, and replacements metadata
 */
export function preprocessAllUris(contexts: string[]): {
  processedContexts: string[];
  replacements: UriReplacement[];
} {
  // Collect all replacements from all contexts
  const allReplacements: UriReplacement[] = [];

  const processedContexts = contexts.map((context) => {
    const {processedPrompt, replacements} = replaceUrisWithSemanticTags(context);
    allReplacements.push(...replacements);
    return processedPrompt;
  });

  return {processedContexts, replacements: allReplacements};
}

/**
 * Restore URIs in AI-generated request and prompt.
 *
 * Process:
 * 1. Replace XML tags in request fields with actual gs:// URIs
 * 2. Remove used tags from prompt
 * 3. Restore unused tags back to original URIs in prompt
 *
 * @param aiRequest - Request object from AI (may contain XML tags)
 * @param aiPrompt - Prompt from AI (may contain XML tags)
 * @param replacements - Replacement metadata from preprocessAllUris
 * @returns Cleaned request and prompt with real gs:// URIs
 */
export function restoreUrisInRequest(
  aiRequest: any,
  aiPrompt: string,
  replacements: UriReplacement[]
): {
  cleanedRequest: any;
  cleanedPrompt: string;
} {
  return restoreSemanticTagsToUris(aiRequest, aiPrompt, replacements);
}

/**
 * Restore URIs in plain text by replacing XML tags with original URIs.
 *
 * Used for restoring URIs in non-request text (e.g., reasoning, error messages).
 *
 * @param text - Text containing URI placeholders
 * @param replacements - Replacement metadata from preprocessAllUris
 * @returns Text with URIs restored
 */
export function restoreUrisInText(
  text: string,
  replacements: UriReplacement[]
): string {
  let restored = text;

  for (const replacement of replacements) {
    // Replace all occurrences of the placeholder with original URI
    restored = restored.replace(
      new RegExp(replacement.placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      replacement.original
    );
  }

  return restored;
}
