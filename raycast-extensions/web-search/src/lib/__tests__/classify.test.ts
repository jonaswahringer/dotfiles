import { describe, expect, it } from "vitest";
import { classifyInput } from "../classify";

describe("classifyInput", () => {
  it.each(["", "   ", "\t\n"])("treats blank %j as a new window", (input) => {
    expect(classifyInput(input)).toEqual({ kind: "blank" });
  });

  it.each([
    ["https://example.com", "https://example.com"],
    ["HTTP://Example.com/a?b=1#c", "HTTP://Example.com/a?b=1#c"],
    ["  https://example.com/path  ", "https://example.com/path"],
    ["http://localhost:3000/x", "http://localhost:3000/x"],
  ])("keeps HTTP URL %j", (input, url) => {
    expect(classifyInput(input)).toEqual({ kind: "url", url });
  });

  it.each([
    ["github.com", "https://github.com"],
    ["docs.github.com/en?x=1", "https://docs.github.com/en?x=1"],
    ["example.org:8080/path#frag", "https://example.org:8080/path#frag"],
    ["EXAMPLE.CO.UK", "https://EXAMPLE.CO.UK"],
  ])("prefixes bare domain %j", (input, url) => {
    expect(classifyInput(input)).toEqual({ kind: "url", url });
  });

  it.each([
    "hello world",
    "github.com is down",
    "localhost",
    "ftp://example.com",
    "file.txt notes",
    "https://",
    "https://exa mple.com",
    "a.b",
    "1.5",
  ])("searches Google for %j", (input) => {
    const intent = classifyInput(input);
    expect(intent.kind).toBe("search");
  });

  it("encodes every reserved character in the query", () => {
    expect(classifyInput("c++ & rust? 100% #1")).toEqual({
      kind: "search",
      query: "c++ & rust? 100% #1",
      url: "https://www.google.com/search?q=c%2B%2B%20%26%20rust%3F%20100%25%20%231",
    });
  });

  it("trims the query and encodes unicode", () => {
    const intent = classifyInput("  café  ");
    expect(intent).toEqual({ kind: "search", query: "café", url: "https://www.google.com/search?q=caf%C3%A9" });
  });
});
