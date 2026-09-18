import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTrackDetailPath } from "./trackRoute";

describe("isTrackDetailPath", () => {
  it("accepts /track/:id", () => {
    assert.equal(isTrackDetailPath("/track/63"), true);
    assert.equal(isTrackDetailPath("/track/63/"), true);
  });

  it("rejects leaving NEX track playback", () => {
    assert.equal(isTrackDetailPath("/"), false);
    assert.equal(isTrackDetailPath("/music"), false);
    assert.equal(isTrackDetailPath("/track"), false);
    assert.equal(isTrackDetailPath("/track/63/edit"), false);
  });
});
