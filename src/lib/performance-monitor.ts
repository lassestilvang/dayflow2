// Performance monitoring utilities for drag and drop optimization
// This file provides comprehensive profiling tools for identifying bottlenecks

import React from "react";

export interface PerformanceMetrics {
  dragStartTime: number;
  dragEndTime: number;
  totalDragDuration: number;
  frameDrops: number;
  memoryUsage: number;
  renderCount: number;
  conflictChecks: number;
  positionCalculations: number;
  renderMetrics: {
    totalRenderTime: number;
    averageRenderTime: number;
    slowRenderCount: number;
    optimizedRenderCount: number;
    cacheHitRate: number;
  };
}

export interface DragPerformanceData {
  dragId: string;
  startTime: number;
  endTime?: number;
  metrics: PerformanceMetrics;
  bottlenecks: string[];
  recommendations: string[];
}

// Global performance tracking
class DragPerformanceMonitor {
  private static instance: DragPerformanceMonitor;
  private dragSessions: Map<string, DragPerformanceData> = new Map();
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private isMonitoring = false;
  // Keep a bounded list of recently ended sessions for external consumers
  private recentEndedSessions: DragPerformanceData[] = [];

  static getInstance(): DragPerformanceMonitor {
    if (!DragPerformanceMonitor.instance) {
      DragPerformanceMonitor.instance = new DragPerformanceMonitor();
    }
    return DragPerformanceMonitor.instance;
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();

    // Monitor frame rate
    const monitorFrameRate = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;

      // If frame took longer than 16.67ms (60fps), count as dropped
      if (deltaTime > 16.67) {
        this.frameCount++;
      }

      this.lastFrameTime = now;
      requestAnimationFrame(monitorFrameRate);
    };

    requestAnimationFrame(monitorFrameRate);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  startDragSession(dragId: string): string {
    const session: DragPerformanceData = {
      dragId,
      startTime: performance.now(),
      metrics: {
        dragStartTime: performance.now(),
        dragEndTime: 0,
        totalDragDuration: 0,
        frameDrops: 0,
        memoryUsage: 0,
        renderCount: 0,
        conflictChecks: 0,
        positionCalculations: 0,
        renderMetrics: {
          totalRenderTime: 0,
          averageRenderTime: 0,
          slowRenderCount: 0,
          optimizedRenderCount: 0,
          cacheHitRate: 0,
        },
      },
      bottlenecks: [],
      recommendations: [],
    };

    this.dragSessions.set(dragId, session);

    // Mark performance timeline
    performance.mark(`drag-start-${dragId}`);

    console.log(`[PERF] Started drag session: ${dragId}`);
    return dragId;
  }

  endDragSession(dragId: string): DragPerformanceData | null {
    const session = this.dragSessions.get(dragId);
    if (!session) return null;

    session.endTime = performance.now();
    session.metrics.dragEndTime = session.endTime;
    session.metrics.totalDragDuration = session.endTime - session.startTime;
    session.metrics.frameDrops = this.frameCount;
    session.metrics.memoryUsage =
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize || 0;

    // Mark performance timeline
    performance.mark(`drag-end-${dragId}`);
    performance.measure(
      `drag-duration-${dragId}`,
      `drag-start-${dragId}`,
      `drag-end-${dragId}`
    );

    // Analyze bottlenecks
    this.analyzeBottlenecks(session);

    console.log(`[PERF] Ended drag session: ${dragId}`, session);
    this.dragSessions.delete(dragId);

    // Persist to recent sessions (bounded)
    this.recentEndedSessions.push(session);
    if (this.recentEndedSessions.length > 200) {
      this.recentEndedSessions = this.recentEndedSessions.slice(-200);
    }

    return session;
  }

  recordConflictCheck(dragId: string): void {
    const session = this.dragSessions.get(dragId);
    if (session) {
      session.metrics.conflictChecks++;
    }
  }

  recordPositionCalculation(dragId: string): void {
    const session = this.dragSessions.get(dragId);
    if (session) {
      session.metrics.positionCalculations++;
    }
  }

