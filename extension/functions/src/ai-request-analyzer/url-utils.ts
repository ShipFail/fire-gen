// functions/src/ai-request-analyzer/url-utils.ts

/**
 * URL pattern matching http://, https://, and gs:// URIs
 */
const URL_PATTERN = /https?:\/\/\S+|gs:\/\/\S+/gi;

/**
 * Preprocess ALL contexts: replace URLs with placeholders.
 * This prevents URLs from:
 * - Wasting tokens in AI calls
 * - Confusing hint detection
 * - Affecting model selection
 *
 * @param contexts - Array of context strings (prompt + contexts from previous steps)
 * @returns Processed contexts with URLs replaced by placeholders, and URL mapping
 */
export function preprocessAllUrls(contexts: string[]): {
  processedContexts: string[];
  urlMap: Map<string, string>;
} {
  const urlMap = new Map<string, string>();
  let counter = 1;

  const processedContexts = contexts.map((context) => {
    return context.replace(URL_PATTERN, (url) => {
      const placeholder = `<GS_HTTPS_URI_REF_${counter}/>`;
      urlMap.set(placeholder, url);
      counter++;
      return placeholder;
    });
  });

  return {processedContexts, urlMap};
}

/**
 * Restore URLs in text by replacing placeholders with original URLs.
 *
 * @param text - Text containing URL placeholders
 * @param urlMap - Mapping of placeholders to original URLs
 * @returns Text with URLs restored
 */
export function restoreUrlsInText(
  text: string,
  urlMap: Map<string, string>
): string {
  let restored = text;

  urlMap.forEach((url, placeholder) => {
    // Escape special regex characters in placeholder
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    restored = restored.replace(new RegExp(escapedPlaceholder, "g"), url);
  });

  return restored;
}
