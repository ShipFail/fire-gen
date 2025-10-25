import { describe, test, expect } from 'vitest';
import {
  toGcsUri,
  extractUrls,
  detectMimeType,
  getMimeCategory,
  replaceUrlsWithTags,
  restoreAndCleanUrls,
  type UrlReplacement
} from './storage-url';

describe('toGcsUri', () => {
  test('returns GCS URI as-is', () => {
    expect(toGcsUri('gs://bucket/path/to/file.jpg')).toBe('gs://bucket/path/to/file.jpg');
  });

  test('converts storage.googleapis.com URL', () => {
    expect(toGcsUri('https://storage.googleapis.com/bucket/path/file.jpg'))
      .toBe('gs://bucket/path/file.jpg');
  });

  test('converts storage.googleapis.com signed URL', () => {
    expect(toGcsUri('https://storage.googleapis.com/bucket/path/file.jpg?X-Goog-Algorithm=GOOG4'))
      .toBe('gs://bucket/path/file.jpg');
  });

  test('converts Firebase Storage URL', () => {
    expect(toGcsUri('https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/images%2Fsunset.jpg?alt=media&token=abc123'))
      .toBe('gs://my-project.appspot.com/images/sunset.jpg');
  });

  test('decodes URL-encoded paths', () => {
    expect(toGcsUri('https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Ftest%2Fimage.jpg?token=xyz'))
      .toBe('gs://bucket/users/test/image.jpg');
  });

  test('handles complex Firebase Storage path', () => {
    expect(toGcsUri('https://firebasestorage.googleapis.com/v0/b/studio-3670859293-6f970.firebasestorage.app/o/users%2FnZ86oPazPgT3yZjTHhFFjkj7sR42%2Fprojects%2Fx5f8I6Tq99AGgj4HJrzF%2Fkeyframes%2Ffd3d84c9-9331-49ed-9739-7b35e76d9f9b.png?alt=media&token=8b570af6-92f9-4040-8f0c-c3ac0ae8ce17'))
      .toBe('gs://studio-3670859293-6f970.firebasestorage.app/users/nZ86oPazPgT3yZjTHhFFjkj7sR42/projects/x5f8I6Tq99AGgj4HJrzF/keyframes/fd3d84c9-9331-49ed-9739-7b35e76d9f9b.png');
  });

  test('throws error for unsupported URL', () => {
    expect(() => toGcsUri('http://example.com/image.jpg'))
      .toThrow('Unsupported storage URL format');
  });
});

describe('extractUrls', () => {
  test('extracts single URL', () => {
    expect(extractUrls('Check this image: https://storage.googleapis.com/bucket/image.jpg'))
      .toEqual(['https://storage.googleapis.com/bucket/image.jpg']);
  });

  test('extracts multiple URLs', () => {
    const text = 'First: https://storage.googleapis.com/b1/img1.jpg Second: gs://b2/img2.jpg';
    expect(extractUrls(text)).toEqual([
      'https://storage.googleapis.com/b1/img1.jpg',
      'gs://b2/img2.jpg'
    ]);
  });

  test('returns empty array when no URLs', () => {
    expect(extractUrls('Just plain text')).toEqual([]);
  });
});

describe('detectMimeType', () => {
  test('detects video MIME type from gs:// URI', () => {
    expect(detectMimeType('gs://bucket/video.mp4')).toBe('video/mp4'); // mime package returns video/mp4
    expect(detectMimeType('gs://bucket/movie.mov')).toBe('video/quicktime');
  });

  test('detects image MIME type from gs:// URI', () => {
    expect(detectMimeType('gs://bucket/photo.jpg')).toBe('image/jpeg');
    expect(detectMimeType('gs://bucket/graphic.png')).toBe('image/png');
  });

  test('detects MIME type from Firebase Storage URL', () => {
    expect(detectMimeType('https://firebasestorage.googleapis.com/v0/b/proj/o/video.mp4?token=123'))
      .toBe('video/mp4'); // mime package returns video/mp4
    expect(detectMimeType('https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Ftest%2Fimage.jpg?alt=media'))
      .toBe('image/jpeg');
  });

  test('detects MIME type from storage.googleapis.com URL', () => {
    expect(detectMimeType('https://storage.googleapis.com/bucket/file.webm'))
      .toBe('video/webm');
  });

  test('returns octet-stream for unknown extension', () => {
    expect(detectMimeType('gs://bucket/file.unknown')).toBe('application/octet-stream');
  });
});

describe('getMimeCategory', () => {
  test('categorizes video MIME types', () => {
    expect(getMimeCategory('video/mp4')).toBe('video');
    expect(getMimeCategory('video/quicktime')).toBe('video');
    expect(getMimeCategory('video/webm')).toBe('video');
  });

  test('categorizes image MIME types', () => {
    expect(getMimeCategory('image/jpeg')).toBe('image');
    expect(getMimeCategory('image/png')).toBe('image');
    expect(getMimeCategory('image/webp')).toBe('image');
  });

  test('categorizes audio MIME types', () => {
    expect(getMimeCategory('audio/mpeg')).toBe('audio');
    expect(getMimeCategory('audio/wav')).toBe('audio');
  });

  test('categorizes other MIME types', () => {
    expect(getMimeCategory('application/pdf')).toBe('other');
    expect(getMimeCategory('text/plain')).toBe('other');
  });
});

