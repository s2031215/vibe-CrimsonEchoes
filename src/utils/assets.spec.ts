// =============================================================================
// Asset Loading Tests
// =============================================================================
// NOTE: All graphics are now procedurally generated - no external assets needed

import { describe, it, expect } from "vitest";
import { loadAssets } from "@utils/assets";

describe("Asset Loading", () => {
  describe("loadAssets", () => {
    it("returns a promise that resolves (no-op with procedural graphics)", async () => {
      const result = loadAssets();
      expect(result).toBeInstanceOf(Promise);
      await result; // Should resolve without errors
    });
  });
});
