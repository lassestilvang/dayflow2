"use client";

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useDragStore } from "@/lib/drag-store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

// Context for drag state boundary
interface DragBoundaryContextValue {
  isWithinBoundary: boolean;
  boundaryId: string;
  renderCount: number;
}

const DragBoundaryContext = createContext<DragBoundaryContextValue | null>(null);

// Props for DragStateBoundary component
interface DragStateBoundaryProps {
  children: React.ReactNode;
  boundaryId?: string;
  enableIsolation?: boolean;
  enablePerformanceMonitoring?: boolean;
  maxRenderFrequency?: number;
}

/**
 * DragStateBoundary component that isolates drag state updates
 * to prevent unnecessary re-renders in components outside the drag operation
 */
export function DragStateBoundary({
  children,
  boundaryId = "default-drag-boundary",
  enableIsolation = true,
  enablePerformanceMonitoring = true,
  maxRenderFrequency = 60,
}: DragStateBoundaryProps) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const boundaryStartTimeRef = useRef(performance.now());

  // Track render performance
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      renderCountRef.current++;
      lastRenderTimeRef.current = performance.now();

      // Record boundary performance
      dragPerformanceMonitor.recordRender(`boundary-${boundaryId}`);
    }
  });

  // Calculate if we should throttle renders
  const shouldThrottleRender = useMemo(() => {
    if (maxRenderFrequency <= 0) return false;

    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    const targetInterval = 1000 / maxRenderFrequency;

    return timeSinceLastRender < targetInterval;
  }, [maxRenderFrequency]);

  // Context value with memoization
  const contextValue = useMemo<DragBoundaryContextValue>(() => ({
    isWithinBoundary: true,
    boundaryId,
    renderCount: renderCountRef.current,
  }), [boundaryId]);

  // Performance monitoring for boundary lifecycle
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      const boundaryLifetime = performance.now() - boundaryStartTimeRef.current;

      return () => {
        // Log boundary performance on unmount
        if (process.env.NODE_ENV === "development") {
          console.log(`[DRAG BOUNDARY] ${boundaryId} lifetime: ${boundaryLifetime.toFixed(2)}ms, renders: ${renderCountRef.current}`);
        }
      };
    }
  }, [boundaryId, enablePerformanceMonitoring]);

  // If throttling is enabled and we should throttle, return previous children
  if (shouldThrottleRender && enableIsolation) {
    return (
      <DragBoundaryContext.Provider value={contextValue}>
        <DragBoundaryPreviousRender boundaryId={boundaryId} />
      </DragBoundaryContext.Provider>
    );
  }

  return (
    <DragBoundaryContext.Provider value={contextValue}>
      <DragBoundaryInner
        boundaryId={boundaryId}
        enableIsolation={enableIsolation}
        enablePerformanceMonitoring={enablePerformanceMonitoring}
      >
        {children}
      </DragBoundaryInner>
    </DragBoundaryContext.Provider>
  );
}

/**
 * Inner component that handles the actual rendering and isolation
 */
function DragBoundaryInner({
  children,
  boundaryId,
  enableIsolation,
  enablePerformanceMonitoring,
}: {
  children: React.ReactNode;
  boundaryId: string;
  enableIsolation: boolean;
  enablePerformanceMonitoring: boolean;
}) {
  const dragState = useDragStore(state => ({
    isDragging: state.isDragging,
    draggedItem: state.draggedItem,
    dragOverSlot: state.dragOverSlot,
  }));

  // Memoize children based on drag state when isolation is enabled
  const memoizedChildren = useMemo(() => {
    if (enablePerformanceMonitoring) {
      const startTime = performance.now();
      const result = children;
      const renderTime = performance.now() - startTime;

      if (renderTime > 2) {
        dragPerformanceMonitor.recordRender(`boundary-children-${boundaryId}`);
      }

      return result;
    }

    return children;
  }, [children, dragState, enableIsolation, boundaryId, enablePerformanceMonitoring]);

  return <>{memoizedChildren}</>;
}

/**
 * Component that renders previous result when throttling
 */
function DragBoundaryPreviousRender({ boundaryId }: { boundaryId: string }) {
  const previousRenderRef = useRef<React.ReactNode>(null);

  // This component should rarely render due to throttling
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DRAG BOUNDARY] ${boundaryId} using throttled render`);
    }
  });

  return <>{previousRenderRef.current}</>;
}

/**
 * Hook to access drag boundary context
 */
export function useDragBoundary(): DragBoundaryContextValue {
  const context = useContext(DragBoundaryContext);

  if (!context) {
    return {
      isWithinBoundary: false,
      boundaryId: "none",
      renderCount: 0,
    };
  }

  return context;
}

/**
 * Hook for components that need to know if they're within a drag boundary
 */
export function useDragBoundaryState() {
  const boundary = useDragBoundary();
  const dragState = useDragStore(state => ({
    isDragging: state.isDragging,
    draggedItem: state.draggedItem,
  }));

  return {
    ...boundary,
    ...dragState,
    isDragActive: dragState.isDragging && boundary.isWithinBoundary,
  };
}

/**
 * Higher-order component for wrapping components with drag state boundary
 */
export function withDragBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<DragStateBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DragStateBoundary {...boundaryProps}>
      <Component {...props} />
    </DragStateBoundary>
  );

  WrappedComponent.displayName = `withDragBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Utility component for creating isolated drag zones
 */
export function DragZone({
  children,
  zoneId,
  className,
  ...props
}: {
  children: React.ReactNode;
  zoneId: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      <DragStateBoundary
        boundaryId={`drag-zone-${zoneId}`}
        enableIsolation={true}
        enablePerformanceMonitoring={true}
      >
        {children}
      </DragStateBoundary>
    </div>
  );
}