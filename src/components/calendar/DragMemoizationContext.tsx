"use client";

import React, { createContext, useContext, useMemo, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import { cacheInvalidationManager } from "@/lib/position-cache";

// Drag memoization state
interface DragMemoizationState {
  isDragging: boolean;
  draggedItemId: string | null;
  dragTransform: { x: number; y: number } | null;
  affectedItems: Set<string>;
  optimizationLevel: "none" | "minimal" | "moderate" | "aggressive";
}

// Context value interface
interface DragMemoizationContextValue {
  state: DragMemoizationState;
  actions: {
    startDrag: (itemId: string) => void;
    updateDrag: (transform: { x: number; y: number }) => void;
    endDrag: () => void;
    invalidateCache: (itemIds: string[]) => void;
    setOptimizationLevel: (level: DragMemoizationState["optimizationLevel"]) => void;
  };
  utils: {
    shouldRender: (itemId: string) => boolean;
    getRenderPriority: (itemId: string) => number;
    isItemAffected: (itemId: string) => boolean;
  };
}

// Create context
const DragMemoizationContext = createContext<DragMemoizationContextValue | null>(null);

// Provider component
interface DragMemoizationProviderProps {
  children: React.ReactNode;
  optimizationLevel?: DragMemoizationState["optimizationLevel"];
}

export function DragMemoizationProvider({
  children,
  optimizationLevel = "moderate"
}: DragMemoizationProviderProps) {
  const isDragging = useAppStore((state) => state.drag.isDragging);
  const draggedItem = useAppStore((state) => state.drag.draggedItem);
  const dragTransform = null; // Transform would need to be tracked separately if needed

  const previousDragState = useRef({ isDragging: false, draggedItemId: null as string | null });
  const affectedItemsRef = useRef(new Set<string>());
  const renderQueueRef = useRef(new Map<string, number>());

  // Memoize drag state
  const state = useMemo<DragMemoizationState>(() => {
    const draggedItemId = draggedItem?.id || null;

    return {
      isDragging,
      draggedItemId,
      dragTransform,
      affectedItems: affectedItemsRef.current,
      optimizationLevel,
    };
  }, [isDragging, draggedItem?.id, dragTransform, optimizationLevel]);

  // Determine affected items based on drag operation
  const calculateAffectedItems = useCallback((draggedItemId: string | null) => {
    const affectedItems = new Set<string>();

    if (!draggedItemId) {
      affectedItemsRef.current = affectedItems;
      return affectedItems;
    }

    // Add the dragged item itself
    affectedItems.add(draggedItemId);

    // For now, we'll mark all items as potentially affected
    // In a more sophisticated implementation, this could use spatial indexing
    // to determine which items are actually affected by the drag operation

    affectedItemsRef.current = affectedItems;
    return affectedItems;
  }, []);

  // Drag lifecycle actions
  const actions = useMemo(() => ({
    startDrag: (itemId: string) => {
      dragPerformanceMonitor.startDragSession(`drag-${itemId}-${Date.now()}`);
      calculateAffectedItems(itemId);
    },

    updateDrag: (_transform: { x: number; y: number }) => {
      // Update render priorities for affected items
      if (state.draggedItemId) {
        renderQueueRef.current.set(state.draggedItemId, Date.now());
      }
    },

    endDrag: () => {
      const dragId = state.draggedItemId ? `drag-${state.draggedItemId}` : 'unknown-drag';
      const session = dragPerformanceMonitor.endDragSession(dragId);

      if (session) {
        console.log(`[DRAG PERF] Completed drag with ${session.metrics.renderCount} renders`);
      }

      // Clear affected items
      affectedItemsRef.current.clear();
      renderQueueRef.current.clear();
    },

    invalidateCache: (itemIds: string[]) => {
      cacheInvalidationManager.batchInvalidate({
        itemIds,
      });
    },

    setOptimizationLevel: (level: DragMemoizationState["optimizationLevel"]) => {
      // This would typically be handled by a state management system
      console.log(`[DRAG MEMO] Optimization level set to: ${level}`);
    },
  }), [state.draggedItemId, calculateAffectedItems]);

  // Utility functions
  const utils = useMemo(() => ({
    shouldRender: (itemId: string): boolean => {
      if (!state.isDragging) return true;

      switch (state.optimizationLevel) {
        case "none":
          return true;
        case "minimal":
          return state.affectedItems.has(itemId) || itemId === state.draggedItemId;
        case "moderate":
          return true; // Render all but with memoization
        case "aggressive":
          // Only render dragged item and items in immediate vicinity
          return state.affectedItems.has(itemId) || itemId === state.draggedItemId;
        default:
          return true;
      }
    },

    getRenderPriority: (itemId: string): number => {
      if (!state.isDragging) return 0;

      const lastRenderTime = renderQueueRef.current.get(itemId) || 0;
      const timeSinceLastRender = Date.now() - lastRenderTime;

      // Higher priority for recently rendered items
      return Math.max(0, 1000 - timeSinceLastRender);
    },

    isItemAffected: (itemId: string): boolean => {
      return state.affectedItems.has(itemId);
    },
  }), [state]);

  // Handle drag state changes
  useEffect(() => {
    const { isDragging: prevIsDragging, draggedItemId: prevDraggedItemId } = previousDragState.current;
    const { isDragging: currentIsDragging, draggedItemId } = state;

    if (!prevIsDragging && currentIsDragging && draggedItemId) {
      // Drag started
      actions.startDrag(draggedItemId);
    } else if (prevIsDragging && !currentIsDragging) {
      // Drag ended
      actions.endDrag();
    } else if (prevDraggedItemId !== draggedItemId) {
      // Different item being dragged
      calculateAffectedItems(draggedItemId);
    }

    previousDragState.current = { isDragging: currentIsDragging, draggedItemId };
  }, [state.isDragging, state.draggedItemId, actions, calculateAffectedItems]);

  const contextValue = useMemo<DragMemoizationContextValue>(() => ({
    state,
    actions,
    utils,
  }), [state, actions, utils]);

  return (
    <DragMemoizationContext.Provider value={contextValue}>
      {children}
    </DragMemoizationContext.Provider>
  );
}

// Hook to use drag memoization context
export function useDragMemoization() {
  const context = useContext(DragMemoizationContext);
  if (!context) {
    throw new Error("useDragMemoization must be used within a DragMemoizationProvider");
  }
  return context;
}

// Hook for components to optimize rendering during drag
export function useDragOptimization(itemId: string) {
  const { state, utils } = useDragMemoization();

  return useMemo(() => ({
    shouldRender: utils.shouldRender(itemId),
    renderPriority: utils.getRenderPriority(itemId),
    isAffected: utils.isItemAffected(itemId),
    isDragging: state.isDragging,
    draggedItemId: state.draggedItemId,
    optimizationLevel: state.optimizationLevel,
  }), [state, utils, itemId]);
}

// Hook for drag performance monitoring
export function useDragPerformance(itemId: string) {
  const { actions } = useDragMemoization();

  return useMemo(() => ({
    invalidateCache: actions.invalidateCache,
    recordConflictCheck: () => dragPerformanceMonitor.recordConflictCheck(`drag-${itemId}`),
    recordPositionCalculation: () => dragPerformanceMonitor.recordPositionCalculation(`drag-${itemId}`),
  }), [actions, itemId]);
}