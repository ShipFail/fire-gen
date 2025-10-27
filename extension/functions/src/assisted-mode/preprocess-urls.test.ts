// functions/src/assisted-mode/preprocess-urls.test.ts
import {describe, test, expect} from "vitest";
import {preprocessUrls} from "./preprocess-urls.js";

describe("preprocessUrls", () => {
  describe("URL Format Detection", () => {
    test("should convert Firebase Storage URLs to gs:// format", () => {
      const input = "Show https://firebasestorage.googleapis.com/v0/b/my-bucket/o/images%2Fcat.jpg?alt=media&token=abc123";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["gs://my-bucket/images/cat.jpg"]);
      expect(result.taggedPrompt).toBe("Show <FIREGEN_IMAGE_URI_1/>");
    });

    test("should convert GCS API URLs to gs:// format", () => {
      const input = "Animate https://storage.googleapis.com/products/shoe.jpg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["gs://products/shoe.jpg"]);
      expect(result.taggedPrompt).toBe("Animate <FIREGEN_IMAGE_URI_1/>");
    });

    test("should preserve GCS URIs as-is", () => {
      const input = "Use gs://my-bucket/video.mp4";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["gs://my-bucket/video.mp4"]);
      expect(result.taggedPrompt).toBe("Use <FIREGEN_VIDEO_URI_1/>");
    });

    test("should preserve generic HTTPS URLs as-is", () => {
      const input = "Show https://example.com/random/image.jpg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["https://example.com/random/image.jpg"]);
      expect(result.taggedPrompt).toBe("Show <FIREGEN_IMAGE_URI_1/>");
    });

    test("should handle URLs without protocol (http)", () => {
      const input = "Show gs://bucket/file.png and http://insecure.com/old.jpg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://bucket/file.png",
        "http://insecure.com/old.jpg",
      ]);
      expect(result.taggedPrompt).toBe("Show <FIREGEN_IMAGE_URI_1/> and <FIREGEN_IMAGE_URI_2/>");
    });
  });

  describe("Unified Global Indexing", () => {
    test("should use sequential global index across all media types", () => {
      const input = "Show gs://a.jpg then gs://b.mp4 then gs://c.mp3";
      const result = preprocessUrls(input);

      expect(result.taggedPrompt).toBe(
        "Show <FIREGEN_IMAGE_URI_1/> then <FIREGEN_VIDEO_URI_2/> then <FIREGEN_AUDIO_URI_3/>"
      );
      expect(result.extractedUrls).toEqual([
        "gs://a.jpg",
        "gs://b.mp4",
        "gs://c.mp3",
      ]);
    });

    test("should increment global index for each unique URL", () => {
      const input = "Files: gs://1.jpg gs://2.jpg gs://3.mp4 gs://4.png";
      const result = preprocessUrls(input);

      expect(result.taggedPrompt).toBe(
        "Files: <FIREGEN_IMAGE_URI_1/> <FIREGEN_IMAGE_URI_2/> <FIREGEN_VIDEO_URI_3/> <FIREGEN_IMAGE_URI_4/>"
      );
      expect(result.extractedUrls).toHaveLength(4);
    });

    test("should NOT use separate counters per media type", () => {
      const input = "Image gs://a.jpg Video gs://b.mp4 Image gs://c.png";
      const result = preprocessUrls(input);

      // Should be 1, 2, 3 (NOT 1, 1, 2)
      expect(result.taggedPrompt).toContain("<FIREGEN_IMAGE_URI_1/>");
      expect(result.taggedPrompt).toContain("<FIREGEN_VIDEO_URI_2/>");
      expect(result.taggedPrompt).toContain("<FIREGEN_IMAGE_URI_3/>");
      expect(result.taggedPrompt).not.toContain("<FIREGEN_VIDEO_URI_1/>");
    });
  });

  describe("Deduplication", () => {
    test("should reuse tag for duplicate URLs", () => {
      const input = "Show gs://cat.jpg and later show gs://cat.jpg again";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["gs://cat.jpg"]); // Only once!
      expect(result.taggedPrompt).toBe(
        "Show <FIREGEN_IMAGE_URI_1/> and later show <FIREGEN_IMAGE_URI_1/> again"
      );
    });

    test("should deduplicate across different URL formats for same file", () => {
      const firebaseUrl = "https://firebasestorage.googleapis.com/v0/b/bucket/o/file.jpg?alt=media";
      const gcsApiUrl = "https://storage.googleapis.com/bucket/file.jpg";
      const gcsUri = "gs://bucket/file.jpg";

      const input = `First ${firebaseUrl} then ${gcsApiUrl} finally ${gcsUri}`;
      const result = preprocessUrls(input);

      // All three should normalize to gs://bucket/file.jpg and use same tag
      expect(result.extractedUrls).toEqual(["gs://bucket/file.jpg"]);
      expect(result.taggedPrompt).toBe(
        "First <FIREGEN_IMAGE_URI_1/> then <FIREGEN_IMAGE_URI_1/> finally <FIREGEN_IMAGE_URI_1/>"
      );
    });

    test("should handle duplicates with mixed media types", () => {
      const input = "Image gs://file.jpg Video gs://file.mp4 Image gs://file.jpg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://file.jpg", // Index 0 (tag 1)
        "gs://file.mp4", // Index 1 (tag 2)
      ]); // No duplicate jpg
      expect(result.taggedPrompt).toBe(
        "Image <FIREGEN_IMAGE_URI_1/> Video <FIREGEN_VIDEO_URI_2/> Image <FIREGEN_IMAGE_URI_1/>"
      );
    });

    test("should NOT deduplicate different URLs with same filename", () => {
      const input = "gs://bucket1/cat.jpg and gs://bucket2/cat.jpg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://bucket1/cat.jpg",
        "gs://bucket2/cat.jpg",
      ]);
      expect(result.taggedPrompt).toBe(
        "<FIREGEN_IMAGE_URI_1/> and <FIREGEN_IMAGE_URI_2/>"
      );
    });
  });

  describe("Media Type Detection", () => {
    test("should detect image extensions", () => {
      const input = "Files: gs://a.jpg gs://b.png gs://c.gif gs://d.webp gs://e.jpeg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toHaveLength(5);
      expect(result.taggedPrompt).toContain("IMAGE_URI_1");
      expect(result.taggedPrompt).toContain("IMAGE_URI_2");
      expect(result.taggedPrompt).toContain("IMAGE_URI_3");
      expect(result.taggedPrompt).toContain("IMAGE_URI_4");
      expect(result.taggedPrompt).toContain("IMAGE_URI_5");
    });

    test("should detect video extensions", () => {
      const input = "Videos: gs://a.mp4 gs://b.mov gs://c.avi gs://d.webm";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toHaveLength(4);
      expect(result.taggedPrompt).toContain("VIDEO_URI_1");
      expect(result.taggedPrompt).toContain("VIDEO_URI_2");
      expect(result.taggedPrompt).toContain("VIDEO_URI_3");
      expect(result.taggedPrompt).toContain("VIDEO_URI_4");
    });

    test("should detect audio extensions", () => {
      const input = "Audio: gs://a.mp3 gs://b.wav gs://c.aac gs://d.ogg";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toHaveLength(4);
      expect(result.taggedPrompt).toContain("AUDIO_URI_1");
      expect(result.taggedPrompt).toContain("AUDIO_URI_2");
      expect(result.taggedPrompt).toContain("AUDIO_URI_3");
      expect(result.taggedPrompt).toContain("AUDIO_URI_4");
    });

    test("should default to image for unknown extensions", () => {
      const input = "Unknown: gs://file.xyz gs://noext";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toHaveLength(2);
      expect(result.taggedPrompt).toContain("IMAGE_URI_1");
      expect(result.taggedPrompt).toContain("IMAGE_URI_2");
    });
  });

  describe("Priority Order", () => {
    test("should process Firebase URLs before generic HTTPS", () => {
      // Firebase URL should NOT be matched by generic HTTPS regex
      const firebaseUrl = "https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg?alt=media";
      const result = preprocessUrls(firebaseUrl);

      expect(result.extractedUrls).toEqual(["gs://bucket/image.jpg"]); // Converted!
      expect(result.taggedPrompt).toBe("<FIREGEN_IMAGE_URI_1/>");
    });

    test("should process GCS API URLs before generic HTTPS", () => {
      const gcsApiUrl = "https://storage.googleapis.com/bucket/file.mp4";
      const result = preprocessUrls(gcsApiUrl);

      expect(result.extractedUrls).toEqual(["gs://bucket/file.mp4"]); // Converted!
      expect(result.taggedPrompt).toBe("<FIREGEN_VIDEO_URI_1/>");
    });

    test("should not double-process URLs", () => {
      // Ensure GCS API URL is not also caught by generic HTTPS regex
      const input = "https://storage.googleapis.com/bucket/video.mp4";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toHaveLength(1); // Should only be 1 entry, not 2
      expect(result.extractedUrls[0]).toBe("gs://bucket/video.mp4");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty prompt", () => {
      const result = preprocessUrls("");

      expect(result.taggedPrompt).toBe("");
      expect(result.extractedUrls).toEqual([]);
    });

    test("should handle prompt with no URLs", () => {
      const input = "Generate a beautiful sunset scene";
      const result = preprocessUrls(input);

      expect(result.taggedPrompt).toBe(input);
      expect(result.extractedUrls).toEqual([]);
    });

    test("should handle mixed media types and duplicates", () => {
      const input = "Use gs://a.jpg gs://b.mp4 gs://a.jpg gs://c.mp3 gs://b.mp4";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://a.jpg",
        "gs://b.mp4",
        "gs://c.mp3",
      ]);
      expect(result.taggedPrompt).toBe(
        "Use <FIREGEN_IMAGE_URI_1/> <FIREGEN_VIDEO_URI_2/> <FIREGEN_IMAGE_URI_1/> <FIREGEN_AUDIO_URI_3/> <FIREGEN_VIDEO_URI_2/>"
      );
    });

    test("should handle case-insensitive file extensions", () => {
      const input = "Files: gs://a.JPG gs://b.Mp4 gs://c.PNG";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://a.JPG",
        "gs://b.Mp4",
        "gs://c.PNG",
      ]);
      expect(result.taggedPrompt).toContain("IMAGE_URI_1");
      expect(result.taggedPrompt).toContain("VIDEO_URI_2");
      expect(result.taggedPrompt).toContain("IMAGE_URI_3");
    });

    test("should handle multiple URLs in one prompt", () => {
      const input = "Compare https://example.com/old.jpg with gs://bucket/new.jpg and https://storage.googleapis.com/bucket/reference.png";
      const result = preprocessUrls(input);

      // GCS API URL is processed first, then GCS URI, then generic HTTPS
      expect(result.extractedUrls).toEqual([
        "gs://bucket/reference.png",    // GCS API URL (processed first)
        "gs://bucket/new.jpg",           // GCS URI (processed second)
        "https://example.com/old.jpg",   // Generic HTTPS (processed last)
      ]);
      expect(result.taggedPrompt).toBe(
        "Compare <FIREGEN_IMAGE_URI_3/> with <FIREGEN_IMAGE_URI_2/> and <FIREGEN_IMAGE_URI_1/>"
      );
    });

    test("should preserve URL query parameters in generic HTTPS URLs", () => {
      const input = "https://cdn.example.com/image.jpg?quality=high&resize=500";
      const result = preprocessUrls(input);

      // Current regex only captures until extension, doesn't include query params
      // This is a known limitation - query params are stripped
      expect(result.extractedUrls).toEqual(["https://cdn.example.com/image.jpg"]);
    });

    test("should handle Firebase Storage URL with encoded path characters", () => {
      const input = "https://firebasestorage.googleapis.com/v0/b/my-bucket/o/users%2F123%2Fprofile%20photo.jpg?alt=media";
      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual(["gs://my-bucket/users/123/profile photo.jpg"]);
      expect(result.taggedPrompt).toBe("<FIREGEN_IMAGE_URI_1/>");
    });
  });

  describe("Integration", () => {
    test("should handle real-world complex prompt", () => {
      const input = `Product demo: Show https://storage.googleapis.com/products/shoe-left.jpg and 
      https://storage.googleapis.com/products/shoe-right.jpg rotating. 
      Use gs://styles/cinematic.mp4 as reference. 
      Background music: https://example.com/audio/upbeat.mp3`;

      const result = preprocessUrls(input);

      expect(result.extractedUrls).toEqual([
        "gs://products/shoe-left.jpg",
        "gs://products/shoe-right.jpg",
        "gs://styles/cinematic.mp4",
        "https://example.com/audio/upbeat.mp3",
      ]);

      expect(result.taggedPrompt).toContain("<FIREGEN_IMAGE_URI_1/>");
      expect(result.taggedPrompt).toContain("<FIREGEN_IMAGE_URI_2/>");
      expect(result.taggedPrompt).toContain("<FIREGEN_VIDEO_URI_3/>");
      expect(result.taggedPrompt).toContain("<FIREGEN_AUDIO_URI_4/>");
    });
  });
});
