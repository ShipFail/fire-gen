// functions/src/assisted-mode/restore-urls.test.ts
import {describe, test, expect} from "vitest";
import {restoreUrls} from "./restore-urls.js";

describe("restoreUrls", () => {
  test("should restore image tags with URLs from flat array", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
    };
    const extractedUrls = ["gs://bucket/cat.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {gcsUri: "gs://bucket/cat.jpg"},
    });
  });

  test("should restore video tags with URLs from flat array", () => {
    const jsonWithTags = {
      video: {gcsUri: "<FIREGEN_VIDEO_URI_2/>"},
    };
    const extractedUrls = [
      "gs://bucket/image.jpg",
      "gs://bucket/video.mp4",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      video: {gcsUri: "gs://bucket/video.mp4"},
    });
  });

  test("should restore audio tags with URLs from flat array", () => {
    const jsonWithTags = {
      audio: {gcsUri: "<FIREGEN_AUDIO_URI_3/>"},
    };
    const extractedUrls = [
      "gs://bucket/image.jpg",
      "gs://bucket/video.mp4",
      "gs://bucket/audio.mp3",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      audio: {gcsUri: "gs://bucket/audio.mp3"},
    });
  });

  test("should restore multiple tags of different types", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
      video: {gcsUri: "<FIREGEN_VIDEO_URI_2/>"},
      audio: {gcsUri: "<FIREGEN_AUDIO_URI_3/>"},
    };
    const extractedUrls = [
      "gs://bucket/photo.jpg",
      "gs://bucket/clip.mp4",
      "gs://bucket/sound.mp3",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {gcsUri: "gs://bucket/photo.jpg"},
      video: {gcsUri: "gs://bucket/clip.mp4"},
      audio: {gcsUri: "gs://bucket/sound.mp3"},
    });
  });

  test("should restore duplicate tags with same URL", () => {
    const jsonWithTags = {
      first: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
      second: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
    };
    const extractedUrls = ["gs://bucket/reused.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      first: {gcsUri: "gs://bucket/reused.jpg"},
      second: {gcsUri: "gs://bucket/reused.jpg"},
    });
  });

  test("should restore tags in nested objects", () => {
    const jsonWithTags = {
      instances: [
        {
          image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
          prompt: "Animate this image",
        },
        {
          video: {gcsUri: "<FIREGEN_VIDEO_URI_2/>"},
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
          image: {gcsUri: "gs://bucket/image.png"},
          prompt: "Animate this image",
        },
        {
          video: {gcsUri: "gs://bucket/video.mp4"},
          prompt: "Extend this video",
        },
      ],
    });
  });

  test("should restore tags in arrays", () => {
    const jsonWithTags = {
      referenceImages: [
        {image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"}},
        {image: {gcsUri: "<FIREGEN_IMAGE_URI_2/>"}},
      ],
    };
    const extractedUrls = [
      "gs://bucket/ref1.jpg",
      "gs://bucket/ref2.jpg",
    ];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      referenceImages: [
        {image: {gcsUri: "gs://bucket/ref1.jpg"}},
        {image: {gcsUri: "gs://bucket/ref2.jpg"}},
      ],
    });
  });

  test("should restore HTTPS URLs unchanged", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
    };
    const extractedUrls = ["https://example.com/external.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    expect(result).toEqual({
      image: {gcsUri: "https://example.com/external.jpg"},
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

  test("should preserve non-tag content", () => {
    const jsonWithTags = {
      model: "veo-3.1-generate-preview",
      instances: [{
        image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
        prompt: "Animate <FIREGEN_IMAGE_URI_1/> with motion",
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
        image: {gcsUri: "gs://bucket/landscape.jpg"},
        prompt: "Animate gs://bucket/landscape.jpg with motion",
      }],
      parameters: {
        durationSeconds: 8,
      },
    });
  });

  test("should handle tag not found in extractedUrls", () => {
    const jsonWithTags = {
      image: {gcsUri: "<FIREGEN_IMAGE_URI_5/>"},
    };
    const extractedUrls = ["gs://bucket/only-one.jpg"];

    const result = restoreUrls(jsonWithTags, extractedUrls);

    // Should preserve original tag if URL not found
    expect(result).toEqual({
      image: {gcsUri: "<FIREGEN_IMAGE_URI_5/>"},
    });
  });

  test("should handle real-world Veo 3.1 request structure", () => {
    const jsonWithTags = {
      model: "veo-3.1-fast-generate-preview",
      instances: [
        {
          prompt: "Product rotating on pedestal",
          image: {gcsUri: "<FIREGEN_IMAGE_URI_1/>"},
          referenceImages: [
            {
              image: {gcsUri: "<FIREGEN_IMAGE_URI_2/>"},
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
          image: {gcsUri: "gs://products/shoe-left.jpg"},
          referenceImages: [
            {
              image: {gcsUri: "gs://products/shoe-right.jpg"},
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
});
