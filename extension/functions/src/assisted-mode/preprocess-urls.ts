// functions/src/assisted-mode/preprocess-urls.ts

/**
 * Pre-process: URL Extraction (Deterministic, No AI)
 *
 * Detects and converts URLs to GCS URI format, tags them in prompt.
 */

export interface ExtractedUrls {
  images: string[];
  videos: string[];
  audio: string[];
}

export interface UrlExtractionResult {
  taggedPrompt: string;
  extractedUrls: ExtractedUrls;
}

/**
 * Extract URLs from prompt and replace with tags.
 *
 * Detects:
 * - Firebase Storage URLs → gs://bucket/path
 * - GCS URLs → gs://bucket/path
 * - HTTPS URLs → infer type from extension
 *
 * Tags:
 * - <FIREGEN_IMAGE_URI_1/>, <FIREGEN_IMAGE_URI_2/>, ...
 * - <FIREGEN_VIDEO_URI_1/>, <FIREGEN_VIDEO_URI_2/>, ...
 * - <FIREGEN_AUDIO_URI_1/>, <FIREGEN_AUDIO_URI_2/>, ...
 */
export function preprocessUrls(prompt: string): UrlExtractionResult {
  const extractedUrls: ExtractedUrls = {
    images: [],
    videos: [],
    audio: [],
  };

  let taggedPrompt = prompt;
  let imageIndex = 1;
  let videoIndex = 1;
  let audioIndex = 1;

  // Firebase Storage URL pattern
  const firebaseRegex = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^\/]+)\/o\/([^?]+)\?[^\s]*/g;

  taggedPrompt = taggedPrompt.replace(firebaseRegex, (match, bucket, encodedPath) => {
    const path = decodeURIComponent(encodedPath);
    const gcsUri = `gs://${bucket}/${path}`;

    // Detect type from extension
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const tag = `<FIREGEN_IMAGE_URI_${imageIndex++}/>`;
      extractedUrls.images.push(gcsUri);
      return tag;
    } else if (path.match(/\.(mp4|mov|avi|webm)$/i)) {
      const tag = `<FIREGEN_VIDEO_URI_${videoIndex++}/>`;
      extractedUrls.videos.push(gcsUri);
      return tag;
    } else if (path.match(/\.(mp3|wav|aac|ogg)$/i)) {
      const tag = `<FIREGEN_AUDIO_URI_${audioIndex++}/>`;
      extractedUrls.audio.push(gcsUri);
      return tag;
    }

    // Default to image
    const tag = `<FIREGEN_IMAGE_URI_${imageIndex++}/>`;
    extractedUrls.images.push(gcsUri);
    return tag;
  });

  // GCS URI pattern
  const gcsRegex = /gs:\/\/[^\s]+/g;

  taggedPrompt = taggedPrompt.replace(gcsRegex, (match) => {
    if (match.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const tag = `<FIREGEN_IMAGE_URI_${imageIndex++}/>`;
      extractedUrls.images.push(match);
      return tag;
    } else if (match.match(/\.(mp4|mov|avi|webm)$/i)) {
      const tag = `<FIREGEN_VIDEO_URI_${videoIndex++}/>`;
      extractedUrls.videos.push(match);
      return tag;
    } else if (match.match(/\.(mp3|wav|aac|ogg)$/i)) {
      const tag = `<FIREGEN_AUDIO_URI_${audioIndex++}/>`;
      extractedUrls.audio.push(match);
      return tag;
    }

    // Default to image
    const tag = `<FIREGEN_IMAGE_URI_${imageIndex++}/>`;
    extractedUrls.images.push(match);
    return tag;
  });

  // HTTPS image URLs
  const httpsImageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;

  taggedPrompt = taggedPrompt.replace(httpsImageRegex, (match) => {
    const tag = `<FIREGEN_IMAGE_URI_${imageIndex++}/>`;
    extractedUrls.images.push(match);
    return tag;
  });

  // HTTPS video URLs
  const httpsVideoRegex = /https?:\/\/[^\s]+\.(mp4|mov|avi|webm)/gi;

  taggedPrompt = taggedPrompt.replace(httpsVideoRegex, (match) => {
    const tag = `<FIREGEN_VIDEO_URI_${videoIndex++}/>`;
    extractedUrls.videos.push(match);
    return tag;
  });

  // HTTPS audio URLs
  const httpsAudioRegex = /https?:\/\/[^\s]+\.(mp3|wav|aac|ogg)/gi;

  taggedPrompt = taggedPrompt.replace(httpsAudioRegex, (match) => {
    const tag = `<FIREGEN_AUDIO_URI_${audioIndex++}/>`;
    extractedUrls.audio.push(match);
    return tag;
  });

  return {taggedPrompt, extractedUrls};
}
