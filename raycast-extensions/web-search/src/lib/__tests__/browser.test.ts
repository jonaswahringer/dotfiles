import { describe, expect, it } from "vitest";
import { buildOpenArgs, resolveBrowserPath } from "../browser";
import { classifyInput } from "../classify";

describe("buildOpenArgs", () => {
  it("opens a blank new window", () => {
    expect(buildOpenArgs("/Applications/Helium.app", classifyInput(""))).toEqual([
      "-na",
      "/Applications/Helium.app",
      "--args",
      "--new-window",
    ]);
  });

  it("passes hostile input as one inert argv entry", () => {
    const input = '"; rm -rf ~; $(whoami) `id` & --user-data-dir=/tmp/x';
    const args = buildOpenArgs("/Applications/Helium.app", classifyInput(input));
    expect(args).toHaveLength(5);
    expect(args[4]).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(args[4]).not.toMatch(/[ "`$;&]/);
  });

  it("passes a URL unchanged as the last argument", () => {
    expect(buildOpenArgs("/A.app", classifyInput("github.com")).at(-1)).toBe("https://github.com");
  });
});

describe("resolveBrowserPath", () => {
  it("defaults, trims and expands ~", () => {
    expect(resolveBrowserPath(undefined)).toBe("/Applications/Helium.app");
    expect(resolveBrowserPath("  ")).toBe("/Applications/Helium.app");
    expect(resolveBrowserPath("~/Apps/B.app", "/Users/x")).toBe("/Users/x/Apps/B.app");
    expect(resolveBrowserPath("/Applications/Other.app")).toBe("/Applications/Other.app");
  });
});
