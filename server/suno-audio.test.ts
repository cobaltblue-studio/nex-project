import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeBrowserMediaBytes, pickPlayableFromClip } from "./suno-audio";

describe("looksLikeBrowserMediaBytes", () => {
  it("accepts ftyp ISO BMFF", () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(16, 0);
    buf.write("ftyp", 4);
    buf.write("isom", 8);
    assert.equal(looksLikeBrowserMediaBytes(buf), true);
  });

  it("rejects Suno ciphertext (high-entropy non-ftyp)", () => {
    const buf = Buffer.from("bbb32529893f2d55e6f433254216e2c49a5324b7a577d07359ad6affa9fb102c", "hex");
    assert.equal(looksLikeBrowserMediaBytes(buf), false);
  });
});

describe("pickPlayableFromClip", () => {
  const uuid = "2c2a9bb7-9144-4734-9d34-0026172b9948";

  it("prefers video_url over m4a-opus", () => {
    const picked = pickPlayableFromClip(
      {
        id: uuid,
        title: "Rich Man",
        video_url: `https://cdn1.suno.ai/${uuid}.mp4`,
        audio_url: "https://studio-api.prod.suno.com/api/forbidden",
        media_urls: [
          {
            url: `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${uuid}.m4a`,
            content_type: "m4a-opus",
            encoding: "1.0.0",
          },
        ],
        metadata: { duration: 206.4 },
      },
      uuid,
    );
    assert.ok(picked);
    assert.equal(picked!.kind, "video");
    assert.equal(picked!.source, "video_url");
    assert.equal(picked!.upstreamUrl, `https://cdn1.suno.ai/${uuid}.mp4`);
    assert.equal(picked!.durationSeconds, 206);
  });

  it("skips encoded m4a-opus and falls back to cdn_mp4", () => {
    const picked = pickPlayableFromClip(
      {
        id: uuid,
        video_url: "",
        audio_url: "https://studio-api.prod.suno.com/api/forbidden",
        media_urls: [
          {
            url: `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${uuid}.m4a`,
            content_type: "m4a-opus",
            delivery: "progressive",
            encoding: "1.0.0",
          },
        ],
        metadata: { duration: 175.84 },
      },
      uuid,
    );
    assert.ok(picked);
    assert.equal(picked!.source, "cdn_mp4");
    assert.equal(picked!.kind, "video");
  });

  it("ignores forbidden audio_url", () => {
    const picked = pickPlayableFromClip(
      {
        id: uuid,
        video_url: "",
        audio_url: "https://studio-api.prod.suno.com/api/forbidden",
        media_urls: [],
      },
      uuid,
    );
    assert.ok(picked);
    assert.equal(picked!.source, "cdn_mp4");
  });

  it("prefers media mp3 over m4a when both present", () => {
    const picked = pickPlayableFromClip(
      {
        id: uuid,
        video_url: "",
        media_urls: [
          {
            url: `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${uuid}.m4a`,
            content_type: "m4a-opus",
            encoding: "1.0.0",
          },
          {
            url: `https://cdn1.suno.ai/${uuid}.mp3`,
            content_type: "mp3",
          },
        ],
      },
      uuid,
    );
    assert.ok(picked);
    assert.equal(picked!.source, "media_mp3");
    assert.equal(picked!.kind, "audio");
  });
});
