import { useEffect, useRef, useState, useCallback } from "react";

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  domNodes: number;
  collisionChecks: number;
  spatialQueries: number;
  poolStats?: {
    activeCount: number;
    pooledCount: number;
    totalCount: number;
    poolUtilization: number;
  };
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  componentName: string;
}

export interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  componentName?: string;
  trackMemory?: boolean;
  trackDomNodes?: boolean;
  sampleRate?: number; // Sample every N renders
}

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    enabled = true,
    componentName = "Unknown",
    trackMemory = false,
    trackDomNodes = false,
    sampleRate = 1,
  } = options;

  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const collisionChecksRef = useRef(0);
  const spatialQueriesRef = useRef(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    domNodes: 0,
    collisionChecks: 0,
    spatialQueries: 0,
  });

  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);

  // Track render start
  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;

    // Sample based on sample rate
    if (renderCountRef.current % sampleRate !== 0) {
      return;
    }

    startTimeRef.current = performance.now();
  });

  // Track render end
  useEffect(() => {
    if (!enabled || startTimeRef.current === 0) return;

    const renderTime = performance.now() - startTimeRef.current;
    startTimeRef.current = 0;

    const newMetrics: PerformanceMetrics = {
      renderTime,
      domNodes: trackDomNodes ? document.querySelectorAll("*").length : 0,
      collisionChecks: collisionChecksRef.current,
      spatialQueries: spatialQueriesRef.current,
    };

    if (
      trackMemory &&
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    ) {
      newMetrics.memoryUsage = (
        performance as unknown as { memory: { usedJSHeapSize: number } }
      ).memory.usedJSHeapSize;
    }

    setMetrics(newMetrics);

    // Add snapshot
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: newMetrics,
      componentName,
    };

    setSnapshots((prev) => [...prev.slice(-49), snapshot]); // Keep last 50 snapshots
  });

  // Reset counters on component unmount or when dependencies change significantly
  useEffect(() => {
    renderCountRef.current = 0;
    collisionChecksRef.current = 0;
    spatialQueriesRef.current = 0;
  }, [componentName]);

  const recordCollisionCheck = useCallback(() => {
    collisionChecksRef.current += 1;
  }, []);

  const recordSpatialQuery = useCallback(() => {
    spatialQueriesRef.current += 1;
  }, []);

  const resetMetrics = useCallback(() => {
    collisionChecksRef.current = 0;
    spatialQueriesRef.current = 0;
    setSnapshots([]);
  }, []);

  const getAverageMetrics = useCallback(() => {
    if (snapshots.length === 0) {
      return null;
    }

    const totals = snapshots.reduce(
      (acc, snapshot) => {
        acc.renderTime += snapshot.metrics.renderTime;
        acc.collisionChecks += snapshot.metrics.collisionChecks;
        acc.spatialQueries += snapshot.metrics.spatialQueries;
        acc.domNodes += snapshot.metrics.domNodes;
        return acc;
      },
      { renderTime: 0, collisionChecks: 0, spatialQueries: 0, domNodes: 0 }
    );

    const count = snapshots.length;
    return {
      renderTime: totals.renderTime / count,
      collisionChecks: totals.collisionChecks / count,
      spatialQueries: totals.spatialQueries / count,
      domNodes: totals.domNodes / count,
    };
  }, [snapshots]);

  const getPerformanceReport = useCallback(() => {
    const averageMetrics = getAverageMetrics();
    if (!averageMetrics) return null;

    const snapshotCount = snapshots.length;
    const timeRange =
      snapshotCount > 1
        ? {
            start: snapshots[0]!.timestamp,
            end: snapshots[snapshotCount - 1]!.timestamp,
          }
        : null;

    return {
      componentName,
      sampleCount: snapshotCount,
      averageRenderTime: Math.round(averageMetrics.renderTime * 100) / 100,
      averageCollisionChecks:
        Math.round(averageMetrics.collisionChecks * 100) / 100,
      averageSpatialQueries:
        Math.round(averageMetrics.spatialQueries * 100) / 100,
      averageDomNodes: Math.round(averageMetrics.domNodes),
      totalSnapshots: snapshotCount,
      timeRange,
    };
  }, [componentName, snapshots, getAverageMetrics]);

  return {
    metrics,
    snapshots,
    recordCollisionCheck,
    recordSpatialQuery,
    resetMetrics,
    getAverageMetrics,
    getPerformanceReport,
  };
}