  recordRender(dragId: string): void {
    const session = this.dragSessions.get(dragId);
    if (session) {
      session.metrics.renderCount++;
    }
  }

  recordRenderMetrics(
    dragId: string,
    metrics: {
      renderTime: number;
      cacheHit?: boolean;
      optimized?: boolean;
    }
  ): void {
    const session = this.dragSessions.get(dragId);
    if (session) {
      session.metrics.renderMetrics.totalRenderTime += metrics.renderTime;
      session.metrics.renderCount++;

      if (metrics.renderTime > 5) {
        session.metrics.renderMetrics.slowRenderCount++;
      }

      if (metrics.optimized) {
        session.metrics.renderMetrics.optimizedRenderCount++;
      }

      // Update average render time
      const totalRenders = session.metrics.renderCount;
      session.metrics.renderMetrics.averageRenderTime =
        session.metrics.renderMetrics.totalRenderTime / totalRenders;

      // Update cache hit rate
      if (metrics.cacheHit !== undefined) {
        const cacheHits =
          session.metrics.renderMetrics.cacheHitRate * (totalRenders - 1) +
          (metrics.cacheHit ? 1 : 0);
        session.metrics.renderMetrics.cacheHitRate = cacheHits / totalRenders;
      }
    }
  }

  private analyzeBottlenecks(session: DragPerformanceData): void {
    const { metrics } = session;

    // Analyze frame drops
    if (metrics.frameDrops > 5) {
      session.bottlenecks.push(
        `High frame drops: ${metrics.frameDrops} frames dropped`
      );
      session.recommendations.push(
        "Consider reducing render frequency during drag operations"
      );
    }

    // Analyze conflict check frequency
    if (metrics.conflictChecks > 50) {
      session.bottlenecks.push(
        `Excessive conflict checks: ${metrics.conflictChecks} checks`
      );
      session.recommendations.push(
        "Implement conflict check throttling or spatial indexing"
      );
    }

    // Analyze position calculations
    if (metrics.positionCalculations > 200) {
      session.bottlenecks.push(
        `High position calculations: ${metrics.positionCalculations} calculations`
      );
      session.recommendations.push(
        "Memoize position calculations and avoid recalculation"
      );
    }

    // Analyze render count
    if (metrics.renderCount > 100) {
      session.bottlenecks.push(
        `Excessive renders: ${metrics.renderCount} renders`
      );
      session.recommendations.push(
        "Implement React.memo and useMemo for drag-related components"
      );
    }

    // Analyze memory usage
    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      session.bottlenecks.push(
        `High memory usage: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`
      );
      session.recommendations.push(
        "Check for memory leaks in event listeners and DOM nodes"
      );
    }

    // Overall performance assessment
    if (metrics.totalDragDuration > 1000) {
      // 1 second
      session.bottlenecks.push(
        `Slow drag operation: ${metrics.totalDragDuration.toFixed(2)}ms`
      );
      session.recommendations.push(
        "Optimize drag performance with GPU acceleration and reduced DOM updates"
      );
    }
  }

  getActiveSessions(): DragPerformanceData[] {
    return Array.from(this.dragSessions.values());
  }

  // Public API: get recently ended sessions within a max age (ms)
  getRecentSessions(maxAgeMs: number = 5 * 60 * 1000): DragPerformanceData[] {
    const now = Date.now();
    return this.recentEndedSessions.filter(
      (s) =>
        typeof s.endTime === "number" && now - (s.endTime as number) < maxAgeMs
    );
  }

  generateReport(): string {
    const sessions = Array.from(this.dragSessions.values());
    if (sessions.length === 0) return "No active drag sessions";

    let report = "=== DRAG PERFORMANCE REPORT ===\n\n";

    sessions.forEach((session) => {
      report += `Drag Session: ${session.dragId}\n`;
      report += `Duration: ${session.metrics.totalDragDuration.toFixed(2)}ms\n`;
      report += `Frame Drops: ${session.metrics.frameDrops}\n`;
      report += `Conflict Checks: ${session.metrics.conflictChecks}\n`;
      report += `Position Calculations: ${session.metrics.positionCalculations}\n`;
      report += `Renders: ${session.metrics.renderCount}\n`;
      report += `Memory: ${Math.round(
        session.metrics.memoryUsage / 1024 / 1024
      )}MB\n\n`;

      if (session.bottlenecks.length > 0) {
        report += "Bottlenecks:\n";
        session.bottlenecks.forEach((b) => (report += `  - ${b}\n`));
        report += "\n";
      }

      if (session.recommendations.length > 0) {
        report += "Recommendations:\n";
        session.recommendations.forEach((r) => (report += `  - ${r}\n`));
        report += "\n";
      }
    });

    return report;
  }
}

