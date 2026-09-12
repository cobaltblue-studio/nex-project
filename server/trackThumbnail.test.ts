import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSunoCoverImageUrl, resolveTrackThumbnailUrl } from "@shared/trackThumbnail";

describe("normalizeSunoCoverImageUrl", () => {
  it("rewrites cdn2 image_ to cdn1 image_large_", () => {
    const uuid = "2c2a9bb7-9144-4734-9d34-0026172b9948";
    assert.equal(
      normalizeSunoCoverImageUrl(`https://cdn2.suno.ai/image_${uuid}.jpeg`),
      `https://cdn1.suno.ai/image_large_${uuid}.jpeg`,
    );
  });

  it("rewrites cdn2 image_large_ to cdn1 image_large_", () => {
    const uuid = "3b0e0e31-acac-45ed-b999-49a8a08ff461";
    assert.equal(
      normalizeSunoCoverImageUrl(`https://cdn2.suno.ai/image_large_${uuid}.jpeg`),
      `https://cdn1.suno.ai/image_large_${uuid}.jpeg`,
    );
  });

  it("leaves non-Suno URLs unchanged", () => {
    const u = "https://images.unsplash.com/photo-1";
    assert.equal(normalizeSunoCoverImageUrl(u), u);
  });
});

describe("resolveTrackThumbnailUrl", () => {
  it("normalizes Suno covers before return", () => {
    const uuid = "2c2a9bb7-9144-4734-9d34-0026172b9948";
    assert.equal(
      resolveTrackThumbnailUrl({
        coverImageUrl: `https://cdn2.suno.ai/image_${uuid}.jpeg`,
      }),
      `https://cdn1.suno.ai/image_large_${uuid}.jpeg`,
    );
  });
});
