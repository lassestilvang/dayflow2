import type { Event, Task } from "@/types";
import { checkTimeConflict, type ConflictInfo } from "./conflict-detection";

// Spatial index configuration
interface SpatialIndexConfig {
  bucketSize: number; // Time bucket size in minutes
  maxBuckets: number; // Maximum number of buckets to maintain
  enableCompression: boolean; // Enable bucket compression for memory efficiency
}

// Default configuration
const defaultConfig: SpatialIndexConfig = {
  bucketSize: 15, // 15-minute buckets
  maxBuckets: 1000, // Support ~10 days of 15-minute buckets
  enableCompression: true,
};

// Time bucket for spatial indexing
interface TimeBucket {
  startTime: number; // Timestamp in milliseconds
  endTime: number; // Timestamp in milliseconds
  items: Set<string>; // Item IDs in this bucket
  itemCount: number; // Cached count for performance
}

// Spatial index for time-based conflict detection
export class TimeSpatialIndex {
  private buckets = new Map<number, TimeBucket>();
  private config: SpatialIndexConfig;
  private accessCount = 0;
  private hitCount = 0;

  constructor(config: Partial<SpatialIndexConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Get bucket key for a timestamp
   */
  private getBucketKey(timestamp: number): number {
    const minutes = Math.floor(timestamp / (this.config.bucketSize * 60 * 1000));
    return minutes * this.config.bucketSize * 60 * 1000;
  }

  /**
   * Add item to spatial index
   */
  addItem(item: Event | Task): void {
    const startTime = "startTime" in item ? item.startTime.getTime() : item.scheduledTime?.getTime();
    const endTime = "endTime" in item ? item.endTime.getTime() : item.dueDate?.getTime();

    if (!startTime || !endTime) return;

    const startBucket = this.getBucketKey(startTime);
    const endBucket = this.getBucketKey(endTime);

    // Add item to all buckets it spans
    for (let bucketTime = startBucket; bucketTime <= endBucket; bucketTime += this.config.bucketSize * 60 * 1000) {
      if (!this.buckets.has(bucketTime)) {
        this.buckets.set(bucketTime, {
          startTime: bucketTime,
          endTime: bucketTime + (this.config.bucketSize * 60 * 1000),
          items: new Set(),
          itemCount: 0,
        });
      }

      const bucket = this.buckets.get(bucketTime)!;
      bucket.items.add(item.id);
      bucket.itemCount = bucket.items.size;
    }

    // Cleanup old buckets if we exceed maxBuckets
    if (this.buckets.size > this.config.maxBuckets) {
      this.compress();
    }
  }

  /**
   * Remove item from spatial index
   */
  removeItem(itemId: string): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.items.has(itemId)) {
        bucket.items.delete(itemId);
        bucket.itemCount = bucket.items.size;
      }
    }
  }

  /**
   * Query items that might conflict with a time range
   */
  queryRange(startTime: number, endTime: number): Set<string> {
    this.accessCount++;
    const startBucket = this.getBucketKey(startTime);
    const endBucket = this.getBucketKey(endTime);

    const candidateItems = new Set<string>();

    // Check all buckets in range
    for (let bucketTime = startBucket; bucketTime <= endBucket; bucketTime += this.config.bucketSize * 60 * 1000) {
      const bucket = this.buckets.get(bucketTime);
      if (bucket) {
        this.hitCount++;
        // Add all items from this bucket as candidates
        bucket.items.forEach(itemId => candidateItems.add(itemId));
      }
    }

    return candidateItems;
  }

  /**
   * Compress spatial index to reduce memory usage
   */
  private compress(): void {
    if (!this.config.enableCompression) return;

    // Remove empty buckets
    for (const [bucketTime, bucket] of this.buckets.entries()) {
      if (bucket.itemCount === 0) {
        this.buckets.delete(bucketTime);
      }
    }

    // If still too many buckets, remove oldest ones
    if (this.buckets.size > this.config.maxBuckets) {
      const sortedBuckets = Array.from(this.buckets.entries())
        .sort((a, b) => a[0] - b[0]);

      const toRemove = sortedBuckets.slice(0, sortedBuckets.length - this.config.maxBuckets);
      toRemove.forEach(([bucketTime]) => this.buckets.delete(bucketTime));
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    const totalItems = Array.from(this.buckets.values())
      .reduce((sum, bucket) => sum + bucket.itemCount, 0);

    return {
      bucketCount: this.buckets.size,
      totalItems,
      averageItemsPerBucket: this.buckets.size > 0 ? totalItems / this.buckets.size : 0,
      accessCount: this.accessCount,
      hitRate: this.accessCount > 0 ? this.hitCount / this.accessCount : 0,
      config: this.config,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.buckets.clear();
    this.accessCount = 0;
    this.hitCount = 0;
  }
}

// Global spatial index instance
export const timeSpatialIndex = new TimeSpatialIndex();

/**
 * Optimized conflict detection using spatial indexing
 */
export function checkTimeConflictOptimized(
  newStartTime: Date,
  newEndTime: Date,
  existingEvents: Event[],
  existingTasks: Task[],
  excludeId?: string
): ConflictInfo {
  const startTime = newStartTime.getTime();
  const endTime = newEndTime.getTime();

  // Use spatial index to get candidate items
  const candidateItemIds = timeSpatialIndex.queryRange(startTime, endTime);

  // Filter candidates to actual items
  const candidateEvents = existingEvents.filter(event =>
    candidateItemIds.has(event.id) && (!excludeId || event.id !== excludeId)
  );

  const candidateTasks = existingTasks.filter(task =>
    candidateItemIds.has(task.id) && (!excludeId || task.id !== excludeId)
  );

  // Use existing conflict detection on reduced candidate set
  return checkTimeConflict(
    newStartTime,
    newEndTime,
    candidateEvents,
    candidateTasks,
    excludeId
  );
}

/**
 * Batch update spatial index with multiple items
 */
export function updateSpatialIndex(items: (Event | Task)[]): void {
  // Clear existing index
  timeSpatialIndex.clear();

  // Add all items to index
  items.forEach(item => {
    timeSpatialIndex.addItem(item);
  });
}

/**
 * Remove item from spatial index
 */
export function removeItemFromSpatialIndex(itemId: string): void {
  timeSpatialIndex.removeItem(itemId);
}

/**
 * Get spatial index performance statistics
 */
export function getSpatialIndexStats() {
  return timeSpatialIndex.getStats();
}

/**
 * Performance comparison between optimized and original methods
 */
export function compareConflictDetectionPerformance(
  testCases: Array<{
    newStartTime: Date;
    newEndTime: Date;
    events: Event[];
    tasks: Task[];
  }>
): {
  original: { totalTime: number; averageTime: number };
  optimized: { totalTime: number; averageTime: number };
  improvement: number;
} {
  const originalTimes: number[] = [];
  const optimizedTimes: number[] = [];

  testCases.forEach(testCase => {
    // Test original method
    const originalStart = performance.now();
    checkTimeConflict(
      testCase.newStartTime,
      testCase.newEndTime,
      testCase.events,
      testCase.tasks
    );
    const originalTime = performance.now() - originalStart;
    originalTimes.push(originalTime);

    // Test optimized method
    const optimizedStart = performance.now();
    checkTimeConflictOptimized(
      testCase.newStartTime,
      testCase.newEndTime,
      testCase.events,
      testCase.tasks
    );
    const optimizedTime = performance.now() - optimizedStart;
    optimizedTimes.push(optimizedTime);
  });

  const originalTotal = originalTimes.reduce((sum, time) => sum + time, 0);
  const optimizedTotal = optimizedTimes.reduce((sum, time) => sum + time, 0);

  return {
    original: {
      totalTime: originalTotal,
      averageTime: originalTotal / testCases.length,
    },
    optimized: {
      totalTime: optimizedTotal,
      averageTime: optimizedTotal / testCases.length,
    },
    improvement: originalTotal > 0 ? (originalTotal - optimizedTotal) / originalTotal : 0,
  };
}

/**
 * Hook for React components to use optimized conflict detection
 */
export function useOptimizedConflictDetection() {
  const checkConflict = (startTime: Date, endTime: Date, excludeId?: string) => {
    // This would need to be connected to the actual store in a real implementation
    return checkTimeConflictOptimized(startTime, endTime, [], [], excludeId);
  };

  const getIndexStats = () => {
    return getSpatialIndexStats();
  };

  return {
    checkConflict,
    getIndexStats,
  };
}

/**
 * Initialize spatial index with existing data
 */
export function initializeSpatialIndex(events: Event[], tasks: Task[]): void {
  updateSpatialIndex([...events, ...tasks]);
}

/**
 * Update spatial index when items change
 */
export function updateSpatialIndexItem(item: Event | Task, operation: 'add' | 'remove' | 'update'): void {
  switch (operation) {
    case 'add':
      timeSpatialIndex.addItem(item);
      break;
    case 'remove':
      timeSpatialIndex.removeItem(item.id);
      break;
    case 'update':
      timeSpatialIndex.removeItem(item.id);
      timeSpatialIndex.addItem(item);
      break;
  }
}