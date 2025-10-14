import React from "react";
import { dragPerformanceMonitor } from "./performance-monitor";
import { positionCache } from "./position-cache";

// Bottleneck types and their characteristics
export interface RenderBottleneck {
  type:
    | "position_calculation"
    | "excessive_renders"
    | "memory_leak"
    | "cache_inefficiency"
    | "layout_thrashing";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  impact: string;
  component?: string;
  metrics?: Record<string, number>;
}

// Optimization suggestion
export interface OptimizationSuggestion {
  id: string;
  type: "cache" | "memoization" | "isolation" | "batching" | "profiling";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedImpact: string;
  implementationEffort: "low" | "medium" | "high";
  actionItems: string[];
}

// Bottleneck detection thresholds
const BOTTLENECK_THRESHOLDS = {
  positionCalculations: { medium: 100, high: 200, critical: 500 },
  renderCount: { medium: 50, high: 100, critical: 200 },
  renderTime: { medium: 3, high: 5, critical: 10 },
  memoryUsage: {
    medium: 25 * 1024 * 1024,
    high: 50 * 1024 * 1024,
    critical: 100 * 1024 * 1024,
  },
  cacheMissRate: { medium: 0.3, high: 0.5, critical: 0.8 },
};

/**
 * Advanced render bottleneck detection system
 */
export class RenderBottleneckDetector {
  private static instance: RenderBottleneckDetector;
  private detectionHistory: Map<string, RenderBottleneck[]> = new Map();
  private optimizationSuggestions: OptimizationSuggestion[] = [];

  static getInstance(): RenderBottleneckDetector {
    if (!RenderBottleneckDetector.instance) {
      RenderBottleneckDetector.instance = new RenderBottleneckDetector();
    }
    return RenderBottleneckDetector.instance;
  }

  /**
   * Analyze drag session for bottlenecks
   */
  analyzeDragSession(dragId: string): RenderBottleneck[] {
    const session = dragPerformanceMonitor
      .getActiveSessions()
      .find((s) => s.dragId === dragId);
    if (!session) return [];

    const bottlenecks: RenderBottleneck[] = [];
    const { metrics } = session;

    // Detect position calculation bottlenecks
    if (
      metrics.positionCalculations >
      BOTTLENECK_THRESHOLDS.positionCalculations.high
    ) {
      bottlenecks.push({
        type: "position_calculation",
        severity:
          metrics.positionCalculations >
          BOTTLENECK_THRESHOLDS.positionCalculations.critical
            ? "critical"
            : "high",
        description: `Excessive position calculations: ${metrics.positionCalculations} calculations during drag`,
        impact: "Causes layout thrashing and poor drag performance",
        metrics: { positionCalculations: metrics.positionCalculations },
      });
    }

    // Detect excessive render bottlenecks
    if (metrics.renderCount > BOTTLENECK_THRESHOLDS.renderCount.high) {
      bottlenecks.push({
        type: "excessive_renders",
        severity:
          metrics.renderCount > BOTTLENECK_THRESHOLDS.renderCount.critical
            ? "critical"
            : "high",
        description: `Too many renders: ${metrics.renderCount} renders during drag operation`,
        impact: "Reduces frame rate and causes visual stuttering",
        metrics: { renderCount: metrics.renderCount },
      });
    }

    // Detect memory leak patterns
    if (metrics.memoryUsage > BOTTLENECK_THRESHOLDS.memoryUsage.medium) {
      bottlenecks.push({
        type: "memory_leak",
        severity:
          metrics.memoryUsage > BOTTLENECK_THRESHOLDS.memoryUsage.high
            ? "high"
            : "medium",
        description: `High memory usage: ${Math.round(
          metrics.memoryUsage / 1024 / 1024
        )}MB during drag`,
        impact: "May cause browser slowdown and crashes",
        metrics: { memoryUsage: metrics.memoryUsage },
      });
    }

    // Detect cache inefficiency
    const cacheStats = positionCache.getStats();
    if (cacheStats.hitRate < 1 - BOTTLENECK_THRESHOLDS.cacheMissRate.medium) {
      bottlenecks.push({
        type: "cache_inefficiency",
        severity:
          cacheStats.hitRate < 1 - BOTTLENECK_THRESHOLDS.cacheMissRate.high
            ? "high"
            : "medium",
        description: `Low cache hit rate: ${(cacheStats.hitRate * 100).toFixed(
          1
        )}%`,
        impact: "Position calculations are not being cached effectively",
        metrics: { cacheHitRate: cacheStats.hitRate },
      });
    }

    // Detect layout thrashing (inferred from render time)
    if (
      metrics.renderMetrics.averageRenderTime >
      BOTTLENECK_THRESHOLDS.renderTime.medium
    ) {
      bottlenecks.push({
        type: "layout_thrashing",
        severity:
          metrics.renderMetrics.averageRenderTime >
          BOTTLENECK_THRESHOLDS.renderTime.high
            ? "high"
            : "medium",
        description: `Slow average render time: ${metrics.renderMetrics.averageRenderTime.toFixed(
          2
        )}ms`,
        impact: "Indicates forced layout calculations during renders",
        metrics: { averageRenderTime: metrics.renderMetrics.averageRenderTime },
      });
    }

    // Store detection history
    this.detectionHistory.set(dragId, bottlenecks);

    return bottlenecks;
  }