// Export singleton instance
export const dragPerformanceMonitor = DragPerformanceMonitor.getInstance();

// Utility functions for marking performance
export const markPerformance = (name: string): void => {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
};

export const measurePerformance = (
  name: string,
  startMark: string,
  endMark: string
): void => {
  if (typeof performance !== "undefined" && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
    } catch (e) {
      // Ignore if marks don't exist
    }
  }
};

// Memory monitoring utilities
export const getMemoryUsage = (): {
  used: number;
  total: number;
  percentage: number;
} => {
  if (
    typeof performance !== "undefined" &&
    (
      performance as unknown as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
      }
    ).memory
  ) {
    const memory = (
      performance as unknown as {
        memory: { usedJSHeapSize: number; totalJSHeapSize: number };
      }
    ).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: Math.round(
        (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      ),
    };
  }
  return { used: 0, total: 0, percentage: 0 };
};

// Frame rate monitoring
export class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsHistory: number[] = [];
  private maxHistorySize = 60; // Track last 60 frames

  start(): void {
    const monitor = () => {
      this.frameCount++;
      const now = performance.now();
      const deltaTime = now - this.lastTime;

      if (deltaTime >= 1000) {
        // Update every second
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.fpsHistory.push(fps);

        if (this.fpsHistory.length > this.maxHistorySize) {
          this.fpsHistory.shift();
        }

        this.frameCount = 0;
        this.lastTime = now;

        console.log(`[FPS] Current: ${fps}, Average: ${this.getAverageFPS()}`);
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    );
  }

  getFPSHistory(): number[] {
    return [...this.fpsHistory];
  }

  reset(): void {
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
  }
}

// React render performance monitoring
export const withRenderTracking = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> => {
  const TrackedComponent = (props: P) => {
    const renderCount = React.useRef(0);
    const lastRenderTime = React.useRef(performance.now());

    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log slow renders
    if (timeSinceLastRender < 16 && renderCount.current > 1) {
      console.warn(
        `[RENDER] ${componentName} rendered ${
          renderCount.current
        } times in ${timeSinceLastRender.toFixed(2)}ms`
      );
    }

    return React.createElement(Component, props);
  };

  TrackedComponent.displayName = `Tracked${componentName}`;
  return TrackedComponent;
};

// Drag-specific performance hooks
export const useDragPerformanceTracking = (dragId: string) => {
  React.useEffect(() => {
    dragPerformanceMonitor.startDragSession(dragId);

    return () => {
      const session = dragPerformanceMonitor.endDragSession(dragId);
      if (session) {
        console.log(`[DRAG PERF] ${dragId} completed:`, session);
      }
    };
  }, [dragId]);

  const recordConflictCheck = React.useCallback(() => {
    dragPerformanceMonitor.recordConflictCheck(dragId);
  }, [dragId]);

  const recordPositionCalculation = React.useCallback(() => {
    dragPerformanceMonitor.recordPositionCalculation(dragId);
  }, [dragId]);

  const recordRenderMetrics = React.useCallback(
    (metrics: {
      renderTime: number;
      cacheHit?: boolean;
      optimized?: boolean;
    }) => {
      dragPerformanceMonitor.recordRenderMetrics(dragId, metrics);
    },
    [dragId]
  );

  return {
    recordConflictCheck,
    recordPositionCalculation,
    recordRenderMetrics,
  };
};
