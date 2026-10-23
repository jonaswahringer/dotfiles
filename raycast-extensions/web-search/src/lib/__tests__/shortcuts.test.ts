import { describe, expect, it } from "vitest";
import { CLEAR_SHORTCUT, COMPLETE_SHORTCUT, DELETE_SHORTCUT } from "../shortcuts";

describe("shortcuts", () => {
  it("completion is ⌘↵, never a bare key", () => {
    expect(COMPLETE_SHORTCUT).toEqual({ modifiers: ["cmd"], key: "return" });
  });

  it("no two actions share a shortcut", () => {
    const all = [COMPLETE_SHORTCUT, DELETE_SHORTCUT, CLEAR_SHORTCUT].map((s) => [...s.modifiers, s.key].join("+"));
    expect(new Set(all).size).toBe(all.length);
  });
});
