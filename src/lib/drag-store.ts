import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Task, Event } from "@/types";

// Drag-specific state interface
interface DragState {
  isDragging: boolean;
  draggedItem: { id: string; type: "task" | "event" } | null;
  dragOverSlot: { date: Date; hour: number } | null;
  dragStartPosition: { x: number; y: number } | null;
  dragCurrentPosition: { x: number; y: number } | null;
  dragPreview: {
    element: HTMLElement | null;
    offset: { x: number; y: number };
  } | null;
}

// Drag actions interface
interface DragActions {
  setDragging: (isDragging: boolean) => void;
  setDraggedItem: (item: { id: string; type: "task" | "event" } | null) => void;
  setDragOverSlot: (slot: { date: Date; hour: number } | null) => void;
  setDragStartPosition: (position: { x: number; y: number } | null) => void;
  setDragCurrentPosition: (position: { x: number; y: number } | null) => void;
  setDragPreview: (preview: { element: HTMLElement | null; offset: { x: number; y: number } } | null) => void;
  resetDragState: () => void;
  updateDragPosition: (position: { x: number; y: number }) => void;
}

// Drag store state
type DragStore = DragState & DragActions;

// Performance monitoring for drag operations
interface DragPerformanceMetrics {
  updateCount: number;
  lastUpdateTime: number;
  averageUpdateInterval: number;
  maxUpdateInterval: number;
  minUpdateInterval: number;
}

// Global performance tracking
const dragMetrics: DragPerformanceMetrics = {
  updateCount: 0,
  lastUpdateTime: 0,
  averageUpdateInterval: 0,
  maxUpdateInterval: 0,
  minUpdateInterval: Infinity,
};

// Update performance metrics
const updateDragMetrics = (currentTime: number) => {
  const previousUpdateTime = dragMetrics.lastUpdateTime;
  if (previousUpdateTime > 0) {
    const interval = currentTime - previousUpdateTime;

    dragMetrics.updateCount++;
    dragMetrics.maxUpdateInterval = Math.max(dragMetrics.maxUpdateInterval, interval);
    dragMetrics.minUpdateInterval = Math.min(dragMetrics.minUpdateInterval, interval);

    // Calculate running average
    dragMetrics.averageUpdateInterval =
      (dragMetrics.averageUpdateInterval * (dragMetrics.updateCount - 1) + interval) /
      dragMetrics.updateCount;
  }

  dragMetrics.lastUpdateTime = currentTime;
};

// Get performance metrics
export const getDragPerformanceMetrics = (): DragPerformanceMetrics => ({ ...dragMetrics });

// Reset performance metrics
export const resetDragPerformanceMetrics = () => {
  Object.assign(dragMetrics, {
    updateCount: 0,
    lastUpdateTime: 0,
    averageUpdateInterval: 0,
    maxUpdateInterval: 0,
    minUpdateInterval: Infinity,
  });
};

// Initial drag state
const initialDragState: DragState = {
  isDragging: false,
  draggedItem: null,
  dragOverSlot: null,
  dragStartPosition: null,
  dragCurrentPosition: null,
  dragPreview: null,
};

