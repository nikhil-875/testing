import NodeCache from 'node-cache';

class MemoryManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
  }

  set(key: string, field: string, value: any, ttl: number = 0) {
    const existing = this.cache.get<Record<string, any>>(key) || {};
    existing[field] = value;
    this.cache.set(key, existing, ttl);
  }

  get(key: string, field: string) {
    const existing = this.cache.get<Record<string, any>>(key);
    return existing ? existing[field] : null;
  }

  delete(key: string, field: string) {
    const existing = this.cache.get<Record<string, any>>(key);
    if (existing) {
      delete existing[field];
      this.cache.set(key, existing);
    }
  }
}

export const memoryManager = new MemoryManager();
