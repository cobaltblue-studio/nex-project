import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { inspectYoutubeVideoAvailability } from "./youtube-availability";

const VIDEO_URL = "https://youtu.be/XjIxJOkxWLo";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

describe("inspectYoutubeVideoAvailability", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("blocks embed-disabled videos even when oEmbed returns a title", async () => {
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oembed")) {
        return jsonResponse({ title: "It All Fades", author_name: "x" });
      }
      if (url.includes("/watch")) {
        return htmlResponse(
          `"playabilityStatus":{"status":"OK","playableInEmbed":false}` +
            `Playback on other websites has been disabled by the video owner`,
        );
      }
      return htmlResponse("<html></html>");
    });

    const out = await inspectYoutubeVideoAvailability(VIDEO_URL);
    assert.deepEqual(out, { status: "blocked", reason: "embed_blocked" });
  });

  it("returns ok when watch playability is OK and embeddable", async () => {
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oembed")) {
        return jsonResponse({ title: "Just a Little Light", author_name: "x" });
      }
      if (url.includes("/watch")) {
        return htmlResponse(`"playabilityStatus":{"status":"OK"} "playableInEmbed":true`);
      }
      return htmlResponse("<html></html>");
    });

    const out = await inspectYoutubeVideoAvailability("https://youtu.be/acUcWTSEbTs");
    assert.deepEqual(out, { status: "ok" });
  });

  it("does not treat oEmbed title alone as ok when watch HTML is inconclusive", async () => {
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oembed")) {
        return jsonResponse({ title: "Mystery", author_name: "x" });
      }
      // Consent / bot shell with no playability signals
      return htmlResponse("<html><body>consent</body></html>");
    });

    const out = await inspectYoutubeVideoAvailability(VIDEO_URL);
    assert.deepEqual(out, { status: "unknown" });
  });

  it("blocks on oEmbed 404", async () => {
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oembed")) {
        return new Response("Not Found", { status: 404 });
      }
      return htmlResponse("<html></html>");
    });

    const out = await inspectYoutubeVideoAvailability(VIDEO_URL);
    assert.deepEqual(out, { status: "blocked", reason: "private_or_removed" });
  });
});
