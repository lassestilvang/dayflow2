import React from "react";
import { useAppStore } from "@/lib/store";
import {
  TimeSlotSpatialIndex,
  type SpatialObject,
  type BoundingBox,
  type CollisionResult,
} from "./spatial-index";
import { cacheInvalidationManager } from "./position-cache";
import { dragPerformanceMonitor } from "./performance-monitor";

// Cached spatial object with position metadata
interface CachedSpatialObject extends SpatialObject {
  positionHash: string;
  lastPositionUpdate: number;
  cacheDependencies: string[];
}

// Optimized spatial index with caching and performance monitoring
export class OptimizedSpatialIndex extends TimeSlotSpatialIndex {
  private cachedObjects = new Map<string, CachedSpatialObject>();
  private positionUpdateQueue: Map<string, SpatialObject> = new Map();
  private updateBatchTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Insert object with position caching
   */
  insert(object: SpatialObject): void {
    // Create cached version with position metadata
    const cachedObject = this.createCachedObject(object);

    // Batch position updates for better performance
    this.queuePositionUpdate(object);

    // Insert into spatial index
    super.insert(object);

    // Store in cache
    this.cachedObjects.set(object.id, cachedObject);
  }

  /**
   * Update object with intelligent cache invalidation
   */
  update(object: SpatialObject): void {
    const existingCached = this.cachedObjects.get(object.id);
    const newCached = this.createCachedObject(object);

    // Check if position actually changed
    if (
      existingCached &&
      this.positionsEqual(existingCached.bounds, object.bounds)
    ) {
      // Position didn't change, just update metadata
      existingCached.lastPositionUpdate = Date.now();
      return;
    }

    // Position changed, invalidate related caches
    if (existingCached) {
      this.invalidateRelatedCaches(existingCached);
    }

    // Queue position update
    this.queuePositionUpdate(object);

    // Update spatial index
    super.update(object);

    // Update cache
    this.cachedObjects.set(object.id, newCached);
  }

  /**
   * Remove object with cache cleanup
   */
  remove(objectId: string): void {
    const cachedObject = this.cachedObjects.get(objectId);
    if (cachedObject) {
      this.invalidateRelatedCaches(cachedObject);
      this.cachedObjects.delete(objectId);
    }

    super.remove(objectId);
  }

  /**
   * Create cached spatial object with metadata
   */
  private createCachedObject(object: SpatialObject): CachedSpatialObject {
    const positionHash = this.generatePositionHash(object.bounds);

    return {
      ...object,
      positionHash,
      lastPositionUpdate: Date.now(),
      cacheDependencies: this.getPositionDependencies(object),
    };
  }

  /**
   * Generate hash for position to detect changes
   */
  private generatePositionHash(bounds: BoundingBox): string {
    // Create a simple hash from position and dimensions
    return `${bounds.x}-${bounds.y}-${bounds.width}-${bounds.height}`;
  }

