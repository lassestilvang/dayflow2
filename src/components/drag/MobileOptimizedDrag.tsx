"use client";

import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { useDragStore } from "@/lib/drag-store";
import { useMobileDragOptimization, useTouchDragComponent, useMobileAnimations } from "@/hooks/useMobileDragOptimization";
import { useOptimizedConflictDetection } from "@/hooks/useOptimizedConflictDetection";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import { cn } from "@/lib/utils";

// Props for mobile-optimized drag component
interface MobileOptimizedDragProps {
  children: React.ReactNode;
  item: { id: string; type: "task" | "event" };
  className?: string;
  disabled?: boolean;
  onDragStart?: (item: { id: string; type: "task" | "event" }) => void;
  onDragEnd?: (item: { id: string; type: "task" | "event" }, duration: number) => void;
  enableHapticFeedback?: boolean;
  enableGPUAcceleration?: boolean;
  enableAnimations?: boolean;
}

/**
 * Mobile-optimized drag component with comprehensive performance optimizations
 */
export function MobileOptimizedDrag({
  children,
  item,
  className,
  disabled = false,
  onDragStart,
  onDragEnd,
  enableHapticFeedback = true,
  enableGPUAcceleration = true,
  enableAnimations = true,
}: MobileOptimizedDragProps) {
  const elementRef = useRef<HTMLElement>(null);
  const dragStartTimeRef = useRef<number>(0);
  const previewRef = useRef<HTMLElement | null>(null);

  // Initialize all optimization systems
  const mobileOptimization = useMobileDragOptimization({
    enableHapticFeedback,
    enableGPUAcceleration,
    enableTouchOptimization: true,
    enableAdaptivePerformance: true,
  });

  const { dragProps } = useTouchDragComponent();
  const { createBounceAnimation, createSlideAnimation } = useMobileAnimations();

  // Current drag state
  const isDragging = useDragStore(state => state.isDragging);
  const draggedItem = useDragStore(state => state.draggedItem);

  // Check if this item is being dragged
  const isThisItemDragging = useMemo(() => {
    return isDragging && draggedItem?.id === item.id && draggedItem?.type === item.type;
  }, [isDragging, draggedItem, item]);

  // Handle drag start with full optimization
  const handleDragStart = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    dragStartTimeRef.current = mobileOptimization.handleMobileDragStart(item, event);

    // Call user-provided callback
    onDragStart?.(item);

    // Create animated preview if enabled
    if (enableAnimations && elementRef.current) {
      const animation = createBounceAnimation(elementRef.current);
      if (animation) {
        animation.play();
      }
    }

    // Record performance metrics
    dragPerformanceMonitor.recordDragStart();
  }, [disabled, item, mobileOptimization, onDragStart, enableAnimations, createBounceAnimation]);

  // Handle drag end with cleanup
  const handleDragEnd = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!dragStartTimeRef.current) return;

    const duration = mobileOptimization.handleMobileDragEnd(dragStartTimeRef.current, event);

    // Call user-provided callback
    onDragEnd?.(item, duration);

    // Cleanup preview
    if (previewRef.current) {
      previewRef.current.remove();
      previewRef.current = null;
    }

    // Reset drag start time
    dragStartTimeRef.current = 0;

    // Record performance metrics
    dragPerformanceMonitor.recordDragEnd();
  }, [mobileOptimization, item, onDragEnd]);

  // Apply mobile optimizations to element
  useEffect(() => {
    if (elementRef.current && mobileOptimization.isMobile) {
      mobileOptimization.mobileOptimization.applyMobileOptimization(elementRef.current);

      if (enableGPUAcceleration) {
        mobileOptimization.gpuAcceleration.accelerateElement(elementRef.current, {
          priority: 'medium',
        });
      }
    }
  }, [mobileOptimization, enableGPUAcceleration]);

  // Performance monitoring
  useEffect(() => {
    if (isThisItemDragging) {
      dragPerformanceMonitor.recordRender(`mobile-drag-${item.id}`);
    }
  });

  // Enhanced drag props with mobile optimization
  const enhancedDragProps = useMemo(() => ({
    ...dragProps,

    onTouchStart: (event: React.TouchEvent) => {
      event.stopPropagation();
      handleDragStart(event);
    },

    onTouchEnd: (event: React.TouchEvent) => {
      event.stopPropagation();
      handleDragEnd(event);
    },

    onTouchMove: (event: React.TouchEvent) => {
      event.stopPropagation();

      // Update drag position
      if (event.touches[0] && dragStartTimeRef.current) {
        const { updatePosition } = useDragStore.getState();
        updatePosition({
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        });
      }

      dragProps.onTouchMove(event);
    },

    // Desktop fallback
    onMouseDown: (event: React.MouseEvent) => {
      if (mobileOptimization.isMobile) return;
      event.stopPropagation();
      handleDragStart(event);
    },

    onMouseUp: (event: React.MouseEvent) => {
      if (mobileOptimization.isMobile) return;
      event.stopPropagation();
      handleDragEnd(event);
    },

    onMouseMove: (event: React.MouseEvent) => {
      if (mobileOptimization.isMobile) return;
      event.stopPropagation();

      if (dragStartTimeRef.current) {
        const { updatePosition } = useDragStore.getState();
        updatePosition({
          x: event.clientX,
          y: event.clientY,
        });
      }
    },
  }), [dragProps, handleDragStart, handleDragEnd, mobileOptimization.isMobile]);

  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        if (el) elementRef.current = el;
      }}
      className={cn(
        "mobile-optimized-drag",
        mobileOptimization.isMobile && "touch-manipulation",
        isThisItemDragging && "mobile-drag-active",
        className
      )}
      {...enhancedDragProps}
      style={{
        // Apply GPU acceleration if enabled
        ...(enableGPUAcceleration && {
          transform: 'translateZ(0)',
          willChange: 'transform',
        }),

        // Mobile-specific styles
        ...(mobileOptimization.isMobile && {
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }),
      }}
    >
      {children}

      {/* Drag preview (created dynamically) */}
      {isThisItemDragging && enableAnimations && (
        <MobileDragPreview
          item={item}
          mobileOptimization={mobileOptimization}
          previewRef={previewRef}
        />
      )}
    </div>
  );
}

