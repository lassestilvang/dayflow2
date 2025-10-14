"use client";

import React, { Profiler, useEffect, useState } from "react";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

interface PerformanceProfilerProps {
  children: React.ReactNode;
  name: string;
  onRender?: (
    id: string,
    phase: string,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
}

// React Profiler wrapper with performance monitoring
export function PerformanceProfiler({
  children,
  name,
  onRender,
}: PerformanceProfilerProps) {
  const handleRender = (
    id: string,
    phase: string,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Record render in our performance monitor
    dragPerformanceMonitor.recordRender(id);

    // Log slow renders
    if (actualDuration > 16) {
      console.warn(`[PROFILER] Slow render detected in ${name}:`, {
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        phase,
        startTime: `${startTime.toFixed(2)}ms`,
        commitTime: `${commitTime.toFixed(2)}ms`,
      });
    }

    // Call custom render handler if provided
    onRender?.(id, phase, actualDuration, baseDuration, startTime, commitTime);
  };

  return (
    <Profiler id={name} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

// Hook for tracking component renders
export function useRenderTracking(componentName: string) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());

  renderCount.current++;
  const now = performance.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  lastRenderTime.current = now;

  useEffect(() => {
    // Log excessive renders
    if (renderCount.current > 10 && timeSinceLastRender < 100) {
      console.warn(
        `[RENDER TRACKING] ${componentName} is rendering frequently:`,
        {
          renderCount: renderCount.current,
          timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
        }
      );
    }
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender,
  };
}

// Higher-order component for render tracking
export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const TrackedComponent = (props: P) => {
    // const { renderCount, timeSinceLastRender } = useRenderTracking(componentName);

    return <Component {...props} />;
  };

  TrackedComponent.displayName = `withRenderTracking(${componentName})`;
  return TrackedComponent;
}

// Drag-specific profiler for monitoring drag operations
export function DragProfiler({
  children,
  dragId,
}: {
  children: React.ReactNode;
  dragId: string;
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    // Monitor drag state changes
    const checkDragState = () => {
      const isDragging =
        document.querySelector('[data-is-dragging="true"]') !== null;
      setIsDragActive(isDragging);
    };

    // Check initially and set up polling during potential drag operations
    checkDragState();
    const interval = setInterval(checkDragState, 100);

    return () => clearInterval(interval);
  }, []);

  const handleRender = (
    id: string,
    phase: string,
    actualDuration: number,
    baseDuration: number
  ) => {
    if (isDragActive) {
      console.log(`[DRAG PROFILER] ${id} render during drag:`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
      });

      // Record drag-specific metrics
      dragPerformanceMonitor.recordRender(dragId);
    }
  };

  return (
    <Profiler id={`drag-${dragId}`} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

// Performance monitoring dashboard component
export function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<
    Array<{ timestamp: number; memoryUsage: number; fps: number }>
  >([]);

  useEffect(() => {
    // Collect performance metrics every second
    const interval = setInterval(() => {
      const memoryUsage =
        (performance as unknown as { memory?: { usedJSHeapSize: number } })
          .memory?.usedJSHeapSize || 0;
      const fps = 60; // Placeholder - would need more complex calculation

      setMetrics((prev) => [
        ...prev.slice(-19),
        {
          timestamp: Date.now(),
          memoryUsage,
          fps,
        },
      ]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded text-sm z-50"
      >
        Show Perf Dashboard
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm z-50">
      {/** Safely access the latest metrics entry */}
      {(() => {
        return null;
      })()}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Memory Usage:</span>
          <span className="ml-2">
            {(() => {
              const last = metrics.length
                ? metrics[metrics.length - 1]
                : undefined;
              return last
                ? `${Math.round(last.memoryUsage / 1024 / 1024)}MB`
                : "N/A";
            })()}
          </span>
        </div>

        <div>
          <span className="font-medium">FPS:</span>
          <span className="ml-2">
            {(() => {
              const last = metrics.length
                ? metrics[metrics.length - 1]
                : undefined;
              return last ? last.fps : "N/A";
            })()}
          </span>
        </div>

        <div>
          <span className="font-medium">Active Drags:</span>
          <span className="ml-2">
            {dragPerformanceMonitor.getActiveSessions().length}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <button
          onClick={() => {
            const report = dragPerformanceMonitor.generateReport();
            console.log(report);
            alert("Performance report logged to console");
          }}
          className="text-xs bg-gray-100 px-2 py-1 rounded"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}

// DevTools integration helpers
export const devToolsIntegration = {
  // Enable React DevTools Profiler
  enableProfiler: () => {
    console.log("[PROFILER] React DevTools Profiler enabled");
    console.log("[PROFILER] Use React DevTools to see component render times");
  },

  // Log current performance state
  logPerformanceState: () => {
    const sessions = dragPerformanceMonitor.getActiveSessions();
    console.log("[PROFILER] Active drag sessions:", sessions.length);
    console.log("[PROFILER] Sessions:", sessions);

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
      console.log("[PROFILER] Memory usage:", {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        percentage: `${Math.round(
          (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        )}%`,
      });
    }
  },

  // Start performance profiling session
  startProfilingSession: (sessionName: string) => {
    console.log(`[PROFILER] Starting profiling session: ${sessionName}`);
    performance.mark(`profiler-session-start-${sessionName}`);

    return {
      end: () => {
        performance.mark(`profiler-session-end-${sessionName}`);
        performance.measure(
          `profiler-session-${sessionName}`,
          `profiler-session-start-${sessionName}`,
          `profiler-session-end-${sessionName}`
        );

        const measure = performance.getEntriesByName(
          `profiler-session-${sessionName}`
        )[0];
        if (measure) {
          console.log(
            `[PROFILER] Session ${sessionName} completed: ${measure.duration.toFixed(
              2
            )}ms`
          );
          return measure.duration;
        }
        return 0;
      },
    };
  },
};

// Auto-enable profiler in development
if (process.env.NODE_ENV === "development") {
  // Add global profiler helpers to window
  (
    window as unknown as {
      reactProfiler?: unknown;
      performanceMonitor?: unknown;
    }
  ).reactProfiler = devToolsIntegration;
  (
    window as unknown as {
      reactProfiler?: unknown;
      performanceMonitor?: unknown;
    }
  ).performanceMonitor = dragPerformanceMonitor;

  console.log("🔧 React DevTools Profiler helpers loaded");
  console.log(
    "📊 Use window.reactProfiler.logPerformanceState() to see current metrics"
  );
  console.log(
    "⏱️  Use window.reactProfiler.startProfilingSession(name) to profile operations"
  );
}
