"use client";

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useDragStore, startDragOperation, endDragOperation, updateDragPosition } from "@/lib/drag-store";
import { batchedDragUpdater } from "@/lib/batched-drag-updater";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

// Enhanced drag context interface
interface DragContextValue {
  // Current drag state
  isDragging: boolean;
  draggedItem: { id: string; type: "task" | "event" } | null;
  dragOverSlot: { date: Date; hour: number } | null;

  // Drag positions
  dragStartPosition: { x: number; y: number } | null;
  dragCurrentPosition: { x: number; y: number } | null;

  // Drag preview
  dragPreview: {
    element: HTMLElement | null;
    offset: { x: number; y: number };
  } | null;

  // Actions
  startDrag: (item: { id: string; type: "task" | "event" }, position: { x: number; y: number }) => void;
  endDrag: () => void;
  updatePosition: (position: { x: number; y: number }) => void;

  // Batched actions
  batchUpdates: (updates: Array<() => void>) => void;

  // Performance metrics
  performanceMetrics: {
    updateCount: number;
    averageUpdateInterval: number;
    isOptimized: boolean;
  };
}

// Create drag context
const DragContext = createContext<DragContextValue | null>(null);

// Props for DragContextProvider
interface DragContextProviderProps {
  children: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
  enableBatching?: boolean;
  maxUpdateFrequency?: number;
}

/**
 * DragContextProvider provides isolated drag state management
 * with performance optimization and batched updates
 */
export function DragContextProvider({
  children,
  enablePerformanceMonitoring = true,
  enableBatching = true,
  maxUpdateFrequency = 60,
}: DragContextProviderProps) {
  const performanceStartTimeRef = useRef(performance.now());

  // Subscribe to drag store with selective updates
  const dragState = useDragStore(state => ({
    isDragging: state.isDragging,
    draggedItem: state.draggedItem,
    dragOverSlot: state.dragOverSlot,
    dragStartPosition: state.dragStartPosition,
    dragCurrentPosition: state.dragCurrentPosition,
    dragPreview: state.dragPreview,
  }));

  // Memoize performance metrics
  const performanceMetrics = useMemo(() => {
    if (!enablePerformanceMonitoring) {
      return {
        updateCount: 0,
        averageUpdateInterval: 0,
        isOptimized: false,
      };
    }

    const contextLifetime = performance.now() - performanceStartTimeRef.current;

    return {
      updateCount: dragState.isDragging ? 1 : 0, // Simplified for this context
      averageUpdateInterval: 1000 / maxUpdateFrequency,
      isOptimized: enableBatching && maxUpdateFrequency >= 30,
    };
  }, [dragState.isDragging, enablePerformanceMonitoring, enableBatching, maxUpdateFrequency]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<DragContextValue>(() => ({
    ...dragState,

    startDrag: (item, position) => {
      if (enablePerformanceMonitoring) {
        dragPerformanceMonitor.recordDragStart();
      }

      startDragOperation(item, position);
    },

    endDrag: () => {
      if (enablePerformanceMonitoring) {
        dragPerformanceMonitor.recordDragEnd();
      }

      endDragOperation();
    },

    updatePosition: (position) => {
      if (enableBatching) {
        // Use batched updates for position changes
        batchedDragUpdater.addUpdate(
          () => updateDragPosition(position),
          5, // Medium priority for position updates
          16 // ~60fps delay
        );
      } else {
        updateDragPosition(position);
      }
    },

    batchUpdates: (updates) => {
      if (enableBatching) {
        updates.forEach(update => {
          batchedDragUpdater.addUpdate(update, 5, 16);
        });
      } else {
        updates.forEach(update => update());
      }
    },

    performanceMetrics,
  }), [dragState, enablePerformanceMonitoring, enableBatching, maxUpdateFrequency]);

  // Performance monitoring for context lifecycle
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      return () => {
        const contextLifetime = performance.now() - performanceStartTimeRef.current;

        if (process.env.NODE_ENV === "development") {
          console.log(`[DRAG CONTEXT] Provider lifetime: ${contextLifetime.toFixed(2)}ms`);
        }
      };
    }
  }, [enablePerformanceMonitoring]);

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
}

/**
 * Hook to access drag context
 */
export function useDragContext(): DragContextValue {
  const context = useContext(DragContext);

  if (!context) {
    throw new Error("useDragContext must be used within a DragContextProvider");
  }

  return context;
}

/**
 * Hook for drag operations with performance monitoring
 */
export function useDragOperations() {
  const {
    isDragging,
    draggedItem,
    startDrag,
    endDrag,
    updatePosition,
    performanceMetrics,
  } = useDragContext();

  // Memoized drag handlers with performance tracking
  const dragHandlers = useMemo(() => ({
    onDragStart: (item: { id: string; type: "task" | "event" }, event: React.DragEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      startDrag(item, position);
    },

    onDragEnd: () => {
      endDrag();
    },

    onDragMove: (event: React.DragEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      updatePosition(position);
    },

    // Touch event handlers for mobile
    onTouchStart: (item: { id: string; type: "task" | "event" }, event: React.TouchEvent) => {
      const touch = event.touches[0];
      const position = { x: touch.clientX, y: touch.clientY };
      startDrag(item, position);
    },

    onTouchEnd: () => {
      endDrag();
    },

    onTouchMove: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      const position = { x: touch.clientX, y: touch.clientY };
      updatePosition(position);
    },
  }), [startDrag, endDrag, updatePosition]);

  return {
    isDragging,
    draggedItem,
    dragHandlers,
    performanceMetrics,
  };
}

/**
 * Hook for optimized drag state subscription
 */
export function useOptimizedDragState() {
  const isDragging = useDragStore(state => state.isDragging);
  const draggedItem = useDragStore(state => state.draggedItem);

  // Only subscribe to specific drag state to minimize re-renders
  return useMemo(() => ({
    isDragging,
    draggedItem,
    isDragActive: isDragging && draggedItem !== null,
  }), [isDragging, draggedItem]);
}

/**
 * Hook for drag performance monitoring
 */
export function useDragPerformance() {
  const { performanceMetrics } = useDragContext();

  const getDetailedMetrics = useMemo(() => {
    return {
      ...performanceMetrics,
      // Add more detailed metrics here if needed
      optimizationLevel: performanceMetrics.isOptimized ? "high" : "low",
      recommendedMaxFrequency: performanceMetrics.isOptimized ? 60 : 30,
    };
  }, [performanceMetrics]);

  return {
    metrics: getDetailedMetrics,
    isOptimized: performanceMetrics.isOptimized,
    canIncreaseFrequency: performanceMetrics.averageUpdateInterval < 16,
  };
}