import type { Event, Task } from "@/types";
import { calculateEventPosition } from "./calendar-utils";

// Cache entry with metadata for intelligent invalidation
interface CacheEntry {
  position: { top: number; height: number };
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  dependencies: string[]; // IDs of related items that could invalidate this cache
}

// Position cache configuration
interface PositionCacheConfig {
  maxSize: number;
  maxAge: number; // Maximum age in milliseconds
  enableMetrics: boolean;
}

// Cache metrics for performance monitoring
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  invalidations: number;
  averageAccessTime: number;
}

/**
 * Intelligent position calculation cache with LRU eviction and dependency tracking
 */
export class PositionCache {
  private cache = new Map<string, CacheEntry>();
  private accessTimes: number[] = [];
  private config: PositionCacheConfig;
  private metrics: CacheMetrics;

  constructor(config: Partial<PositionCacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      maxAge: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      averageAccessTime: 0,
    };
  }

  /**
   * Generate cache key for an event/task
   */
  private getCacheKey(item: Event | Task): string {
    const startTime = "startTime" in item ? item.startTime : item.scheduledTime;
    const endTime = "endTime" in item ? item.endTime : item.scheduledTime;

    if (!startTime || !endTime) {
      return `invalid-${item.id}`;
    }

    // Include time precision up to minutes for cache efficiency
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    return `${item.id}-${startMinutes}-${endMinutes}`;
  }

  /**
   * Get position from cache or calculate if not cached
   */
  getPosition(item: Event | Task): { top: number; height: number } {
    const startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const cacheKey = this.getCacheKey(item);
    const entry = this.cache.get(cacheKey);

    // Check if entry exists and is still valid
    if (entry && this.isEntryValid(entry)) {
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      if (this.config.enableMetrics) {
        this.metrics.hits++;
        this.recordAccessTime(performance.now() - startTime);
      }

      return entry.position;
    }

    // Cache miss - calculate position
    if (this.config.enableMetrics) {
      this.metrics.misses++;
    }

    const position = calculateEventPosition(item);

    // Store in cache
    this.setPosition(cacheKey, position, item);

    return position;
  }

  /**
   * Store position in cache with dependencies
   */
  private setPosition(
    cacheKey: string,
    position: { top: number; height: number },
    item: Event | Task
  ): void {
    // Evict entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Determine dependencies for invalidation
    const dependencies = this.getDependencies(item);

    const entry: CacheEntry = {
      position,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      dependencies,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Get dependencies that could invalidate this cache entry
   */
  private getDependencies(item: Event | Task): string[] {
    const dependencies: string[] = [];

    // For events with attendees, depend on attendee changes
    if ("attendees" in item && item.attendees.length > 0) {
      dependencies.push(`attendees-${item.id}`);
    }

    // For shared events, depend on sharing settings
    if ("isShared" in item && item.isShared) {
      dependencies.push(`sharing-${item.id}`);
    }

    return dependencies;
  }

  /**
   * Check if cache entry is still valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;

    // Check age limit
    if (age > this.config.maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    // Sort by last accessed time and access count
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Prioritize by last accessed time, then by access count
      if (entryA.lastAccessed !== entryB.lastAccessed) {
        return entryA.lastAccessed - entryB.lastAccessed;
      }

      return entryA.accessCount - entryB.accessCount;
    });

    // Remove oldest/least accessed entries
    const toRemove = Math.ceil(this.cache.size * 0.1); // Remove 10%
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      const key = entry[0];
      this.cache.delete(key);
      if (this.config.enableMetrics) {
        this.metrics.evictions++;
      }
    }
  }

  /**
   * Invalidate cache entries based on dependencies
   */
  invalidate(dependencyKey: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies.includes(dependencyKey)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (this.config.enableMetrics && keysToDelete.length > 0) {
      this.metrics.invalidations += keysToDelete.length;
    }
  }

  /**
   * Invalidate all cache entries for a specific item
   */
  invalidateItem(itemId: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache.entries()) {
      if (key.startsWith(itemId) || key.includes(`-${itemId}-`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (this.config.enableMetrics && keysToDelete.length > 0) {
      this.metrics.invalidations += keysToDelete.length;
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes = [];

    if (this.config.enableMetrics) {
      this.metrics.invalidations += this.cache.size;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    averageAccessTime: number;
    metrics: CacheMetrics;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      averageAccessTime: this.metrics.averageAccessTime,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Record access time for metrics
   */
  private recordAccessTime(accessTime: number): void {
    this.accessTimes.push(accessTime);

    // Keep only last 100 access times for average calculation
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }

    // Update average access time
    this.metrics.averageAccessTime =
      this.accessTimes.reduce((sum, time) => sum + time, 0) /
      this.accessTimes.length;
  }

  /**
   * Pre-warm cache with multiple items
   */
  prewarm(items: (Event | Task)[]): void {
    items.forEach((item) => {
      this.getPosition(item);
    });
  }

  /**
   * Get all cache keys (for debugging)
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry details (for debugging)
   */
  getCacheEntry(cacheKey: string): CacheEntry | undefined {
    return this.cache.get(cacheKey);
  }
}

// Global position cache instance
export const positionCache = new PositionCache({
  maxSize: 1000,
  maxAge: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true,
});

/**
 * Cached version of calculateEventPosition
 */
export function calculateEventPositionCached(item: Event | Task): {
  top: number;
  height: number;
} {
  return positionCache.getPosition(item);
}

/**
 * Hook for React components to use cached position calculations
 */
export function useCachedPosition(item: Event | Task) {
  return positionCache.getPosition(item);
}

/**
 * Cache invalidation strategies for different types of updates
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private invalidationQueue: Map<string, Set<string>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * Invalidate cache for a specific item (event/task)
   */
  invalidateItem(itemId: string): void {
    positionCache.invalidateItem(itemId);
  }

  /**
   * Invalidate cache for related items (e.g., when attendees change)
   */
  invalidateRelated(dependencyKey: string): void {
    positionCache.invalidate(dependencyKey);
  }

  /**
   * Batch multiple invalidations for better performance
   */
  batchInvalidate(invalidations: {
    itemIds?: string[];
    dependencyKeys?: string[];
  }): void {
    const { itemIds = [], dependencyKeys = [] } = invalidations;

    // Group invalidations by type for efficient processing
    if (itemIds.length > 0) {
      this.queueInvalidations("items", new Set(itemIds));
    }

    if (dependencyKeys.length > 0) {
      this.queueInvalidations("dependencies", new Set(dependencyKeys));
    }

    // Process batch after a short delay to group rapid updates
    this.scheduleBatchProcess();
  }

  /**
   * Queue invalidations for batched processing
   */
  private queueInvalidations(
    type: "items" | "dependencies",
    keys: Set<string>
  ): void {
    if (!this.invalidationQueue.has(type)) {
      this.invalidationQueue.set(type, new Set());
    }

    const queue = this.invalidationQueue.get(type)!;
    keys.forEach((key) => queue.add(key));
  }

  /**
   * Schedule batch processing with debouncing
   */
  private scheduleBatchProcess(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 16); // Process at next animation frame
  }

  /**
   * Process all queued invalidations
   */
  private processBatch(): void {
    // Process item invalidations
    const itemKeys = this.invalidationQueue.get("items");
    if (itemKeys) {
      itemKeys.forEach((key) => positionCache.invalidateItem(key));
      itemKeys.clear();
    }

    // Process dependency invalidations
    const dependencyKeys = this.invalidationQueue.get("dependencies");
    if (dependencyKeys) {
      dependencyKeys.forEach((key) => positionCache.invalidate(key));
      dependencyKeys.clear();
    }

    this.batchTimeout = null;
  }

  /**
   * Smart invalidation based on update type
   */
  handleUpdate(
    updateType: "time" | "attendees" | "sharing" | "content",
    item: Event | Task
  ): void {
    switch (updateType) {
      case "time":
        // Time changes affect only this item's position
        this.invalidateItem(item.id);
        break;

      case "attendees":
        // Attendee changes affect shared events and related items
        if ("isShared" in item && item.isShared) {
          this.invalidateRelated(`attendees-${item.id}`);
        }
        break;

      case "sharing":
        // Sharing changes affect all related shared events
        if ("isShared" in item && item.isShared) {
          this.invalidateRelated(`sharing-${item.id}`);
        }
        break;

      case "content":
        // Content changes don't affect position, no invalidation needed
        break;
    }
  }

  /**
   * Clear all queued invalidations
   */
  clearQueue(): void {
    this.invalidationQueue.clear();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Global invalidation manager instance
export const cacheInvalidationManager = CacheInvalidationManager.getInstance();

/**
 * React hook for handling cache invalidation
 */
export function useCacheInvalidation() {
  return {
    invalidateItem: (itemId: string) =>
      cacheInvalidationManager.invalidateItem(itemId),
    invalidateRelated: (dependencyKey: string) =>
      cacheInvalidationManager.invalidateRelated(dependencyKey),
    batchInvalidate: (invalidations: {
      itemIds?: string[];
      dependencyKeys?: string[];
    }) => cacheInvalidationManager.batchInvalidate(invalidations),
    handleUpdate: (
      updateType: "time" | "attendees" | "sharing" | "content",
      item: Event | Task
    ) => cacheInvalidationManager.handleUpdate(updateType, item),
  };
}
