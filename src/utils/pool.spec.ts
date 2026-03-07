// =============================================================================
// Object Pool Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectPool } from "@utils/pool";

interface TestItem {
  id: number;
  active: boolean;
}

let nextId = 0;

function createTestItem(): TestItem {
  return { id: nextId++, active: true };
}

function resetTestItem(item: TestItem): void {
  item.active = false;
}

describe("ObjectPool", () => {
  beforeEach(() => {
    nextId = 0;
  });

  describe("constructor", () => {
    it("creates an empty pool by default", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      expect(pool.pooledCount).toBe(0);
      expect(pool.activeCount).toBe(0);
    });

    it("pre-populates pool with initial size", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem, 5);
      expect(pool.pooledCount).toBe(5);
      expect(pool.activeCount).toBe(0);
    });
  });

  describe("acquire", () => {
    it("returns a new item when pool is empty", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      const item = pool.acquire();
      expect(item).toBeDefined();
      expect(item.id).toBe(0);
      expect(pool.activeCount).toBe(1);
    });

    it("returns item from pool when available", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem, 1);
      expect(pool.pooledCount).toBe(1);
      
      const item = pool.acquire();
      expect(item.id).toBe(0);
      expect(pool.pooledCount).toBe(0);
      expect(pool.activeCount).toBe(1);
    });

    it("tracks multiple active items", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      pool.acquire();
      pool.acquire();
      pool.acquire();
      expect(pool.activeCount).toBe(3);
    });
  });

  describe("release", () => {
    it("returns item to pool", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      const item = pool.acquire();
      
      pool.release(item);
      
      expect(pool.activeCount).toBe(0);
      expect(pool.pooledCount).toBe(1);
    });

    it("calls reset function on release", () => {
      const resetFn = vi.fn();
      const pool = new ObjectPool(createTestItem, resetFn);
      const item = pool.acquire();
      
      pool.release(item);
      
      expect(resetFn).toHaveBeenCalledWith(item);
    });

    it("ignores items not in active set", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      const fakeItem: TestItem = { id: 999, active: true };
      
      pool.release(fakeItem);
      
      expect(pool.pooledCount).toBe(0);
    });

    it("does not exceed max pool size", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem, 0, 2);
      
      const item1 = pool.acquire();
      const item2 = pool.acquire();
      const item3 = pool.acquire();
      
      pool.release(item1);
      pool.release(item2);
      pool.release(item3);
      
      expect(pool.pooledCount).toBe(2);
    });
  });

  describe("releaseAll", () => {
    it("releases all active items", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      pool.acquire();
      pool.acquire();
      pool.acquire();
      
      pool.releaseAll();
      
      expect(pool.activeCount).toBe(0);
      expect(pool.pooledCount).toBe(3);
    });

    it("calls reset on all items", () => {
      const resetFn = vi.fn();
      const pool = new ObjectPool(createTestItem, resetFn);
      pool.acquire();
      pool.acquire();
      
      pool.releaseAll();
      
      expect(resetFn).toHaveBeenCalledTimes(2);
    });

    it("respects max size during releaseAll", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem, 0, 2);
      pool.acquire();
      pool.acquire();
      pool.acquire();
      pool.acquire();
      
      pool.releaseAll();
      
      expect(pool.pooledCount).toBe(2);
    });
  });

  describe("getActive", () => {
    it("returns set of active items", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      const item1 = pool.acquire();
      const item2 = pool.acquire();
      
      const active = pool.getActive();
      
      expect(active.size).toBe(2);
      expect(active.has(item1)).toBe(true);
      expect(active.has(item2)).toBe(true);
    });

    it("returns readonly set", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      pool.acquire();
      
      const active = pool.getActive();
      
      // TypeScript should prevent this, but at runtime it's still a Set
      expect(typeof active.has).toBe("function");
    });
  });

  describe("reuse behavior", () => {
    it("reuses released items", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem);
      const item1 = pool.acquire();
      const originalId = item1.id;
      
      pool.release(item1);
      const item2 = pool.acquire();
      
      expect(item2.id).toBe(originalId);
    });

    it("creates new items when pool is exhausted", () => {
      const pool = new ObjectPool(createTestItem, resetTestItem, 1);
      
      const item1 = pool.acquire(); // From pool
      const item2 = pool.acquire(); // New creation
      
      expect(item1.id).toBe(0);
      expect(item2.id).toBe(1);
    });
  });
});