  /**
   * Generate optimization suggestions based on detected bottlenecks
   */
  generateOptimizationSuggestions(
    bottlenecks: RenderBottleneck[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    bottlenecks.forEach((bottleneck) => {
      switch (bottleneck.type) {
        case "position_calculation":
          suggestions.push({
            id: "position-cache-optimization",
            type: "cache",
            title: "Implement Position Calculation Caching",
            description:
              "Cache expensive position calculations to avoid recalculation during drag operations",
            priority: bottleneck.severity === "critical" ? "high" : "medium",
            estimatedImpact: "50-80% reduction in position calculation time",
            implementationEffort: "medium",
            actionItems: [
              "Implement PositionCache class with LRU eviction",
              "Add intelligent cache invalidation strategies",
              "Integrate with existing calculateEventPosition function",
              "Add cache performance monitoring",
            ],
          });
          break;

        case "excessive_renders":
          suggestions.push({
            id: "memoization-optimization",
            type: "memoization",
            title: "Add Component Memoization",
            description:
              "Use React.memo and useMemo to prevent unnecessary re-renders",
            priority: bottleneck.severity === "critical" ? "high" : "medium",
            estimatedImpact: "30-60% reduction in render count",
            implementationEffort: "low",
            actionItems: [
              "Wrap TimeBlock and DayColumn components with React.memo",
              "Add custom comparison functions for selective memoization",
              "Implement useMemo for expensive calculations",
              "Add drag state isolation boundaries",
            ],
          });
          break;

        case "memory_leak":
          suggestions.push({
            id: "memory-optimization",
            type: "profiling",
            title: "Memory Leak Detection and Cleanup",
            description:
              "Identify and fix memory leaks in event listeners and DOM nodes",
            priority: "medium",
            estimatedImpact: "20-40% reduction in memory usage",
            implementationEffort: "high",
            actionItems: [
              "Audit event listeners for proper cleanup",
              "Check for detached DOM nodes",
              "Implement component unmount cleanup",
              "Add memory usage monitoring",
            ],
          });
          break;

        case "cache_inefficiency":
          suggestions.push({
            id: "cache-strategy-optimization",
            type: "cache",
            title: "Optimize Cache Strategy",
            description:
              "Improve cache hit rate with better invalidation and sizing strategies",
            priority: "medium",
            estimatedImpact: "40-70% improvement in cache hit rate",
            implementationEffort: "medium",
            actionItems: [
              "Analyze cache key generation strategy",
              "Implement dependency-based invalidation",
              "Adjust cache size and TTL settings",
              "Add cache pre-warming for common positions",
            ],
          });
          break;

        case "layout_thrashing":
          suggestions.push({
            id: "layout-optimization",
            type: "isolation",
            title: "Prevent Layout Thrashing",
            description:
              "Separate read and write operations to prevent forced layout calculations",
            priority: "high",
            estimatedImpact: "60-90% reduction in render time",
            implementationEffort: "medium",
            actionItems: [
              "Use CSS transforms instead of position changes",
              "Batch DOM read operations",
              "Implement drag state boundaries",
              "Use requestAnimationFrame for position updates",
            ],
          });
          break;
      }
    });

    this.optimizationSuggestions = suggestions;
    return suggestions;
  }

  /**
   * Analyze all recent drag sessions for patterns
   */
  analyzeRecentSessions(): {
    bottlenecks: RenderBottleneck[];
    suggestions: OptimizationSuggestion[];
    trends: Record<string, "improving" | "degrading" | "stable">;
  } {
    const recentSessions = dragPerformanceMonitor.getRecentSessions(300000); // Last 5 minutes

    const allBottlenecks: RenderBottleneck[] = [];
    const trends: Record<string, "improving" | "degrading" | "stable"> = {};

    recentSessions.forEach((session) => {
      const bottlenecks = this.analyzeDragSession(session.dragId);
      allBottlenecks.push(...bottlenecks);

      // Track trends (simplified)
      if (session.metrics.totalDragDuration > 1000) {
        trends.performance = "degrading";
      } else {
        trends.performance = "improving";
      }
    });

    const suggestions = this.generateOptimizationSuggestions(allBottlenecks);

    return {
      bottlenecks: allBottlenecks,
      suggestions,
      trends,
    };
  }

  /**
   * Get real-time bottleneck monitoring
   */
  getRealTimeBottlenecks(): {
    activeBottlenecks: RenderBottleneck[];
    performanceScore: number;
    recommendations: string[];
  } {
    const activeSessions = dragPerformanceMonitor.getActiveSessions();
    const activeBottlenecks: RenderBottleneck[] = [];

    activeSessions.forEach((session) => {
      const bottlenecks = this.analyzeDragSession(session.dragId);
      activeBottlenecks.push(...bottlenecks);
    });

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(activeBottlenecks);

    // Generate real-time recommendations
    const recommendations =
      this.generateRealTimeRecommendations(activeBottlenecks);

    return {
      activeBottlenecks,
      performanceScore,
      recommendations,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(bottlenecks: RenderBottleneck[]): number {
    if (bottlenecks.length === 0) return 100;

    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeight = bottlenecks.reduce(
      (sum, b) => sum + severityWeights[b.severity],
      0
    );

    // Start with 100 and deduct points based on bottlenecks
    const score = Math.max(0, 100 - totalWeight * 5);

    return Math.round(score);
  }

  /**
   * Generate real-time recommendations
   */
  private generateRealTimeRecommendations(
    bottlenecks: RenderBottleneck[]
  ): string[] {
    const recommendations: string[] = [];

    const hasPositionBottleneck = bottlenecks.some(
      (b) => b.type === "position_calculation"
    );
    const hasRenderBottleneck = bottlenecks.some(
      (b) => b.type === "excessive_renders"
    );
    const hasMemoryBottleneck = bottlenecks.some(
      (b) => b.type === "memory_leak"
    );

    if (hasPositionBottleneck) {
      recommendations.push("Enable position calculation caching");
    }

    if (hasRenderBottleneck) {
      recommendations.push("Increase memoization level for drag operations");
    }

    if (hasMemoryBottleneck) {
      recommendations.push("Check for memory leaks in event handlers");
    }

    if (bottlenecks.length === 0) {
      recommendations.push("Performance looks good - no bottlenecks detected");
    }

    return recommendations;
  }

  /**
   * Get optimization suggestions for a specific component
   */
  getComponentOptimizationSuggestions(
    componentId: string
  ): OptimizationSuggestion[] {
    return this.optimizationSuggestions.filter((suggestion) =>
      suggestion.actionItems.some((action) =>
        action.toLowerCase().includes(componentId.toLowerCase())
      )
    );
  }

  /**
   * Clear detection history
   */
  clearHistory(): void {
    this.detectionHistory.clear();
    this.optimizationSuggestions = [];
  }
}

// Global bottleneck detector instance
export const renderBottleneckDetector = RenderBottleneckDetector.getInstance();

/**
 * Hook for real-time bottleneck monitoring
 */
export function useBottleneckDetection(componentId?: string) {
  const [bottlenecks, setBottlenecks] = React.useState<RenderBottleneck[]>([]);
  const [suggestions, setSuggestions] = React.useState<
    OptimizationSuggestion[]
  >([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const analysis = renderBottleneckDetector.analyzeRecentSessions();
      setBottlenecks(analysis.bottlenecks);

      if (componentId) {
        const componentSuggestions =
          renderBottleneckDetector.getComponentOptimizationSuggestions(
            componentId
          );
        setSuggestions(componentSuggestions);
      } else {
        setSuggestions(analysis.suggestions);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [componentId]);

  return {
    bottlenecks,
    suggestions,
    realTimeBottlenecks: renderBottleneckDetector.getRealTimeBottlenecks(),
  };
}