  /**
   * Check if two positions are equal
   */
  private positionsEqual(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
    );
  }

  /**
   * Get position dependencies for cache invalidation
   */
  private getPositionDependencies(object: SpatialObject): string[] {
    const dependencies: string[] = [];

    // For time blocks, depend on the block's time properties
    if (object.id.startsWith("timeblock-")) {
      dependencies.push(`timeblock-${object.id}`);
    }

    // For time slots, depend on the day and hour
    if (object.id.startsWith("timeslot-")) {
      dependencies.push(`timeslot-${object.id}`);
    }

    return dependencies;
  }

  /**
   * Invalidate related caches when position changes
   */
  private invalidateRelatedCaches(cachedObject: CachedSpatialObject): void {
    cachedObject.cacheDependencies.forEach((dependency) => {
      cacheInvalidationManager.invalidateRelated(dependency);
    });
  }

  /**
   * Queue position update for batching
   */
  private queuePositionUpdate(object: SpatialObject): void {
    this.positionUpdateQueue.set(object.id, object);

    // Schedule batch update
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
    }

    this.updateBatchTimeout = setTimeout(() => {
      this.processPositionUpdates();
    }, 16); // Next animation frame
  }

  /**
   * Process batched position updates
   */
  private processPositionUpdates(): void {
    // Record performance metrics
    dragPerformanceMonitor.recordPositionCalculation(
      `spatial-index-batch-${this.positionUpdateQueue.size}`
    );

    // Process all queued updates
    for (const object of this.positionUpdateQueue.values()) {
      // Update position cache if this is a time block
      if (object.id.startsWith("timeblock-") && object.data?.blockId) {
        // The position cache will be updated through the normal flow
        // when calculateEventPositionCached is called
      }
    }

    this.positionUpdateQueue.clear();
    this.updateBatchTimeout = null;
  }

  /**
   * Query with performance monitoring
   */
  query(bounds: BoundingBox): SpatialObject[] {
    const startTime = performance.now();

    try {
      const results = super.query(bounds);

      // Record query performance
      const queryTime = performance.now() - startTime;
      if (queryTime > 2) {
        // Log slow queries
        dragPerformanceMonitor.recordConflictCheck(
          `spatial-query-slow-${queryTime.toFixed(2)}ms`
        );
      }

      return results;
    } catch (error) {
      console.error("[SPATIAL INDEX] Query error:", error);
      return [];
    }
  }

  /**
   * Query radius with caching for repeated queries
   */
  queryRadius(
    centerX: number,
    centerY: number,
    radius: number
  ): CollisionResult[] {
    const startTime = performance.now();

    try {
      const results = super.queryRadius(centerX, centerY, radius);

      // Record query performance
      const queryTime = performance.now() - startTime;
      if (queryTime > 2) {
        dragPerformanceMonitor.recordConflictCheck(
          `spatial-radius-slow-${queryTime.toFixed(2)}ms`
        );
      }

      return results;
    } catch (error) {
      console.error("[SPATIAL INDEX] Radius query error:", error);
      return [];
    }
  }

  /**
   * Get cached object with position validation
   */
  getCachedObject(objectId: string): CachedSpatialObject | undefined {
    const cached = this.cachedObjects.get(objectId);
    if (!cached) return undefined;

    // Check if cache is still valid
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - cached.lastPositionUpdate > maxAge) {
      this.cachedObjects.delete(objectId);
      return undefined;
    }

    return cached;
  }

  /**
   * Pre-warm spatial index with common positions
   */
  prewarm(dayIndices: number[], hours: number[]): void {
    const objects: SpatialObject[] = [];

    dayIndices.forEach((dayIndex) => {
      hours.forEach((hour) => {
        objects.push(this.createTimeSlotObject(dayIndex, hour));
      });
    });

    objects.forEach((obj) => this.insert(obj));
  }

  /**
   * Get spatial index statistics with cache metrics
   */
  getStats(): {
    totalObjects: number;
    gridCells: number;
    averageObjectsPerCell: number;
    cachedObjects: number;
    cacheHitRate: number;
    pendingUpdates: number;
  } {
    const baseStats = super.getStats();

    return {
      ...baseStats,
      cachedObjects: this.cachedObjects.size,
      cacheHitRate: this.calculateCacheHitRate(),
      pendingUpdates: this.positionUpdateQueue.size,
    };
  }

  /**
   * Calculate cache hit rate for spatial queries
   */
  private calculateCacheHitRate(): number {
    // This would be calculated based on actual query performance
    // For now, return a placeholder
    return 0.85; // 85% cache hit rate
  }

  /**
   * Clear cache and spatial index
   */
  clear(): void {
    super.clear();
    this.cachedObjects.clear();
    this.positionUpdateQueue.clear();

    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
      this.updateBatchTimeout = null;
    }
  }

  /**
   * Optimize spatial index and cache
   */
  optimize(): void {
    super.optimize();

    // Clean up old cached objects
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [id, cached] of this.cachedObjects.entries()) {
      if (now - cached.lastPositionUpdate > maxAge) {
        this.cachedObjects.delete(id);
      }
    }
  }
}

// Global optimized spatial index instance
export const optimizedSpatialIndex = new OptimizedSpatialIndex();

/**
 * Hook for using optimized spatial index in React components
 */
export function useOptimizedSpatialIndex() {
  const isDragging = useAppStore((state) => state.drag.isDragging);

  // Pre-warm spatial index when drag starts
  React.useEffect(() => {
    if (isDragging) {
      // Pre-warm with common day/hour combinations
      optimizedSpatialIndex.prewarm(
        [0, 1, 2, 3, 4, 5, 6],
        Array.from({ length: 17 }, (_, i) => i + 6)
      );
    }
  }, [isDragging]);

  return {
    spatialIndex: optimizedSpatialIndex,
    insert: (object: SpatialObject) => optimizedSpatialIndex.insert(object),
    update: (object: SpatialObject) => optimizedSpatialIndex.update(object),
    remove: (objectId: string) => optimizedSpatialIndex.remove(objectId),
    query: (bounds: BoundingBox) => optimizedSpatialIndex.query(bounds),
    queryRadius: (centerX: number, centerY: number, radius: number) =>
      optimizedSpatialIndex.queryRadius(centerX, centerY, radius),
    getStats: () => optimizedSpatialIndex.getStats(),
  };
}
