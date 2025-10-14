import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  checkTimeConflictOptimized,
  updateSpatialIndex,
  getSpatialIndexStats,
  initializeSpatialIndex,
  updateSpatialIndexItem,
  type TimeSpatialIndex
} from "@/lib/optimized-conflict-detection";
import {
  checkDragCollisions,
  updateQuadTreeItems,
  getQuadTreePerformanceMetrics,
  initializeQuadTree,
  type QuadTree
} from "@/lib/quadtree-spatial-index";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import type { Event, Task } from "@/types";

// Configuration for optimized conflict detection
interface OptimizedConflictConfig {
  enableTimeSpatialIndex?: boolean;
  enableQuadTree?: boolean;
  enablePerformanceMonitoring?: boolean;
  timeIndexBucketSize?: number;
  quadTreeMaxItems?: number;
  updateThrottleMs?: number;
}

// Default configuration
const defaultConfig: OptimizedConflictConfig = {
  enableTimeSpatialIndex: true,
  enableQuadTree: true,
  enablePerformanceMonitoring: true,
  timeIndexBucketSize: 15,
  quadTreeMaxItems: 8,
  updateThrottleMs: 100,
};

/**
 * Advanced hook for optimized conflict detection with spatial indexing
 */
export function useOptimizedConflictDetection(
  events: Event[],
  tasks: Task[],
  config: OptimizedConflictConfig = {}
) {
  const finalConfig = { ...defaultConfig, ...config };
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const performanceMetricsRef = useRef({
    timeIndexUpdates: 0,
    quadTreeUpdates: 0,
    conflictChecks: 0,
    averageCheckTime: 0,
  });

  // Initialize spatial indices
  useEffect(() => {
    if (finalConfig.enableTimeSpatialIndex) {
      initializeSpatialIndex(events, tasks);
    }

    if (finalConfig.enableQuadTree) {
      // Initialize quadtree with container bounds (would need actual container bounds)
      initializeQuadTree({ x: 0, y: 0, width: 1920, height: 1080 });
    }
  }, [events.length, tasks.length, finalConfig.enableTimeSpatialIndex, finalConfig.enableQuadTree]);

  // Throttled update of spatial indices
  const updateSpatialIndices = useCallback(() => {
    const now = performance.now();

    // Throttle updates to prevent excessive computation
    if (now - lastUpdateTimeRef.current < (finalConfig.updateThrottleMs || 100)) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        updateSpatialIndices();
      }, finalConfig.updateThrottleMs);

      return;
    }

    lastUpdateTimeRef.current = now;

    try {
      if (finalConfig.enableTimeSpatialIndex) {
        updateSpatialIndex([...events, ...tasks]);
        performanceMetricsRef.current.timeIndexUpdates++;
      }

      if (finalConfig.enableQuadTree) {
        // Convert calendar items to quadtree format
        const quadTreeItems = events.map(event => ({
          id: event.id,
          bounds: {
            x: 0, // Would need actual position calculation
            y: 0,
            width: 100,
            height: 60,
          },
          data: event,
        }));

        updateQuadTreeItems(quadTreeItems);
        performanceMetricsRef.current.quadTreeUpdates++;
      }

      if (finalConfig.enablePerformanceMonitoring) {
        dragPerformanceMonitor.recordSpatialIndexUpdate();
      }
    } catch (error) {
      console.error('[OPTIMIZED CONFLICT] Error updating spatial indices:', error);
    }
  }, [events, tasks, finalConfig]);

  // Optimized conflict checking function
  const checkConflict = useCallback((
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ) => {
    const checkStartTime = performance.now();

    try {
      let conflictResult;

      if (finalConfig.enableTimeSpatialIndex) {
        // Use optimized time-based conflict detection
        conflictResult = checkTimeConflictOptimized(
          startTime,
          endTime,
          events,
          tasks,
          excludeId
        );
      } else {
        // Fallback to original method
        const { checkTimeConflict } = require("@/lib/conflict-detection");
        conflictResult = checkTimeConflict(
          startTime,
          endTime,
          events,
          tasks,
          excludeId
        );
      }

      // Record performance metrics
      if (finalConfig.enablePerformanceMonitoring) {
        const checkTime = performance.now() - checkStartTime;
        performanceMetricsRef.current.conflictChecks++;

        // Update average check time
        performanceMetricsRef.current.averageCheckTime =
          (performanceMetricsRef.current.averageCheckTime * (performanceMetricsRef.current.conflictChecks - 1) + checkTime) /
          performanceMetricsRef.current.conflictChecks;

        dragPerformanceMonitor.recordConflictCheck(checkTime);
      }

      return conflictResult;
    } catch (error) {
      console.error('[OPTIMIZED CONFLICT] Error checking conflict:', error);

      // Fallback to original method on error
      try {
        const { checkTimeConflict } = require("@/lib/conflict-detection");
        return checkTimeConflict(startTime, endTime, events, tasks, excludeId);
      } catch (fallbackError) {
        return {
          hasConflict: false,
          conflictingEvents: [],
          suggestions: ["Error checking conflicts"],
        };
      }
    }
  }, [events, tasks, finalConfig]);

  // Check 2D collisions for drag and drop
  const checkDragCollision = useCallback((dragBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }, excludeId?: string) => {
    if (!finalConfig.enableQuadTree) {
      return [];
    }

    try {
      return checkDragCollisions(dragBounds, excludeId);
    } catch (error) {
      console.error('[OPTIMIZED CONFLICT] Error checking drag collision:', error);
      return [];
    }
  }, [finalConfig.enableQuadTree]);

  // Update spatial index for specific item
  const updateItem = useCallback((item: Event | Task, operation: 'add' | 'remove' | 'update') => {
    try {
      if (finalConfig.enableTimeSpatialIndex) {
        updateSpatialIndexItem(item, operation);
      }

      if (finalConfig.enableQuadTree) {
        // Update quadtree (would need bounds calculation)
        const bounds = {
          x: 0, // Would need actual position calculation
          y: 0,
          width: 100,
          height: 60,
        };

        if (operation === 'add') {
          // quadTree.insert would need to be exposed or use updateQuadTreeItems
        } else if (operation === 'remove') {
          // quadTree.remove would need to be exposed
        } else if (operation === 'update') {
          // Update existing item
        }
      }
    } catch (error) {
      console.error('[OPTIMIZED CONFLICT] Error updating item:', error);
    }
  }, [finalConfig]);

  // Get performance statistics
  const getPerformanceStats = useMemo(() => {
    if (!finalConfig.enablePerformanceMonitoring) {
      return null;
    }

    const timeIndexStats = finalConfig.enableTimeSpatialIndex ? getSpatialIndexStats() : null;
    const quadTreeStats = finalConfig.enableQuadTree ? getQuadTreePerformanceMetrics() : null;

    return {
      timeIndex: timeIndexStats,
      quadTree: quadTreeStats,
      custom: performanceMetricsRef.current,
      recommendations: generatePerformanceRecommendations(
        timeIndexStats,
        quadTreeStats,
        performanceMetricsRef.current
      ),
    };
  }, [finalConfig.enablePerformanceMonitoring, finalConfig.enableTimeSpatialIndex, finalConfig.enableQuadTree]);

  // Generate performance recommendations
  const generatePerformanceRecommendations = useCallback((
    timeIndexStats: any,
    quadTreeStats: any,
    customMetrics: any
  ) => {
    const recommendations: string[] = [];

    if (customMetrics.averageCheckTime > 10) {
      recommendations.push("Consider reducing conflict check frequency");
    }

    if (timeIndexStats && timeIndexStats.bucketCount > 500) {
      recommendations.push("Time index has many buckets - consider larger bucket size");
    }

    if (quadTreeStats && quadTreeStats.nodeCount > 100) {
      recommendations.push("Quadtree is deep - consider adjusting max items per node");
    }

    return recommendations;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Core functions
    checkConflict,
    checkDragCollision,
    updateItem,
    updateSpatialIndices,

    // Performance
    performanceStats: getPerformanceStats,

    // Configuration
    config: finalConfig,

    // State
    isOptimized: finalConfig.enableTimeSpatialIndex || finalConfig.enableQuadTree,
  };
}

