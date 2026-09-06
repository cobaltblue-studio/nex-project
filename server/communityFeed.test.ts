import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCommunityPostInput } from "../shared/community";

describe("normalizeCommunityPostInput", () => {
  it("allows talk post with body only and no track", () => {
    const out = normalizeCommunityPostInput({
      kind: "talk",
      title: "",
      body: "오늘 훅 아이디어 메모",
      attachedTrackId: null,
    });
    assert.equal(out.kind, "talk");
    assert.equal(out.attachedTrackId, null);
    assert.ok(out.title.length > 0);
    assert.equal(out.category, "track-share");
  });

  it("allows track kind without attachedTrackId", () => {
    const out = normalizeCommunityPostInput({
      kind: "track",
      title: "자랑할 곡",
      body: "아직 첨부 전",
      attachedTrackId: null,
      category: "track-share",
    });
    assert.equal(out.attachedTrackId, null);
  });

  it("requires title for discussion", () => {
    assert.throws(
      () =>
        normalizeCommunityPostInput({
          kind: "discussion",
          title: "  ",
          body: "본문만 있음",
        }),
      (err: Error) => err.message === "EMPTY_TITLE",
    );
  });

  it("rejects empty body", () => {
    assert.throws(
      () =>
        normalizeCommunityPostInput({
          kind: "talk",
          title: "제목",
          body: "   ",
        }),
      (err: Error) => err.message === "EMPTY_BODY",
    );
  });
});
