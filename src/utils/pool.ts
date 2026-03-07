// =============================================================================
// Object Pool - Reuse objects to avoid GC stutters
// =============================================================================

export class ObjectPool<T> {
  private pool: T[] = [];
  private activeItems: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (item: T) => void,
    initialSize: number = 0,
    maxSize: number = Infinity
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /** Get an item from the pool or create a new one */
  acquire(): T {
    let item: T;

    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.createFn();
    }

    this.activeItems.add(item);
    return item;
  }

  /** Return an item to the pool */
  release(item: T): void {
    if (!this.activeItems.has(item)) return;

    this.activeItems.delete(item);
    this.resetFn(item);

    if (this.pool.length < this.maxSize) {
      this.pool.push(item);
    }
  }

  /** Release all active items */
  releaseAll(): void {
    for (const item of this.activeItems) {
      this.resetFn(item);
      if (this.pool.length < this.maxSize) {
        this.pool.push(item);
      }
    }
    this.activeItems.clear();
  }

  /** Get all currently active items */
  getActive(): ReadonlySet<T> {
    return this.activeItems;
  }

  /** Get count of active items */
  get activeCount(): number {
    return this.activeItems.size;
  }

  /** Get count of pooled items */
  get pooledCount(): number {
    return this.pool.length;
  }
}
