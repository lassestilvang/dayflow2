import { useMemo, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import { selectiveRenderManager } from "@/components/calendar/SelectiveRenderManager";

// Render optimization configuration
export interface RenderOptimizerConfig {
  debounceMs?: number;
  throttleMs?: number;
  priority?: number;
  enableProfiling?: boolean;
  enableBatching?: boolean;
  maxRenderFrequency?: number;
}

// Render optimization state
interface RenderOptimizerState {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  isOptimized: boolean;
  optimizationLevel: "none" | "low" | "medium" | "high" | "aggressive";
}

// Render metrics for profiling
interface RenderMetrics {
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  renderCount: number;
  optimizationSavings: number;
}

/**
 * Advanced render optimization hook with fine-grained control
 */
export function useRenderOptimizer(
  componentId: string,
  config: RenderOptimizerConfig = {}
) {
  const {
    debounceMs = 0,
    throttleMs = 16, // ~60fps
    priority = 0,
    enableProfiling = true,
    enableBatching = true,
    maxRenderFrequency = 60,
  } = config;

  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderTimeRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const renderCountRef = useRef(0);
  const isDragging = useAppStore((state) => state.drag.isDragging);

  // Calculate optimization state
  const optimizerState = useMemo<RenderOptimizerState>(() => {
    const renderTimes = renderTimesRef.current;
    const renderCount = renderCountRef.current;

    const averageRenderTime =
      renderTimes.length > 0
        ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
        : 0;

    // Determine optimization level based on performance
    let optimizationLevel: RenderOptimizerState["optimizationLevel"] = "none";

    if (isDragging) {
      if (averageRenderTime > 5) optimizationLevel = "aggressive";
      else if (averageRenderTime > 3) optimizationLevel = "high";
      else if (averageRenderTime > 2) optimizationLevel = "medium";
      else optimizationLevel = "low";
    }

    return {
      renderCount,
      lastRenderTime: lastRenderTimeRef.current,
      averageRenderTime,
      isOptimized: optimizationLevel !== "none",
      optimizationLevel,
    };
  }, [isDragging]);

  // Check if component should render based on optimization settings
  const shouldRender = useCallback(() => {
    const now = performance.now();

    // Check throttle limit
    if (throttleMs > 0 && now - lastRenderTimeRef.current < throttleMs) {
      return false;
    }

    // Check if registered with selective render manager
    if (selectiveRenderManager) {
      return selectiveRenderManager.shouldRender(componentId);
    }

    return true;
  }, [componentId, throttleMs]);

  // Optimized render function with debouncing and profiling
  const render = useCallback(
    (renderFn: () => void) => {
      const now = performance.now();

      // Clear existing timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }

      const executeRender = () => {
        const startTime = performance.now();

        try {
          renderFn();
        } finally {
          const renderTime = performance.now() - startTime;

          // Record render metrics
          lastRenderTimeRef.current = now;
          renderCountRef.current++;
          renderTimesRef.current.push(renderTime);

          // Keep only last 50 render times
          if (renderTimesRef.current.length > 50) {
            renderTimesRef.current.shift();
          }

          // Record with performance monitor
          if (enableProfiling) {
            dragPerformanceMonitor.recordRender(
              `${componentId}-${renderCountRef.current}`
            );
          }

          // Register with selective render manager
          if (selectiveRenderManager) {
            selectiveRenderManager.recordRender(componentId, renderTime);
          }
        }
      };

      // Apply debouncing if configured
      if (debounceMs > 0) {
        renderTimeoutRef.current = setTimeout(executeRender, debounceMs);
      } else {
        executeRender();
      }
    },
    [componentId, debounceMs, enableProfiling]
  );

  // Force render function that bypasses optimization
  const forceRender = useCallback(
    (renderFn: () => void) => {
      const startTime = performance.now();

      try {
        renderFn();
      } finally {
        const renderTime = performance.now() - startTime;

        // Always record forced renders
        lastRenderTimeRef.current = performance.now();
        renderCountRef.current++;
        renderTimesRef.current.push(renderTime);

        if (enableProfiling) {
          dragPerformanceMonitor.recordRender(`force-${componentId}`);
        }
      }
    },
    [componentId, enableProfiling]
  );

  // Batch multiple renders together
  const batchRender = useCallback(
    (renderFns: (() => void)[]) => {
      if (!enableBatching || renderFns.length === 0) {
        renderFns.forEach((renderFn) => render(renderFn));
        return;
      }

      // Execute all renders in a single batch
      render(() => {
        renderFns.forEach((renderFn) => {
          try {
            renderFn();
          } catch (error) {
            console.error(`[RENDER OPTIMIZER] Error in batched render:`, error);
          }
        });
      });
    },
    [render, enableBatching]
  );

  // Get render metrics
  const getMetrics = useCallback((): RenderMetrics => {
    const renderTimes = renderTimesRef.current;

    if (renderTimes.length === 0) {
      return {
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: 0,
        renderCount: renderCountRef.current,
        optimizationSavings: 0,
      };
    }

    const totalTime = renderTimes.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / renderTimes.length;
    const maxTime = Math.max(...renderTimes);
    const minTime = Math.min(...renderTimes);

    // Estimate optimization savings (rough calculation)
    const unoptimizedEstimate = renderCountRef.current * averageTime;
    const actualTime = totalTime;
    const optimizationSavings = Math.max(0, unoptimizedEstimate - actualTime);

    return {
      totalTime,
      averageTime,
      maxTime,
      minTime,
      renderCount: renderCountRef.current,
      optimizationSavings,
    };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderTimesRef.current = [];
    renderCountRef.current = 0;
    lastRenderTimeRef.current = 0;
  }, []);

  // Update priority in render manager
  useEffect(() => {
    if (selectiveRenderManager) {
      selectiveRenderManager.registerComponent(componentId, priority);
    }
  }, [componentId, priority]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...optimizerState,

    // Control functions
    shouldRender,
    render,
    forceRender,
    batchRender,

    // Metrics and profiling
    getMetrics,
    resetMetrics,

    // Configuration
    config: {
      debounceMs,
      throttleMs,
      priority,
      enableProfiling,
      enableBatching,
      maxRenderFrequency,
    },

    // Current context
    isDragging,
  };
}

/**
 * Hook for conditional rendering based on optimization state
 */
export function useConditionalRender(
  componentId: string,
  condition: () => boolean,
  config?: RenderOptimizerConfig
) {
  const optimizer = useRenderOptimizer(componentId, config);

  const shouldRenderConditionally = useCallback(() => {
    return optimizer.shouldRender() && condition();
  }, [optimizer, condition]);

  return {
    ...optimizer,
    shouldRender: shouldRenderConditionally,
  };
}

/**
 * Hook for adaptive rendering based on performance
 */
export function useAdaptiveRender(
  componentId: string,
  config?: RenderOptimizerConfig
) {
  const optimizer = useRenderOptimizer(componentId, config);

  // Adapt optimization settings based on performance
  const adaptiveConfig = useMemo(() => {
    const metrics = optimizer.getMetrics();
    const { averageTime, renderCount } = metrics;

    // Increase optimization if performance is poor
    if (averageTime > 5 && renderCount > 10) {
      return {
        ...config,
        throttleMs: Math.min((config?.throttleMs || 16) * 2, 32),
        debounceMs: Math.max(config?.debounceMs || 0, 8),
      };
    }

    // Reduce optimization if performance is good
    if (averageTime < 2 && renderCount > 20) {
      return {
        ...config,
        throttleMs: Math.max((config?.throttleMs || 16) / 2, 8),
        debounceMs: Math.max((config?.debounceMs || 0) / 2, 0),
      };
    }

    return config;
  }, [optimizer.getMetrics, config]);

  return {
    ...optimizer,
    adaptiveConfig,
  };
}
