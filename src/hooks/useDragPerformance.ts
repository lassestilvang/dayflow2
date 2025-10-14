import { useMemo, useEffect, useRef } from "react";
import { useDragStore, getDragPerformanceMetrics, resetDragPerformanceMetrics } from "@/lib/drag-store";
import { getBatchPerformanceMetrics } from "@/lib/batched-drag-updater";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

// Extended Performance interface for memory access
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Performance thresholds for drag operations
interface DragPerformanceThresholds {
  maxUpdateInterval: number; // Maximum time between updates (ms)
  maxRenderTime: number; // Maximum render time per frame (ms)
  maxMemoryIncrease: number; // Maximum memory increase during drag (MB)
  minFrameRate: number; // Minimum acceptable frame rate (fps)
}

// Default performance thresholds
const defaultThresholds: DragPerformanceThresholds = {
  maxUpdateInterval: 32, // ~30fps minimum
  maxRenderTime: 16, // 16ms per frame for 60fps
  maxMemoryIncrease: 50, // 50MB max increase
  minFrameRate: 30, // 30fps minimum
};

// Performance monitoring configuration
interface DragPerformanceConfig {
  thresholds?: Partial<DragPerformanceThresholds>;
  enableRealTimeMonitoring?: boolean;
  enableMemoryTracking?: boolean;
  enableFrameRateTracking?: boolean;
  monitoringInterval?: number; // Monitoring interval in ms
}

/**
 * Comprehensive drag performance monitoring hook
 */