describe('replaceUrlsWithTags', () => {
  test('replaces single video URL with tag', () => {
    const result = replaceUrlsWithTags('Continue from https://storage.googleapis.com/bucket/video.mp4');

    expect(result.processedPrompt).toBe("Continue from <GS_VIDEO_MP4_1/>");
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]).toMatchObject({
      original: 'https://storage.googleapis.com/bucket/video.mp4',
      gcsUri: 'gs://bucket/video.mp4',
      mimeType: 'video/mp4',
      category: 'video',
      protocol: 'GS',
      format: 'MP4',
      tag: 'GS_VIDEO_MP4_1',
      placeholder: "<GS_VIDEO_MP4_1/>"
    });
  });

  test('replaces multiple URLs with different types', () => {
    const result = replaceUrlsWithTags(
      'Show gs://bucket/hero.jpg and gs://bucket/sword.png finding gs://bucket/scene.mp4'
    );

    expect(result.processedPrompt).toBe(
      "Show <GS_IMAGE_JPEG_1/> and <GS_IMAGE_PNG_2/> finding <GS_VIDEO_MP4_1/>"
    );
    expect(result.replacements).toHaveLength(3);

    // Check sequential numbering within each category
    expect(result.replacements[0].tag).toBe('GS_IMAGE_JPEG_1');
    expect(result.replacements[1].tag).toBe('GS_IMAGE_PNG_2');
    expect(result.replacements[2].tag).toBe('GS_VIDEO_MP4_1');
  });

  test('handles Firebase Storage URLs', () => {
    const result = replaceUrlsWithTags(
      'Animate https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Ftest%2Fphoto.jpg?token=123'
    );

    expect(result.processedPrompt).toContain("<GS_IMAGE_JPEG_1/>");
    expect(result.replacements[0].gcsUri).toBe('gs://proj/users/test/photo.jpg');
  });

  test('returns empty replacements when no URLs', () => {
    const result = replaceUrlsWithTags('Just a plain text prompt');

    expect(result.processedPrompt).toBe('Just a plain text prompt');
    expect(result.replacements).toHaveLength(0);
  });
});

describe('restoreAndCleanUrls', () => {
  test('restores URLs in request fields and removes from prompt', () => {
    const replacements: UrlReplacement[] = [
      {
        original: 'https://storage.googleapis.com/bucket/video.mp4',
        gcsUri: 'gs://bucket/video.mp4',
        mimeType: 'video/mp4',
        category: 'video',
        protocol: 'GS',
        format: 'MP4',
        tag: 'GS_VIDEO_MP4_1',
        placeholder: "<GS_VIDEO_MP4_1/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      model: 'veo-3.1-generate-preview',
      prompt: "Continue from <GS_VIDEO_MP4_1/>",
      videoGcsUri: "<GS_VIDEO_MP4_1/>"
    };

    const result = restoreAndCleanUrls(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.videoGcsUri).toBe('gs://bucket/video.mp4');
    expect(result.cleanedPrompt).toBe('Continue from');
  });

  test('keeps unused URLs in prompt', () => {
    const replacements: UrlReplacement[] = [
      {
        original: 'gs://bucket/hero.jpg',
        gcsUri: 'gs://bucket/hero.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        protocol: 'GS',
        format: 'JPEG',
        tag: 'GS_IMAGE_JPEG_1',
        placeholder: "<GS_IMAGE_JPEG_1/>"
      },
      {
        original: 'gs://bucket/sword.png',
        gcsUri: 'gs://bucket/sword.png',
        mimeType: 'image/png',
        category: 'image',
        protocol: 'GS',
        format: 'PNG',
        tag: 'GS_IMAGE_PNG_2',
        placeholder: "<GS_IMAGE_PNG_2/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      model: 'veo-3.1-generate-preview',
      prompt: "Show <GS_IMAGE_JPEG_1/> finding <GS_IMAGE_PNG_2/>",
      referenceSubjectImages: ["<GS_IMAGE_JPEG_1/>"]
    };

    const result = restoreAndCleanUrls(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.referenceSubjectImages).toEqual(['gs://bucket/hero.jpg']);
    // Hero removed (used), sword restored (not used)
    expect(result.cleanedPrompt).toBe('Show finding gs://bucket/sword.png');
  });

  test('handles array of reference images', () => {
    const replacements: UrlReplacement[] = [
      {
        original: 'gs://bucket/person1.jpg',
        gcsUri: 'gs://bucket/person1.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        protocol: 'GS',
        format: 'JPEG',
        tag: 'GS_IMAGE_JPEG_1',
        placeholder: "<GS_IMAGE_JPEG_1/>"
      },
      {
        original: 'gs://bucket/person2.jpg',
        gcsUri: 'gs://bucket/person2.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        protocol: 'GS',
        format: 'JPEG',
        tag: 'GS_IMAGE_JPEG_2',
        placeholder: "<GS_IMAGE_JPEG_2/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      referenceSubjectImages: [
        "<GS_IMAGE_JPEG_1/>",
        "<GS_IMAGE_JPEG_2/>"
      ],
      prompt: "Show walking together"
    };

    const result = restoreAndCleanUrls(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.referenceSubjectImages).toEqual([
      'gs://bucket/person1.jpg',
      'gs://bucket/person2.jpg'
    ]);
    expect(result.cleanedPrompt).toBe('Show walking together');
  });

  test('cleans up extra whitespace', () => {
    const replacements: UrlReplacement[] = [
      {
        original: 'gs://bucket/video.mp4',
        gcsUri: 'gs://bucket/video.mp4',
        mimeType: 'video/mp4',
        category: 'video',
        protocol: 'GS',
        format: 'MP4',
        tag: 'GS_VIDEO_MP4_1',
        placeholder: "<GS_VIDEO_MP4_1/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      videoGcsUri: "<GS_VIDEO_MP4_1/>",
      prompt: "Continue   from   <GS_VIDEO_MP4_1/>   with   action"
    };

    const result = restoreAndCleanUrls(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedPrompt).toBe('Continue from with action');
  });
});
