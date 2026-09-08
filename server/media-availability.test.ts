import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { describePlaybackIssue, inspectSoundCloudOembed } from "./media-availability";

describe("inspectSoundCloudOembed", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns ok on 200 JSON", async () => {
    mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200 }));
    assert.equal(
      await inspectSoundCloudOembed("https://soundcloud.com/artist/track"),
      "ok",
    );
  });

  it("returns blocked on 404", async () => {
    mock.method(globalThis, "fetch", async () => new Response("Not Found", { status: 404 }));
    assert.equal(
      await inspectSoundCloudOembed("https://soundcloud.com/mdrjr/give-yourself-a-chance"),
      "blocked",
    );
  });

  it("returns blocked on 403", async () => {
    mock.method(globalThis, "fetch", async () => new Response("Forbidden", { status: 403 }));
    assert.equal(
      await inspectSoundCloudOembed("https://soundcloud.com/artist/private-track"),
      "blocked",
    );
  });

  it("returns unknown on network failure", async () => {
    mock.method(globalThis, "fetch", async () => {
      throw new Error("network down");
    });
    assert.equal(
      await inspectSoundCloudOembed("https://soundcloud.com/artist/track"),
      "unknown",
    );
  });
});

describe("describePlaybackIssue", () => {
  it("explains private_or_removed for SoundCloud dead links", () => {
    const msg = describePlaybackIssue({
      source: "soundcloud",
      reason: "private_or_removed",
    });
    assert.match(msg.en, /private|removed|inaccessible/i);
    assert.ok(msg.ko.length > 0);
  });
});