// Create isolated drag store
export const useDragStore = create<DragStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialDragState,

    setDragging: (isDragging) => {
      const now = performance.now();
      updateDragMetrics(now);

      set((state) => ({
        ...state,
        isDragging,
      }), false, `setDragging-${isDragging}`);
    },

    setDraggedItem: (item) => {
      const now = performance.now();
      updateDragMetrics(now);

      set((state) => ({
        ...state,
        draggedItem: item,
      }), false, `setDraggedItem-${item?.id || 'null'}`);
    },

    setDragOverSlot: (slot) => {
      const now = performance.now();
      updateDragMetrics(now);

      set((state) => ({
        ...state,
        dragOverSlot: slot,
      }), false, `setDragOverSlot-${slot ? `${slot.date.toISOString()}-${slot.hour}` : 'null'}`);
    },

    setDragStartPosition: (position) => {
      set((state) => ({
        ...state,
        dragStartPosition: position,
      }), false, `setDragStartPosition-${position ? `${position.x},${position.y}` : 'null'}`);
    },

    setDragCurrentPosition: (position) => {
      set((state) => ({
        ...state,
        dragCurrentPosition: position,
      }), false, `setDragCurrentPosition-${position ? `${position.x},${position.y}` : 'null'}`);
    },

    setDragPreview: (preview) => {
      set((state) => ({
        ...state,
        dragPreview: preview,
      }), false, `setDragPreview-${preview?.element ? 'element' : 'null'}`);
    },

    resetDragState: () => {
      const now = performance.now();
      updateDragMetrics(now);

      set(initialDragState, false, 'resetDragState');
    },

    updateDragPosition: (position) => {
      const now = performance.now();
      updateDragMetrics(now);

      set((state) => ({
        ...state,
        dragCurrentPosition: position,
      }), false, `updateDragPosition-${position.x},${position.y}`);
    },
  }))
);

// Batched update helper for multiple drag state changes
export class BatchedDragUpdater {
  private static instance: BatchedDragUpdater;
  private updateQueue: Array<() => void> = [];
  private isProcessing = false;
  private rafId: number | null = null;

  static getInstance(): BatchedDragUpdater {
    if (!BatchedDragUpdater.instance) {
      BatchedDragUpdater.instance = new BatchedDragUpdater();
    }
    return BatchedDragUpdater.instance;
  }

  // Add update to batch
  addUpdate(updateFn: () => void): void {
    this.updateQueue.push(updateFn);

    if (!this.isProcessing) {
      this.scheduleBatch();
    }
  }

  // Schedule batch processing
  private scheduleBatch(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.processBatch();
    });
  }

  // Process all queued updates
  private processBatch(): void {
    this.isProcessing = true;

    try {
      // Execute all updates in batch
      this.updateQueue.forEach(updateFn => {
        try {
          updateFn();
        } catch (error) {
          console.error('[DRAG STORE] Error in batched update:', error);
        }
      });
    } finally {
      // Clear queue
      this.updateQueue = [];
      this.isProcessing = false;
      this.rafId = null;
    }
  }

  // Force immediate processing (for critical updates)
  forceProcess(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.processBatch();
  }
}

// Global batched updater instance
export const batchedDragUpdater = BatchedDragUpdater.getInstance();

// Helper function for batched drag updates
export function batchDragUpdates(updates: Array<() => void>): void {
  updates.forEach(update => batchedDragUpdater.addUpdate(update));
}

// React hook for drag performance monitoring
export function useDragPerformance() {
  const updateCount = useDragStore(state => {
    // Access any state to trigger subscription
    return state.isDragging;
  });

  return {
    metrics: getDragPerformanceMetrics(),
    resetMetrics: resetDragPerformanceMetrics,
    updateCount,
  };
}

// Helper function to start drag operation with performance tracking
export function startDragOperation(item: { id: string; type: "task" | "event" }, position: { x: number; y: number }): void {
  batchDragUpdates([
    () => useDragStore.getState().setDragging(true),
    () => useDragStore.getState().setDraggedItem(item),
    () => useDragStore.getState().setDragStartPosition(position),
    () => useDragStore.getState().setDragCurrentPosition(position),
  ]);
}

// Helper function to end drag operation with cleanup
export function endDragOperation(): void {
  batchDragUpdates([
    () => useDragStore.getState().setDragging(false),
    () => useDragStore.getState().setDraggedItem(null),
    () => useDragStore.getState().setDragOverSlot(null),
    () => useDragStore.getState().setDragStartPosition(null),
    () => useDragStore.getState().setDragCurrentPosition(null),
    () => useDragStore.getState().setDragPreview(null),
  ]);
}

// Helper function to update drag position during drag
export function updateDragPosition(position: { x: number; y: number }): void {
  useDragStore.getState().updateDragPosition(position);
}