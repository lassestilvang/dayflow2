"use client";

import React, { memo, useMemo, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import { useSelectiveRender } from "./SelectiveRenderManager";

interface DragStateBoundaryProps {
  children: React.ReactNode;
  boundaryId: string;
  isolationLevel?: "none" | "shallow" | "deep";
  priority?: number;
  affectedByDrag?: (draggedItemId: string | null) => boolean;
}

// Boundary render state
interface BoundaryState {
  renderCount: number;
  lastDragState: string | null;
  isolationActive: boolean;
  childrenCount: number;
}

// Memoized boundary wrapper component
const BoundaryWrapper = memo(function BoundaryWrapper({
  children,
  boundaryId,
  isolationLevel,
  shouldIsolate,
  onRender,
}: {
  children: React.ReactNode;
  boundaryId: string;
  isolationLevel: "none" | "shallow" | "deep";
  shouldIsolate: boolean;
  onRender: (renderTime: number) => void;
}) {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    onRender(renderTime);
  });

  // Apply isolation wrapper if needed
  if (shouldIsolate && isolationLevel !== "none") {
    return (
      <div
        data-drag-boundary={boundaryId}
        className={shouldIsolate ? "drag-isolation-active" : ""}
        style={{
          // Apply CSS containment for better performance isolation
          contain: isolationLevel === "deep" ? "layout style paint" : "layout",
          // Isolate transforms to prevent layout thrashing
          willChange: shouldIsolate ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
});

export const DragStateBoundary = memo(function DragStateBoundary({
  children,
  boundaryId,
  isolationLevel = "shallow",
  priority = 0,
  affectedByDrag,
}: DragStateBoundaryProps) {
  const isDragging = useAppStore((state) => state.drag.isDragging);
  const draggedItem = useAppStore((state) => state.drag.draggedItem);
  const draggedItemId = draggedItem?.id || null;

  const boundaryState = useRef<BoundaryState>({
    renderCount: 0,
    lastDragState: null,
    isolationActive: false,
    childrenCount: React.Children.count(children),
  });

  // Map this component's isolation to manager's isolation levels to avoid any-casts
  const mappedIsolationLevel = useMemo(() => {
    if (isolationLevel === "deep") return "subtree" as const;
    if (isolationLevel === "shallow") return "component" as const;
    return "none" as const;
  }, [isolationLevel]);

  // Use selective rendering for this boundary
  const { shouldRender } = useSelectiveRender(
    boundaryId,
    priority,
    mappedIsolationLevel
  );

  // Check if this boundary is affected by current drag
  const isAffected = useMemo(() => {
    if (!isDragging || !draggedItemId) return false;
    return affectedByDrag ? affectedByDrag(draggedItemId) : true;
  }, [isDragging, draggedItemId, affectedByDrag]);

  // Determine if isolation should be active
  const shouldIsolate = useMemo(() => {
    if (isolationLevel === "none") return false;
    if (!isDragging) return false;

    return isAffected;
  }, [isDragging, isAffected, isolationLevel]);

  // Update boundary state for tracking
  useMemo(() => {
    if (!shouldRender) return;

    const currentDragState = draggedItemId || "none";
    const lastDragState = boundaryState.current.lastDragState;

    // Always update if drag state changed
    if (currentDragState !== lastDragState) {
      boundaryState.current.lastDragState = currentDragState;
    }

    // Update if isolation state changed
    if (boundaryState.current.isolationActive !== shouldIsolate) {
      boundaryState.current.isolationActive = shouldIsolate;
    }
  }, [shouldRender, draggedItemId, shouldIsolate]);

  // Handle render recording
  const handleRender = useCallback(
    (renderTime: number) => {
      boundaryState.current.renderCount++;

      // Record performance metrics
      dragPerformanceMonitor.recordRender(`boundary-${boundaryId}`);

      // Log slow renders
      if (renderTime > 3) {
        console.warn(
          `[DRAG BOUNDARY] Slow render detected: ${boundaryId} took ${renderTime.toFixed(
            2
          )}ms`
        );
      }
    },
    [boundaryId]
  );

  // Update isolation state in render manager
  useEffect(() => {
    if (shouldIsolate !== boundaryState.current.isolationActive) {
      boundaryState.current.isolationActive = shouldIsolate;
    }
  }, [shouldIsolate]);

  // Memoize wrapper props to prevent unnecessary re-renders
  const wrapperProps = useMemo(
    () => ({
      boundaryId,
      isolationLevel,
      priority,
      shouldIsolate,
      onRender: handleRender,
    }),
    [boundaryId, isolationLevel, priority, shouldIsolate, handleRender]
  );

  // If boundary shouldn't render, return null or minimal placeholder
  if (!shouldRender) {
    return (
      <div
        data-drag-boundary={boundaryId}
        data-render-blocked="true"
        style={{ display: "none" }}
      />
    );
  }

  return <BoundaryWrapper {...wrapperProps}>{children}</BoundaryWrapper>;
});

// Higher-order component for wrapping components with drag boundaries
export function withDragBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryId: string,
  options: {
    isolationLevel?: "none" | "shallow" | "deep";
    priority?: number;
    affectedByDrag?: (draggedItemId: string | null) => boolean;
  } = {}
) {
  const WrappedComponent = memo(function WrappedComponent(props: P) {
    return (
      <DragStateBoundary
        boundaryId={boundaryId}
        isolationLevel={options.isolationLevel}
        priority={options.priority}
        affectedByDrag={options.affectedByDrag}
      >
        <Component {...props} />
      </DragStateBoundary>
    );
  });

  WrappedComponent.displayName = `withDragBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Hook for components to check if they're within a drag boundary
export function useDragBoundary(boundaryId?: string) {
  const isDragging = useAppStore((state) => state.drag.isDragging);
  const draggedItem = useAppStore((state) => state.drag.draggedItem);

  return useMemo(
    () => ({
      isDragging,
      draggedItemId: draggedItem?.id || null,
      boundaryId,
      isWithinBoundary: !!boundaryId,
    }),
    [isDragging, draggedItem?.id, boundaryId]
  );
}

// Utility function to create boundary configurations
export const createBoundaryConfig = {
  // For time blocks - isolate during drag
  timeBlock: (blockId: string) => ({
    isolationLevel: "shallow" as const,
    priority: 1,
    affectedByDrag: (draggedItemId: string | null) => draggedItemId === blockId,
  }),

  // For day columns - moderate isolation
  dayColumn: (_dateKey: string) => ({
    isolationLevel: "shallow" as const,
    priority: 2,
    affectedByDrag: () => true, // Day columns are always potentially affected
  }),

  // For calendar grid - deep isolation for performance
  calendarGrid: () => ({
    isolationLevel: "deep" as const,
    priority: 3,
    affectedByDrag: () => true,
  }),
};
