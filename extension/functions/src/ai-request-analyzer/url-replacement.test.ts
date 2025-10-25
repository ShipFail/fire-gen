import { describe, test, expect } from 'vitest';
import {
  toGcsUri,
  extractUris,
  detectMimeType,
  getMimeCategory,
  replaceUrisWithSemanticTags,
  restoreSemanticTagsToUris,
  restoreUrisInText,
  preprocessAllUris,
  type UriReplacement
} from './url-replacement';

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

describe('extractUris', () => {
  test('extracts single URI', () => {
    expect(extractUris('Check this image: https://storage.googleapis.com/bucket/image.jpg'))
      .toEqual(['https://storage.googleapis.com/bucket/image.jpg']);
  });

  test('extracts multiple URIs', () => {
    const text = 'First: https://storage.googleapis.com/b1/img1.jpg Second: gs://b2/img2.jpg';
    expect(extractUris(text)).toEqual([
      'https://storage.googleapis.com/b1/img1.jpg',
      'gs://b2/img2.jpg'
    ]);
  });

  test('returns empty array when no URIs', () => {
    expect(extractUris('Just plain text')).toEqual([]);
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

describe('replaceUrisWithSemanticTags', () => {
  test('replaces single video URI with tag', () => {
    const result = replaceUrisWithSemanticTags('Continue from https://storage.googleapis.com/bucket/video.mp4');

    expect(result.processedPrompt).toBe("Continue from <VIDEO_URI_1/>");
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]).toMatchObject({
      original: 'https://storage.googleapis.com/bucket/video.mp4',
      gcsUri: 'gs://bucket/video.mp4',
      mimeType: 'video/mp4',
      category: 'video',
      tag: 'VIDEO_URI_1',
      placeholder: "<VIDEO_URI_1/>"
    });
  });

  test('replaces multiple URIs with different types', () => {
    const result = replaceUrisWithSemanticTags(
      'Show gs://bucket/hero.jpg and gs://bucket/sword.png finding gs://bucket/scene.mp4'
    );

    expect(result.processedPrompt).toBe(
      "Show <IMAGE_URI_1/> and <IMAGE_URI_2/> finding <VIDEO_URI_1/>"
    );
    expect(result.replacements).toHaveLength(3);

    // Check sequential numbering within each category
    expect(result.replacements[0].tag).toBe('IMAGE_URI_1');
    expect(result.replacements[1].tag).toBe('IMAGE_URI_2');
    expect(result.replacements[2].tag).toBe('VIDEO_URI_1');
  });

  test('handles Firebase Storage URIs', () => {
    const result = replaceUrisWithSemanticTags(
      'Animate https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Ftest%2Fphoto.jpg?token=123'
    );

    expect(result.processedPrompt).toContain("<IMAGE_URI_1/>");
    expect(result.replacements[0].gcsUri).toBe('gs://proj/users/test/photo.jpg');
  });

  test('returns empty replacements when no URIs', () => {
    const result = replaceUrisWithSemanticTags('Just a plain text prompt');

    expect(result.processedPrompt).toBe('Just a plain text prompt');
    expect(result.replacements).toHaveLength(0);
  });
});

describe('restoreSemanticTagsToUris', () => {
  test('restores URIs in request fields and removes from prompt', () => {
    const replacements: UriReplacement[] = [
      {
        original: 'https://storage.googleapis.com/bucket/video.mp4',
        gcsUri: 'gs://bucket/video.mp4',
        mimeType: 'video/mp4',
        category: 'video',
        tag: 'VIDEO_URI_1',
        placeholder: "<VIDEO_URI_1/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      model: 'veo-3.1-generate-preview',
      prompt: "Continue from <VIDEO_URI_1/>",
      videoGcsUri: "<VIDEO_URI_1/>"
    };

    const result = restoreSemanticTagsToUris(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.videoGcsUri).toBe('gs://bucket/video.mp4');
    expect(result.cleanedPrompt).toBe('Continue from');
  });

  test('keeps unused URIs in prompt', () => {
    const replacements: UriReplacement[] = [
      {
        original: 'gs://bucket/hero.jpg',
        gcsUri: 'gs://bucket/hero.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        tag: 'IMAGE_URI_1',
        placeholder: "<IMAGE_URI_1/>"
      },
      {
        original: 'gs://bucket/sword.png',
        gcsUri: 'gs://bucket/sword.png',
        mimeType: 'image/png',
        category: 'image',
        tag: 'IMAGE_URI_2',
        placeholder: "<IMAGE_URI_2/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      model: 'veo-3.1-generate-preview',
      prompt: "Show <IMAGE_URI_1/> finding <IMAGE_URI_2/>",
      referenceSubjectImages: ["<IMAGE_URI_1/>"]
    };

    const result = restoreSemanticTagsToUris(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.referenceSubjectImages).toEqual(['gs://bucket/hero.jpg']);
    // Hero removed (used), sword restored (not used)
    expect(result.cleanedPrompt).toBe('Show finding gs://bucket/sword.png');
  });

  test('handles array of reference images', () => {
    const replacements: UriReplacement[] = [
      {
        original: 'gs://bucket/person1.jpg',
        gcsUri: 'gs://bucket/person1.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        tag: 'IMAGE_URI_1',
        placeholder: "<IMAGE_URI_1/>"
      },
      {
        original: 'gs://bucket/person2.jpg',
        gcsUri: 'gs://bucket/person2.jpg',
        mimeType: 'image/jpeg',
        category: 'image',
        tag: 'IMAGE_URI_2',
        placeholder: "<IMAGE_URI_2/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      referenceSubjectImages: [
        "<IMAGE_URI_1/>",
        "<IMAGE_URI_2/>"
      ],
      prompt: "Show walking together"
    };

    const result = restoreSemanticTagsToUris(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedRequest.referenceSubjectImages).toEqual([
      'gs://bucket/person1.jpg',
      'gs://bucket/person2.jpg'
    ]);
    expect(result.cleanedPrompt).toBe('Show walking together');
  });

  test('cleans up extra whitespace', () => {
    const replacements: UriReplacement[] = [
      {
        original: 'gs://bucket/video.mp4',
        gcsUri: 'gs://bucket/video.mp4',
        mimeType: 'video/mp4',
        category: 'video',
        tag: 'VIDEO_URI_1',
        placeholder: "<VIDEO_URI_1/>"
      }
    ];

    const aiRequest = {
      type: 'video',
      videoGcsUri: "<VIDEO_URI_1/>",
      prompt: "Continue   from   <VIDEO_URI_1/>   with   action"
    };

    const result = restoreSemanticTagsToUris(aiRequest, aiRequest.prompt, replacements);

    expect(result.cleanedPrompt).toBe('Continue from with action');
  });
});
