import { describe, expect, it } from "vitest";

import { normalizeArgentinaPhone } from "../../src/lib/server/phone/argentina";

describe("normalizeArgentinaPhone", () => {
  it.each([
    ["+54 9 11 2345-6789", "+5491123456789"],
    ["+5491123456789", "+5491123456789"],
    ["0054 9 11 2345-6789", "+5491123456789"],
    ["5491123456789", "+5491123456789"],
    ["011 15-2345-6789", "+5491123456789"],
    ["0341 15 234-5678", "+5493412345678"],
  ])("normalizes supported Argentine notation %s", (input, expected) => {
    expect(normalizeArgentinaPhone(input)).toBe(expected);
  });

  it.each([
    ["1123456789", "ambiguous bare national number"],
    ["541123456789", "bare country prefix without international mobile notation"],
    ["+55 11 2345-6789", "foreign country code"],
    ["+0054 9 11 2345-6789", "mixed plus and 00 country prefixes"],
    ["+00549 11 2345-6789", "mixed plus and 00 mobile prefixes"],
    ["+54 9 11 2345-6789 ext 1", "extension"],
    ["+54 9 11 2345-678x", "malformed characters"],
    ["0999 15 234-5678", "invalid area code in pinned maximum metadata"],
    ["011 15 15 234567", "multiple domestic 15 split candidates"],
  ])("rejects %s", (input) => {
    expect(normalizeArgentinaPhone(input)).toBeNull();
  });
});
