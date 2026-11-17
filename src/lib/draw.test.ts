import { describe, expect, it } from "vitest";
import { drawCycle } from "./draw";

describe("drawCycle", () => {
  it("never assigns anyone to themselves and is a permutation (1000 runs)", () => {
    for (let run = 0; run < 1000; run++) {
      const n = 3 + (run % 20);
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const pairs = drawCycle(ids);
      expect(pairs).toHaveLength(n);
      expect(new Set(pairs.map((p) => p.giver)).size).toBe(n);
      expect(new Set(pairs.map((p) => p.receiver)).size).toBe(n);
      for (const p of pairs) expect(p.giver).not.toBe(p.receiver);
    }
  });

  it("rejects fewer than 3 participants", () => {
    expect(() => drawCycle(["a", "b"])).toThrow();
  });

  it("rejects duplicates", () => {
    expect(() => drawCycle(["a", "b", "a"])).toThrow();
  });

  it("produces varied results", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++)
      seen.add(drawCycle(["a", "b", "c", "d", "e"]).map((p) => p.receiver).join(""));
    expect(seen.size).toBeGreaterThan(5);
  });
});
