/**
 * Object pool for managing droppable zone instances
 * Reduces memory allocation overhead and improves performance
 */

import type { UniqueIdentifier } from "@dnd-kit/core";

export interface PooledDropZone {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  isActive: boolean;
  lastUsed: number;
  data?: any;
}

export interface DropZoneConfig {
  id: UniqueIdentifier;
  data?: any;
  disabled?: boolean;
}

/**
 * Pool for managing droppable zone instances
 */
export class DropZonePool {
  private pool: Map<string, PooledDropZone> = new Map();
  private activeZones: Set<string> = new Set();
  private maxPoolSize: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(maxPoolSize: number = 50, cleanupInterval: number = 30000) {
    this.maxPoolSize = maxPoolSize;
    this.cleanupInterval = cleanupInterval;
    this.startCleanupTimer();
  }

  /**
   * Get or create a drop zone from the pool
   */
  getDropZone(config: DropZoneConfig): PooledDropZone {
    const { id } = config;
    const key = String(id);

    // Check if we already have this zone in the pool
    let pooledZone = this.pool.get(key);

    if (pooledZone) {
      // Update the zone and mark as active
      pooledZone.isActive = true;
      pooledZone.lastUsed = Date.now();
      pooledZone.data = config.data;
      this.activeZones.add(key);

      // Remove from pool since it's now active
      this.pool.delete(key);

      return pooledZone;
    }

    // Create new zone if not in pool
    const newZone: PooledDropZone = {
      id: key,
      ref: React.createRef<HTMLElement>(),
      isActive: true,
      lastUsed: Date.now(),
      data: config.data,
    };

    this.activeZones.add(key);
    this.evictIfNeeded();

    return newZone;
  }

  /**
   * Return a drop zone to the pool for reuse
   */
  returnDropZone(id: UniqueIdentifier): void {
    const key = String(id);
    const activeZone = this.activeZones.has(key);

    if (!activeZone) {
      return; // Zone wasn't active
    }

    const pooledZone = Array.from(this.activeZones).find(zoneId => zoneId === key);

    if (pooledZone) {
      // Move from active to pool
      this.activeZones.delete(key);

      const zone: PooledDropZone = {
        id: key,
        ref: React.createRef<HTMLElement>(),
        isActive: false,
        lastUsed: Date.now(),
        data: undefined,
      };

      this.pool.set(key, zone);
    }
  }

  /**
   * Get all currently active drop zones
   */
  getActiveDropZones(): PooledDropZone[] {
    return Array.from(this.activeZones)
      .map(key => {
        // Find the zone data (this is a simplified approach)
        // In a real implementation, you might want to maintain a separate map
        return {
          id: key,
          ref: React.createRef<HTMLElement>(),
          isActive: true,
          lastUsed: Date.now(),
        };
      });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    activeCount: number;
    pooledCount: number;
    totalCount: number;
    poolUtilization: number;
  } {
    const activeCount = this.activeZones.size;
    const pooledCount = this.pool.size;
    const totalCount = activeCount + pooledCount;
    const poolUtilization = this.maxPoolSize > 0 ? pooledCount / this.maxPoolSize : 0;

    return {
      activeCount,
      pooledCount,
      totalCount,
      poolUtilization,
    };
  }

  /**
   * Clear all zones from the pool
   */
  clear(): void {
    this.pool.clear();
    this.activeZones.clear();
  }

  /**
   * Evict least recently used zones if pool is full
   */
  private evictIfNeeded(): void {
    if (this.pool.size >= this.maxPoolSize) {
      // Find and remove oldest unused zones
      const zonesToEvict = Array.from(this.pool.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)
        .slice(0, Math.ceil(this.maxPoolSize * 0.2)); // Evict 20% of pool

      zonesToEvict.forEach(([key]) => {
        this.pool.delete(key);
      });
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up old unused zones
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, zone] of this.pool.entries()) {
      if (now - zone.lastUsed > maxAge) {
        this.pool.delete(key);
      }
    }
  }

  /**
   * Destroy the pool and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

/**
 * React hook for using the drop zone pool
 */
export function useDropZonePool() {
  const poolRef = React.useRef<DropZonePool>();

  // Initialize pool on first use
  if (!poolRef.current) {
    poolRef.current = new DropZonePool();
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      poolRef.current?.destroy();
    };
  }, []);

  return poolRef.current;
}

/**
 * Time slot specific drop zone pool
 */
export class TimeSlotDropZonePool extends DropZonePool {
  private dayIndex: number;

  constructor(dayIndex: number, maxPoolSize?: number) {
    super(maxPoolSize);
    this.dayIndex = dayIndex;
  }

  /**
   * Get a time slot drop zone with day-specific configuration
   */
  getTimeSlotDropZone(hour: number, data?: any): PooledDropZone {
    const config: DropZoneConfig = {
      id: `timeslot-${this.dayIndex}-${hour}`,
      data: {
        type: "timeslot",
        dayIndex: this.dayIndex,
        hour,
        ...data,
      },
    };

    return this.getDropZone(config);
  }

  /**
   * Return a time slot drop zone to the pool
   */
  returnTimeSlotDropZone(hour: number): void {
    this.returnDropZone(`timeslot-${this.dayIndex}-${hour}`);
  }

  /**
   * Get all active time slot drop zones for this day
   */
  getActiveTimeSlotDropZones(): PooledDropZone[] {
    return this.getActiveDropZones().filter(zone =>
      zone.id.startsWith(`timeslot-${this.dayIndex}-`)
    );
  }
}

/**
 * Global drop zone pool manager
 */
export class DropZonePoolManager {
  private pools: Map<number, TimeSlotDropZonePool> = new Map();
  private globalPool: DropZonePool;

  constructor() {
    this.globalPool = new DropZonePool();
  }

  /**
   * Get or create a pool for a specific day
   */
  getDayPool(dayIndex: number): TimeSlotDropZonePool {
    if (!this.pools.has(dayIndex)) {
      this.pools.set(dayIndex, new TimeSlotDropZonePool(dayIndex));
    }
    return this.pools.get(dayIndex)!;
  }

  /**
   * Get global pool statistics
   */
  getGlobalStats(): {
    totalActive: number;
    totalPooled: number;
    dayPoolsCount: number;
  } {
    const globalStats = this.globalPool.getStats();

    let totalActive = globalStats.activeCount;
    let totalPooled = globalStats.pooledCount;

    for (const pool of this.pools.values()) {
      const stats = pool.getStats();
      totalActive += stats.activeCount;
      totalPooled += stats.pooledCount;
    }

    return {
      totalActive,
      totalPooled,
      dayPoolsCount: this.pools.size,
    };
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    this.globalPool.clear();
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }

  /**
   * Destroy the manager and all pools
   */
  destroy(): void {
    this.globalPool.destroy();
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
  }
}