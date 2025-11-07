// functions/src/assisted-mode/restore-urls.test.ts
import {describe, test, expect} from "vitest";
import {restoreUrls} from "./restore-urls.js";

describe("restoreUrls", () => {
  test("should restore image tags with URLs from flat array and add mimeType", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
    };
    const extractedUrls = ["gs://bucket/cat.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {
        gcsUri: "gs://bucket/cat.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  test("should restore video tags with URLs from flat array and add mimeType", () => {
    const jsonWithTags = {
      video: {gcsUri: "<FIREGEN_VIDEO_MP4_URI_2/>"},
    };
    const extractedUrls = [
      "gs://bucket/image.jpg",
      "gs://bucket/video.mp4",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      video: {
        gcsUri: "gs://bucket/video.mp4",
        mimeType: "video/mp4",
      },
    });
  });

  test("should restore audio tags with URLs from flat array and add mimeType", () => {
    const jsonWithTags = {
      audio: {gcsUri: "<FIREGEN_AUDIO_MPEG_URI_3/>"},
    };
    const extractedUrls = [
      "gs://bucket/image.jpg",
      "gs://bucket/video.mp4",
      "gs://bucket/audio.mp3",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      audio: {
        gcsUri: "gs://bucket/audio.mp3",
        mimeType: "audio/mpeg",
      },
    });
  });

  test("should restore multiple tags of different types with mimeType", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
      video: {gcsUri: "<FIREGEN_VIDEO_MP4_URI_2/>"},
      audio: {gcsUri: "<FIREGEN_AUDIO_MPEG_URI_3/>"},
    };
    const extractedUrls = [
      "gs://bucket/photo.jpg",
      "gs://bucket/clip.mp4",
      "gs://bucket/sound.mp3",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {
        gcsUri: "gs://bucket/photo.jpg",
        mimeType: "image/jpeg",
      },
      video: {
        gcsUri: "gs://bucket/clip.mp4",
        mimeType: "video/mp4",
      },
      audio: {
        gcsUri: "gs://bucket/sound.mp3",
        mimeType: "audio/mpeg",
      },
    });
  });

  test("should restore duplicate tags with same URL and mimeType", () => {
    const jsonWithTags = {
      first: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
      second: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
    };
    const extractedUrls = ["gs://bucket/reused.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      first: {
        gcsUri: "gs://bucket/reused.jpg",
        mimeType: "image/jpeg",
      },
      second: {
        gcsUri: "gs://bucket/reused.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  test("should restore tags in nested objects with mimeType", () => {
    const jsonWithTags = {
      instances: [
        {
          image: {gcsUri: "<FIREGEN_IMAGE_PNG_URI_1/>"},
          prompt: "Animate this image",
        },
        {
          video: {gcsUri: "<FIREGEN_VIDEO_MP4_URI_2/>"},
          prompt: "Extend this video",
        },
      ],
    };
    const extractedUrls = [
      "gs://bucket/image.png",
      "gs://bucket/video.mp4",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      instances: [
        {
          image: {
            gcsUri: "gs://bucket/image.png",
            mimeType: "image/png",
          },
          prompt: "Animate this image",
        },
        {
          video: {
            gcsUri: "gs://bucket/video.mp4",
            mimeType: "video/mp4",
          },
          prompt: "Extend this video",
        },
      ],
    });
  });

  test("should restore tags in arrays with mimeType", () => {
    const jsonWithTags = {
      referenceImages: [
        {image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"}},
        {image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_2/>"}},
      ],
    };
    const extractedUrls = [
      "gs://bucket/ref1.jpg",
      "gs://bucket/ref2.jpg",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      referenceImages: [
        {image: {
          gcsUri: "gs://bucket/ref1.jpg",
          mimeType: "image/jpeg",
        }},
        {image: {
          gcsUri: "gs://bucket/ref2.jpg",
          mimeType: "image/jpeg",
        }},
      ],
    });
  });

  test("should restore HTTPS URLs unchanged with mimeType", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
    };
    const extractedUrls = ["https://example.com/external.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {
        gcsUri: "https://example.com/external.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  test("should handle empty extractedUrls array", () => {
    const jsonWithTags = {
      prompt: "Generate a sunset",
    };
    const extractedUrls: string[] = [];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      prompt: "Generate a sunset",
    });
  });

  test("should preserve non-tag content and add mimeType to tagged URLs", () => {
    const jsonWithTags = {
      model: "veo-3.1-generate-preview",
      instances: [{
        image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
        prompt: "Animate <FIREGEN_IMAGE_JPEG_URI_1/> with motion",
      }],
      parameters: {
        durationSeconds: 8,
      },
    };
    const extractedUrls = ["gs://bucket/landscape.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      model: "veo-3.1-generate-preview",
      instances: [{
        image: {
          gcsUri: "gs://bucket/landscape.jpg",
          mimeType: "image/jpeg",
        },
        prompt: "Animate gs://bucket/landscape.jpg with motion",
      }],
      parameters: {
        durationSeconds: 8,
      },
    });
  });

  test("should handle tag not found in extractedUrls", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_5/>"},
    };
    const extractedUrls = ["gs://bucket/only-one.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    // Should preserve original tag if URL not found, but still extract mimeType from tag
    expect(result).toEqual({
      image: {
        gcsUri: "<FIREGEN_IMAGE_JPEG_URI_5/>",
        mimeType: "image/jpeg",
      },
    });
  });

  test("should handle real-world Veo 3.1 request structure with mimeType", () => {
    const jsonWithTags = {
      model: "veo-3.1-fast-generate-preview",
      instances: [
        {
          prompt: "Product rotating on pedestal",
          image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
          referenceImages: [
            {
              image: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_2/>"},
              referenceType: "asset",
            },
          ],
        },
      ],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds: 8,
      },
    };
    const extractedUrls = [
      "gs://products/shoe-left.jpg",
      "gs://products/shoe-right.jpg",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      model: "veo-3.1-fast-generate-preview",
      instances: [
        {
          prompt: "Product rotating on pedestal",
          image: {
            gcsUri: "gs://products/shoe-left.jpg",
            mimeType: "image/jpeg",
          },
          referenceImages: [
            {
              image: {
                gcsUri: "gs://products/shoe-right.jpg",
                mimeType: "image/jpeg",
              },
              referenceType: "asset",
            },
          ],
        },
      ],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds: 8,
      },
    });
  });

  // Comprehensive MIME type tests
  describe("MIME Type Extraction", () => {
    test("should correctly extract MIME type for PNG images", () => {
      const jsonWithTags = {
        image: {gcsUri: "<FIREGEN_IMAGE_PNG_URI_1/>"},
      };
      const extractedUrls = ["gs://bucket/photo.png"];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result.image).toEqual({
        gcsUri: "gs://bucket/photo.png",
        mimeType: "image/png",
      });
    });

    test("should correctly extract MIME type for WebP images", () => {
      const jsonWithTags = {
        image: {gcsUri: "<FIREGEN_IMAGE_WEBP_URI_1/>"},
      };
      const extractedUrls = ["gs://bucket/modern.webp"];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result.image).toEqual({
        gcsUri: "gs://bucket/modern.webp",
        mimeType: "image/webp",
      });
    });

    test("should correctly extract MIME type for QuickTime videos", () => {
      const jsonWithTags = {
        video: {gcsUri: "<FIREGEN_VIDEO_QUICKTIME_URI_1/>"},
      };
      const extractedUrls = ["gs://bucket/clip.mov"];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result.video).toEqual({
        gcsUri: "gs://bucket/clip.mov",
        mimeType: "video/quicktime",
      });
    });

    test("should correctly extract MIME type for WAV audio", () => {
      const jsonWithTags = {
        audio: {gcsUri: "<FIREGEN_AUDIO_WAV_URI_1/>"},
      };
      const extractedUrls = ["gs://bucket/sound.wav"];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result.audio).toEqual({
        gcsUri: "gs://bucket/sound.wav",
        mimeType: "audio/wav",
      });
    });

    test("should handle mixed MIME types in nested structure", () => {
      const jsonWithTags = {
        content: {
          mainImage: {gcsUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"},
          thumbnail: {gcsUri: "<FIREGEN_IMAGE_PNG_URI_2/>"},
          video: {gcsUri: "<FIREGEN_VIDEO_MP4_URI_3/>"},
          backgroundMusic: {gcsUri: "<FIREGEN_AUDIO_MPEG_URI_4/>"},
        },
      };
      const extractedUrls = [
        "gs://bucket/main.jpg",
        "gs://bucket/thumb.png",
        "gs://bucket/demo.mp4",
        "gs://bucket/music.mp3",
      ];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result).toEqual({
        content: {
          mainImage: {
            gcsUri: "gs://bucket/main.jpg",
            mimeType: "image/jpeg",
          },
          thumbnail: {
            gcsUri: "gs://bucket/thumb.png",
            mimeType: "image/png",
          },
          video: {
            gcsUri: "gs://bucket/demo.mp4",
            mimeType: "video/mp4",
          },
          backgroundMusic: {
            gcsUri: "gs://bucket/music.mp3",
            mimeType: "audio/mpeg",
          },
        },
      });
    });

    test("should restore fileUri fields with mimeType (Gemini image generation)", () => {
      const jsonWithTags = {
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              {text: "merge these images"},
              {fileData: {fileUri: "<FIREGEN_IMAGE_JPEG_URI_1/>"}},
              {fileData: {fileUri: "<FIREGEN_IMAGE_PNG_URI_2/>"}},
            ],
          },
        ],
      };
      const extractedUrls = [
        "gs://bucket/image1.jpg",
        "gs://bucket/image2.png",
      ];

      const result = restoreUrls(jsonWithTags, extractedUrls);

      expect(result).toEqual({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              {text: "merge these images"},
              {
                fileData: {
                  fileUri: "gs://bucket/image1.jpg",
                  mimeType: "image/jpeg",
                },
              },
              {
                fileData: {
                  fileUri: "gs://bucket/image2.png",
                  mimeType: "image/png",
                },
              },
            ],
          },
        ],
      });
    });
  });
});