/**
 * Hook for simple conflict detection with automatic optimization
 */
export function useSmartConflictDetection(
  events: Event[],
  tasks: Task[]
) {
  return useOptimizedConflictDetection(events, tasks, {
    enableTimeSpatialIndex: true,
    enableQuadTree: false, // Disable quadtree for simpler use case
    enablePerformanceMonitoring: true,
  });
}

/**
 * Hook for drag and drop collision detection
 */
export function useDragCollisionDetection() {
  const checkCollision = useCallback((
    dragElement: HTMLElement,
    excludeId?: string
  ) => {
    const bounds = {
      x: dragElement.offsetLeft,
      y: dragElement.offsetTop,
      width: dragElement.offsetWidth,
      height: dragElement.offsetHeight,
    };

    return checkDragCollisions(bounds, excludeId);
  }, []);

  const updateCollisionTree = useCallback((items: Array<{
    id: string;
    element: HTMLElement;
    data: Event | Task;
  }>) => {
    const quadTreeItems = items.map(item => ({
      id: item.id,
      bounds: {
        x: item.element.offsetLeft,
        y: item.element.offsetTop,
        width: item.element.offsetWidth,
        height: item.element.offsetHeight,
      },
      data: item.data,
    }));

    updateQuadTreeItems(quadTreeItems);
  }, []);

  return {
    checkCollision,
    updateCollisionTree,
  };
}

/**
 * Performance monitoring component for conflict detection
 */
export function useConflictDetectionPerformance() {
  const metrics = useRef({
    totalChecks: 0,
    totalTime: 0,
    slowChecks: 0,
    lastCheckTime: 0,
  });

  const recordCheck = useCallback((checkTime: number) => {
    metrics.current.totalChecks++;
    metrics.current.totalTime += checkTime;
    metrics.current.lastCheckTime = checkTime;

    if (checkTime > 5) { // More than 5ms is considered slow
      metrics.current.slowChecks++;
    }
  }, []);

  const getStats = useMemo(() => {
    const { totalChecks, totalTime, slowChecks } = metrics.current;

    if (totalChecks === 0) {
      return {
        averageTime: 0,
        slowCheckPercentage: 0,
        totalChecks: 0,
      };
    }

    return {
      averageTime: totalTime / totalChecks,
      slowCheckPercentage: (slowChecks / totalChecks) * 100,
      totalChecks,
    };
  }, []);

  return {
    recordCheck,
    getStats,
  };
}