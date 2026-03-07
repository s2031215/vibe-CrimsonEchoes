// =============================================================================
// PixiJS Mock for Testing
// =============================================================================

export class Container {
  public x = 0;
  public y = 0;
  public visible = true;
  public children: unknown[] = [];

  addChild(child: unknown): void {
    this.children.push(child);
  }

  removeChild(child: unknown): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
    }
  }
}

export class Graphics {
  public x = 0;
  public y = 0;

  clear(): this {
    return this;
  }

  rect(_x: number, _y: number, _w: number, _h: number): this {
    return this;
  }

  circle(_x: number, _y: number, _r: number): this {
    return this;
  }

  moveTo(_x: number, _y: number): this {
    return this;
  }

  lineTo(_x: number, _y: number): this {
    return this;
  }

  closePath(): this {
    return this;
  }

  fill(_color: number): this {
    return this;
  }
}

// Mock texture source that can be used in Texture constructor
class MockTextureSource {
  public width = 64;
  public height = 64;
}

export class Texture {
  public source: MockTextureSource;
  public frame: Rectangle | null = null;

  constructor(options?: { source?: MockTextureSource; frame?: Rectangle }) {
    this.source = options?.source ?? new MockTextureSource();
    this.frame = options?.frame ?? null;
  }

  public static WHITE = new Texture();

  public static from(_path: string): Texture {
    return new Texture();
  }
}

export class Sprite {
  public texture: Texture;
  public anchor = { x: 0, y: 0, set(_x: number, _y?: number): void {} };
  public scale = { x: 1, y: 1, set(_x: number, _y?: number): void {} };
  public tint = 0xffffff;
  public rotation = 0;

  constructor(texture?: Texture) {
    this.texture = texture || new Texture();
  }
}

export class Rectangle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0
  ) {}
}

export class Application {
  public stage = new Container();
  public canvas = {
    style: {
      width: "",
      height: "",
      imageRendering: "",
    },
  };
  public ticker = {
    add(_callback: unknown): void {},
  };

  async init(_options: unknown): Promise<void> {
    return Promise.resolve();
  }
}

// Mock Assets module
const assetCache = new Map<string, Texture>();

export const Assets = {
  add(_options: { alias: string; src: string }): void {
    // Pre-populate the cache with a mock texture
    assetCache.set(_options.alias, new Texture());
  },
  async load(_keys: string[]): Promise<void> {
    return Promise.resolve();
  },
  get<T>(_key: string): T | undefined {
    // Return a mock texture for any key
    if (!assetCache.has(_key)) {
      assetCache.set(_key, new Texture());
    }
    return assetCache.get(_key) as T;
  },
};
