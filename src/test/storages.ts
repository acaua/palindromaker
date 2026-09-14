// In-memory Storage doubles: MemoryStorage behaves, FailingStorage refuses
// writes, and ThrowingStorage refuses reads too (the blocked-site-storage
// case, where even touching the key throws).
export class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

export class FailingStorage {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error("quota exceeded");
  }
}

export class ThrowingStorage {
  getItem(): string | null {
    throw new Error("access denied");
  }

  setItem(): void {
    throw new Error("access denied");
  }
}
