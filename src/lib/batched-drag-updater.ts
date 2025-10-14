import { useDragStore } from "./drag-store";

// Batch update configuration
interface BatchConfig {
  maxBatchSize: number;
  maxDelay: number; // Maximum delay before processing batch
  enableRAF: boolean; // Use requestAnimationFrame for batching
}

// Default batch configuration
const defaultBatchConfig: BatchConfig = {
  maxBatchSize: 10,
  maxDelay: 16, // ~60fps
  enableRAF: true,
};

/**
 * Advanced batched drag updater with performance optimization
 */
export class BatchedDragUpdater {
  private static instance: BatchedDragUpdater;
  private config: BatchConfig;
  private updateQueue: Array<{
    id: string;
    updateFn: () => void;
    priority: number;
    timestamp: number;
  }> = [];
  private isProcessing = false;
  private rafId: number | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...defaultBatchConfig, ...config };
  }

  static getInstance(config?: Partial<BatchConfig>): BatchedDragUpdater {
    if (!BatchedDragUpdater.instance) {
      BatchedDragUpdater.instance = new BatchedDragUpdater(config);
    }
    return BatchedDragUpdater.instance;
  }

  /**
   * Add update to batch with priority
   */
  addUpdate(
    updateFn: () => void,
    priority: number = 0,
    maxDelay?: number
  ): string {
    const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const update = {
      id: updateId,
      updateFn,
      priority,
      timestamp: performance.now(),
    };

    this.updateQueue.push(update);

    // Sort by priority (higher priority first)
    this.updateQueue.sort((a, b) => b.priority - a.priority);

    this.scheduleBatch(maxDelay);

    return updateId;
  }

  /**
   * Remove update from batch
   */
  removeUpdate(updateId: string): boolean {
    const index = this.updateQueue.findIndex(update => update.id === updateId);
    if (index > -1) {
      this.updateQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(customDelay?: number): void {
    const delay = customDelay ?? this.config.maxDelay;

    // Clear existing timers
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Use RAF for smooth updates if enabled
    if (this.config.enableRAF && delay <= 16) {
      this.rafId = requestAnimationFrame(() => {
        this.processBatch();
      });
    } else {
      // Use timeout for longer delays
      this.timeoutId = setTimeout(() => {
        this.processBatch();
      }, delay);
    }
  }

  /**
   * Process all queued updates
   */
  private processBatch(): void {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process updates in priority order
      const updatesToProcess = [...this.updateQueue];
      this.updateQueue = [];

      // Group updates by type for better performance
      const dragStateUpdates = updatesToProcess.filter(update =>
        update.id.includes('drag-state')
      );

      const positionUpdates = updatesToProcess.filter(update =>
        update.id.includes('position')
      );

      const otherUpdates = updatesToProcess.filter(update =>
        !update.id.includes('drag-state') && !update.id.includes('position')
      );

      // Process in order: drag state -> positions -> others
      [...dragStateUpdates, ...positionUpdates, ...otherUpdates].forEach(update => {
        try {
          update.updateFn();
        } catch (error) {
          console.error('[BATCHED DRAG UPDATER] Error in update:', error);
        }
      });

    } finally {
      this.isProcessing = false;
      this.rafId = null;
      this.timeoutId = null;
    }
  }

  /**
   * Force immediate processing (for critical updates)
   */
  forceProcess(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.processBatch();
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.updateQueue.length,
      isProcessing: this.isProcessing,
      oldestUpdate: this.updateQueue.length > 0 ?
        Math.min(...this.updateQueue.map(u => u.timestamp)) : null,
      newestUpdate: this.updateQueue.length > 0 ?
        Math.max(...this.updateQueue.map(u => u.timestamp)) : null,
      averagePriority: this.updateQueue.length > 0 ?
        this.updateQueue.reduce((sum, u) => sum + u.priority, 0) / this.updateQueue.length : 0,
    };
  }

  /**
   * Clear all queued updates
   */
  clear(): void {
    this.updateQueue = [];

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.isProcessing = false;
  }
}

// Global batched updater instance
export const batchedDragUpdater = BatchedDragUpdater.getInstance();

/**
 * React hook for using batched drag updates
 */
export function useBatchedDragUpdates() {
  const addUpdate = (updateFn: () => void, priority?: number, maxDelay?: number) => {
    return batchedDragUpdater.addUpdate(updateFn, priority, maxDelay);
  };

  const removeUpdate = (updateId: string) => {
    return batchedDragUpdater.removeUpdate(updateId);
  };

  const forceProcess = () => {
    batchedDragUpdater.forceProcess();
  };

  const getStats = () => {
    return batchedDragUpdater.getStats();
  };

  const clear = () => {
    batchedDragUpdater.clear();
  };

  return {
    addUpdate,
    removeUpdate,
    forceProcess,
    getStats,
    clear,
  };
}

/**
 * Helper function for common drag state updates
 */
export function batchDragStateUpdates(updates: {
  setDragging?: boolean;
  setDraggedItem?: { id: string; type: "task" | "event" } | null;
  setDragOverSlot?: { date: Date; hour: number } | null;
  setDragPosition?: { x: number; y: number } | null;
  setDragPreview?: { element: HTMLElement | null; offset: { x: number; y: number } } | null;
}): string[] {
  const updateIds: string[] = [];

  if (updates.setDragging !== undefined) {
    updateIds.push(batchedDragUpdater.addUpdate(
      () => useDragStore.getState().setDragging(updates.setDragging!),
      10, // High priority for dragging state
      0   // Immediate processing
    ));
  }

  if (updates.setDraggedItem !== undefined) {
    updateIds.push(batchedDragUpdater.addUpdate(
      () => useDragStore.getState().setDraggedItem(updates.setDraggedItem!),
      9, // High priority for dragged item
      0  // Immediate processing
    ));
  }

  if (updates.setDragOverSlot !== undefined) {
    updateIds.push(batchedDragUpdater.addUpdate(
      () => useDragStore.getState().setDragOverSlot(updates.setDragOverSlot!),
      8, // Medium-high priority for slot
      8  // Small delay for slot updates
    ));
  }

  if (updates.setDragPosition !== undefined) {
    updateIds.push(batchedDragUpdater.addUpdate(
      () => useDragStore.getState().setDragCurrentPosition(updates.setDragPosition!),
      7, // Medium priority for position
      16 // Standard frame delay
    ));
  }

  if (updates.setDragPreview !== undefined) {
    updateIds.push(batchedDragUpdater.addUpdate(
      () => useDragStore.getState().setDragPreview(updates.setDragPreview!),
      5, // Lower priority for preview
      32 // Longer delay for preview updates
    ));
  }

  return updateIds;
}

/**
 * Performance monitoring for batched updates
 */
export function getBatchPerformanceMetrics() {
  return {
    ...batchedDragUpdater.getStats(),
    dragStoreMetrics: useDragStore ? {
      // Access any state to trigger subscription check
      isDragging: useDragStore.getState().isDragging,
    } : null,
  };
}

/**
 * Cleanup function for component unmount
 */
export function cleanupBatchedUpdates(): void {
  batchedDragUpdater.clear();
}