export function useDragPerformance(config: DragPerformanceConfig = {}) {
  const {
    thresholds: userThresholds = {},
    enableRealTimeMonitoring = true,
    enableMemoryTracking = true,
    enableFrameRateTracking = true,
    monitoringInterval = 1000,
  } = config;

  const thresholds = { ...defaultThresholds, ...userThresholds };
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceHistoryRef = useRef<Array<{
    timestamp: number;
    metrics: ReturnType<typeof getDragPerformanceMetrics>;
    memoryUsage?: number;
    frameRate?: number;
  }>>([]);

  // Current drag state for subscription
  const isDragging = useDragStore(state => state.isDragging);

  // Memoized performance metrics
  const currentMetrics = useMemo(() => {
    const dragMetrics = getDragPerformanceMetrics();
    const batchMetrics = getBatchPerformanceMetrics();

    return {
      drag: dragMetrics,
      batch: batchMetrics,
      combined: {
        updateCount: dragMetrics.updateCount,
        averageUpdateInterval: dragMetrics.averageUpdateInterval,
        isOptimized: dragMetrics.averageUpdateInterval <= thresholds.maxUpdateInterval,
        queueLength: batchMetrics.queueLength,
        isProcessing: batchMetrics.isProcessing,
      },
    };
  }, [isDragging, thresholds.maxUpdateInterval]);

  // Performance analysis
  const performanceAnalysis = useMemo(() => {
    const { combined } = currentMetrics;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze update interval
    if (combined.averageUpdateInterval > thresholds.maxUpdateInterval) {
      issues.push(`Slow update interval: ${combined.averageUpdateInterval.toFixed(2)}ms`);
      recommendations.push("Consider reducing drag update frequency or optimizing state updates");
    }

    // Analyze queue length
    if (combined.queueLength > 10) {
      issues.push(`Large update queue: ${combined.queueLength} items`);
      recommendations.push("Consider increasing batch processing frequency");
    }

    // Analyze processing state
    if (combined.isProcessing && combined.queueLength > 0) {
      issues.push("Batch processor may be overloaded");
      recommendations.push("Consider optimizing batch processing logic");
    }

    return {
      isOptimal: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20)), // Simple scoring system
    };
  }, [currentMetrics, thresholds]);

  // Real-time monitoring
  useEffect(() => {
    if (!enableRealTimeMonitoring) return;

    monitoringIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const dragMetrics = getDragPerformanceMetrics();

      // Track memory usage if enabled
      let memoryUsage: number | undefined;
      if (enableMemoryTracking && (performance as PerformanceWithMemory).memory) {
        memoryUsage = (performance as PerformanceWithMemory).memory!.usedJSHeapSize / (1024 * 1024); // MB
      }

      // Track frame rate if enabled
      let frameRate: number | undefined;
      if (enableFrameRateTracking) {
        // Simple frame rate estimation based on update intervals
        frameRate = dragMetrics.averageUpdateInterval > 0 ?
          Math.min(60, 1000 / dragMetrics.averageUpdateInterval) : 60;
      }

      // Store performance history
      performanceHistoryRef.current.push({
        timestamp: now,
        metrics: dragMetrics,
        memoryUsage,
        frameRate,
      });

      // Keep only last 50 measurements
      if (performanceHistoryRef.current.length > 50) {
        performanceHistoryRef.current.shift();
      }

      // Check for performance issues
      if (dragMetrics.averageUpdateInterval > thresholds.maxUpdateInterval) {
        console.warn('[DRAG PERFORMANCE] Slow update interval detected:', {
          interval: dragMetrics.averageUpdateInterval,
          threshold: thresholds.maxUpdateInterval,
        });
      }

    }, monitoringInterval);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
    };
  }, [enableRealTimeMonitoring, enableMemoryTracking, enableFrameRateTracking, monitoringInterval, thresholds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  // Performance reporting
  const getPerformanceReport = useMemo(() => {
    const history = performanceHistoryRef.current;

    if (history.length === 0) {
      return {
        summary: "No performance data available",
        averageUpdateInterval: 0,
        averageMemoryUsage: 0,
        averageFrameRate: 0,
        trend: "stable",
      };
    }

    const recentHistory = history.slice(-10); // Last 10 measurements
    const averageUpdateInterval = recentHistory.reduce((sum, h) => sum + h.metrics.averageUpdateInterval, 0) / recentHistory.length;
    const averageMemoryUsage = recentHistory.reduce((sum, h) => sum + (h.memoryUsage || 0), 0) / recentHistory.length;
    const averageFrameRate = recentHistory.reduce((sum, h) => sum + (h.frameRate || 0), 0) / recentHistory.length;

    // Simple trend analysis
    const olderHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
    const newerHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));

    const olderAvg = olderHalf.reduce((sum, h) => sum + h.metrics.averageUpdateInterval, 0) / olderHalf.length;
    const newerAvg = newerHalf.reduce((sum, h) => sum + h.metrics.averageUpdateInterval, 0) / newerHalf.length;

    let trend: "improving" | "degrading" | "stable" = "stable";
    if (newerAvg < olderAvg * 0.9) trend = "improving";
    else if (newerAvg > olderAvg * 1.1) trend = "degrading";

    return {
      summary: `Average update interval: ${averageUpdateInterval.toFixed(2)}ms, Memory: ${averageMemoryUsage.toFixed(1)}MB, Frame rate: ${averageFrameRate.toFixed(1)}fps`,
      averageUpdateInterval,
      averageMemoryUsage,
      averageFrameRate,
      trend,
      measurementCount: history.length,
    };
  }, [currentMetrics]);

  return {
    // Current metrics
    currentMetrics,

    // Analysis
    performanceAnalysis,

    // Historical data
    performanceReport: getPerformanceReport,

    // Actions
    resetMetrics: resetDragPerformanceMetrics,

    // Configuration
    thresholds,

    // State
    isMonitoring: enableRealTimeMonitoring,
  };
}

/**
 * Hook for simple drag performance metrics
 */
export function useDragMetrics() {
  const metrics = useDragStore(state => {
    // Access any state to trigger subscription
    return state.isDragging;
  });

  return useMemo(() => ({
    ...getDragPerformanceMetrics(),
    isOptimized: getDragPerformanceMetrics().averageUpdateInterval <= 16,
  }), [metrics]);
}

/**
 * Hook for drag performance alerts
 */
export function useDragPerformanceAlerts(config: DragPerformanceConfig = {}) {
  const { performanceAnalysis } = useDragPerformance(config);
  const alertHistoryRef = useRef<string[]>([]);

  // Generate alerts based on performance analysis
  const alerts = useMemo(() => {
    const newAlerts: string[] = [];

    performanceAnalysis.issues.forEach(issue => {
      if (!alertHistoryRef.current.includes(issue)) {
        newAlerts.push(issue);
        alertHistoryRef.current.push(issue);
      }
    });

    // Keep only last 10 alerts
    if (alertHistoryRef.current.length > 10) {
      alertHistoryRef.current = alertHistoryRef.current.slice(-10);
    }

    return newAlerts;
  }, [performanceAnalysis.issues]);

  return {
    alerts,
    hasIssues: performanceAnalysis.issues.length > 0,
    performanceScore: performanceAnalysis.score,
    recommendations: performanceAnalysis.recommendations,
  };
}