/**
 * Hook for monitoring virtual scrolling performance
 */
export function useVirtualScrollMonitor(
  options: UsePerformanceMonitorOptions = {}
) {
  const baseMonitor = usePerformanceMonitor(options);
  const visibleRangeRef = useRef<{ start: number; end: number } | null>(null);
  const scrollCountRef = useRef(0);

  const recordScroll = useCallback(
    (visibleRange: { start: number; end: number }) => {
      visibleRangeRef.current = visibleRange;
      scrollCountRef.current += 1;
    },
    []
  );

  const getVirtualScrollReport = useCallback(() => {
    const baseReport = baseMonitor.getPerformanceReport();
    if (!baseReport) return null;

    return {
      ...baseReport,
      scrollCount: scrollCountRef.current,
      lastVisibleRange: visibleRangeRef.current,
      efficiency:
        baseReport.averageDomNodes > 0
          ? Math.round(
              (baseReport.averageCollisionChecks / baseReport.averageDomNodes) *
                100
            ) / 100
          : 0,
    };
  }, [baseMonitor]);

  return {
    ...baseMonitor,
    recordScroll,
    getVirtualScrollReport,
  };
}

/**
 * Hook for monitoring spatial index performance
 */
export function useSpatialIndexMonitor(
  options: UsePerformanceMonitorOptions = {}
) {
  const baseMonitor = usePerformanceMonitor(options);
  const spatialIndexRef = useRef<{
    getStats?: () => { totalObjects?: number };
  } | null>(null);

  const recordSpatialIndexUsage = useCallback(
    (index: { getStats?: () => { totalObjects?: number } }) => {
      spatialIndexRef.current = index;
    },
    []
  );

  const getSpatialIndexReport = useCallback(() => {
    const baseReport = baseMonitor.getPerformanceReport();
    if (!baseReport || !spatialIndexRef.current) return null;

    const stats =
      spatialIndexRef.current.getStats?.() || ({} as { totalObjects?: number });

    return {
      ...baseReport,
      spatialIndexStats: stats,
      efficiency:
        (stats.totalObjects ?? 0) > 0
          ? Math.round(
              (baseReport.averageSpatialQueries /
                (stats.totalObjects as number)) *
                100
            ) / 100
          : 0,
    };
  }, [baseMonitor]);

  return {
    ...baseMonitor,
    recordSpatialIndexUsage,
    getSpatialIndexReport,
  };
}

/**
 * Hook for monitoring drop zone pool performance
 */
export function useDropZonePoolMonitor(
  options: UsePerformanceMonitorOptions = {}
) {
  const baseMonitor = usePerformanceMonitor(options);
  const poolRef = useRef<{
    getStats?: () => {
      activeCount?: number;
      pooledCount?: number;
      totalCount?: number;
    };
  } | null>(null);

  const recordPoolUsage = useCallback(
    (pool: {
      getStats?: () => {
        activeCount?: number;
        pooledCount?: number;
        totalCount?: number;
      };
    }) => {
      poolRef.current = pool;
    },
    []
  );

  const getPoolReport = useCallback(() => {
    const baseReport = baseMonitor.getPerformanceReport();
    if (!baseReport || !poolRef.current) return null;

    const poolStats = (poolRef.current.getStats?.() || {}) as {
      activeCount?: number;
      pooledCount?: number;
      totalCount?: number;
    };

    return {
      ...baseReport,
      poolStats,
      memoryEfficiency:
        (poolStats.totalCount ?? 0) > 0
          ? Math.round(
              ((poolStats.activeCount ?? 0) /
                (poolStats.totalCount as number)) *
                100
            )
          : 0,
    };
  }, [baseMonitor]);

  return {
    ...baseMonitor,
    recordPoolUsage,
    getPoolReport,
  };
}