/**
 * Mobile drag preview component with GPU acceleration
 */
function MobileDragPreview({
  item,
  mobileOptimization,
  previewRef,
}: {
  item: { id: string; type: "task" | "event" };
  mobileOptimization: ReturnType<typeof useMobileDragOptimization>;
  previewRef: React.MutableRefObject<HTMLElement | null>;
}) {
  const dragPosition = useDragStore(state => state.dragCurrentPosition);

  // Create preview element
  useEffect(() => {
    if (!dragPosition || !previewRef.current) {
      // Find the original element to clone
      const originalElement = document.querySelector(`[data-drag-id="${item.id}"]`) as HTMLElement;
      if (originalElement) {
        previewRef.current = mobileOptimization.createMobilePreview(originalElement, {
          scale: 1.05,
          enableRotation: true,
        });

        if (previewRef.current) {
          document.body.appendChild(previewRef.current);
        }
      }
    }

    return () => {
      if (previewRef.current) {
        previewRef.current.remove();
        previewRef.current = null;
      }
    };
  }, [dragPosition, item.id, mobileOptimization, previewRef]);

  // Update preview position
  useEffect(() => {
    if (previewRef.current && dragPosition) {
      mobileOptimization.updateMobilePreviewPosition(
        previewRef.current,
        dragPosition.x,
        dragPosition.y,
        {
          smooth: true,
          enableRotation: true,
          rotationAngle: 5,
        }
      );
    }
  }, [dragPosition, mobileOptimization]);

  return null; // Preview is rendered in portal
}

/**
 * Mobile-optimized drop zone component
 */
export function MobileOptimizedDropZone({
  children,
  onDrop,
  className,
  acceptTypes = ["task", "event"],
}: {
  children: React.ReactNode;
  onDrop?: (item: { id: string; type: "task" | "event" }, position: { x: number; y: number }) => void;
  className?: string;
  acceptTypes?: Array<"task" | "event">;
}) {
  const mobileOptimization = useMobileDragOptimization();
  const dragOverSlot = useDragStore(state => state.dragOverSlot);

  const handleDragOver = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!mobileOptimization.isMobile) return;

    event.preventDefault();

    // Update drag over slot
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left,
      y: 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top,
    };

    // Convert position to date/hour for calendar drop zones
    // This would need to be customized based on the specific drop zone implementation
    const { setDragOverSlot } = useDragStore.getState();
    setDragOverSlot({
      date: new Date(), // Would need actual date calculation
      hour: Math.floor(position.y / 60), // Assuming 60px per hour
    });
  }, [mobileOptimization.isMobile]);

  const handleDrop = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!mobileOptimization.isMobile) return;

    event.preventDefault();

    const draggedItem = useDragStore.getState().draggedItem;
    if (draggedItem && acceptTypes.includes(draggedItem.type)) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left,
        y: 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top,
      };

      onDrop?.(draggedItem, position);
    }

    // Clear drag over slot
    const { setDragOverSlot } = useDragStore.getState();
    setDragOverSlot(null);
  }, [mobileOptimization.isMobile, acceptTypes, onDrop]);

  return (
    <div
      className={cn(
        "mobile-drop-zone",
        mobileOptimization.isMobile && "touch-manipulation",
        dragOverSlot && "mobile-drag-over",
        className
      )}
      onTouchMove={handleDragOver}
      onTouchEnd={handleDrop}
      onMouseMove={handleDragOver}
      onMouseUp={handleDrop}
      style={{
        // Mobile-specific drop zone styles
        ...(mobileOptimization.isMobile && {
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Mobile performance monitor component
 */
export function MobilePerformanceMonitor({
  isVisible = true,
  position = { top: 20, left: 20 },
}: {
  isVisible?: boolean;
  position?: { top?: number; left?: number; right?: number; bottom?: number };
}) {
  const mobileOptimization = useMobileDragOptimization();

  if (!isVisible || !mobileOptimization.isMobile) {
    return null;
  }

  const { performanceMetrics } = mobileOptimization;

  return (
    <div
      className="fixed z-50 bg-black/90 text-white text-xs p-2 rounded font-mono"
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom,
      }}
    >
      <div className="space-y-1">
        <div>Performance: {mobileOptimization.performanceLevel}</div>
        <div>Frame Rate: {mobileOptimization.adaptiveConfig.maxFrameRate}fps</div>
        <div>Touch Events: {performanceMetrics.touchMetrics.touchMoveCount}</div>
        <div>GPU Usage: {performanceMetrics.gpuStats.acceleratedElements}</div>
        <div>Avg Drag: {performanceMetrics.averageDragDuration.toFixed(1)}ms</div>
      </div>
    </div>
  );
}