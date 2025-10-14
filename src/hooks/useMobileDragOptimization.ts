import { useMemo, useEffect, useCallback, useRef } from "react";
import { useTouchOptimization, useMobileDragOptimization } from "@/lib/touch-optimization";
import { useGPUAcceleratedDrag } from "@/lib/gpu-acceleration";
import { useBrowserOptimization, useMobileOptimization, useAdaptivePerformance } from "@/lib/browser-optimization";
import { useDragStore } from "@/lib/drag-store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

// Mobile drag optimization configuration
interface MobileDragConfig {
  enableHapticFeedback?: boolean;
  enableMomentumScrolling?: boolean;
  enableGPUAcceleration?: boolean;
  enableTouchOptimization?: boolean;
  enableAdaptivePerformance?: boolean;
  activationDistance?: number;
  longPressDelay?: number;
  maxFrameRate?: number;
}

// Default mobile drag configuration
const defaultMobileConfig: MobileDragConfig = {
  enableHapticFeedback: true,
  enableMomentumScrolling: true,
  enableGPUAcceleration: true,
  enableTouchOptimization: true,
  enableAdaptivePerformance: true,
  activationDistance: 8,
  longPressDelay: 250,
  maxFrameRate: 60,
};

/**
 * Comprehensive mobile drag optimization hook
 */
export function useMobileDragOptimization(config: MobileDragConfig = {}) {
  const finalConfig = { ...defaultMobileConfig, ...config };

  // Initialize optimization systems
  const touchOptimization = useTouchOptimization();
  const gpuAcceleration = useGPUAcceleratedDrag();
  const browserOptimization = useBrowserOptimization();
  const mobileOptimization = useMobileOptimization();
  const adaptivePerformance = useAdaptivePerformance();

  // Performance monitoring
  const performanceMetricsRef = useRef({
    dragStartCount: 0,
    dragEndCount: 0,
    averageDragDuration: 0,
    touchEventCount: 0,
    gpuAccelerationUsage: 0,
  });

  // Update touch configuration based on adaptive performance
  useEffect(() => {
    if (finalConfig.enableTouchOptimization && adaptivePerformance.performanceLevel) {
      const optimizedConfig = adaptivePerformance.getOptimizedConfig({
        activationDistance: finalConfig.activationDistance,
        activationDelay: finalConfig.longPressDelay,
        enableHapticFeedback: finalConfig.enableHapticFeedback,
      });

      touchOptimization.updateConfig(optimizedConfig);
    }
  }, [adaptivePerformance.performanceLevel, finalConfig, touchOptimization]);

  // Initialize mobile optimizations
  useEffect(() => {
    if (finalConfig.enableTouchOptimization && mobileOptimization.isMobile) {
      touchOptimization.enable();
    }

    return () => {
      if (finalConfig.enableTouchOptimization) {
        touchOptimization.disable();
      }
    };
  }, [finalConfig.enableTouchOptimization, mobileOptimization.isMobile, touchOptimization]);

  // Create mobile-optimized drag preview
  const createMobilePreview = useCallback((
    originalElement: HTMLElement,
    options?: {
      scale?: number;
      enableRotation?: boolean;
      hapticFeedback?: boolean;
    }
  ) => {
    const {
      scale = 1.05,
      enableRotation = false,
      hapticFeedback = finalConfig.enableHapticFeedback,
    } = options || {};

    // Create GPU-accelerated preview
    const preview = gpuAcceleration.createPreview(originalElement, {
      scale,
      opacity: 0.9,
      rotation: enableRotation ? 5 : 0,
    });

    // Apply mobile-specific optimizations
    mobileOptimization.applyMobileOptimization(preview);

    // Apply browser-specific optimizations
    browserOptimization.optimizeElement(preview);

    // Trigger haptic feedback if enabled
    if (hapticFeedback && mobileOptimization.isMobile) {
      try {
        navigator.vibrate?.(50); // Light haptic feedback
      } catch (e) {
        // Haptic feedback not supported
      }
    }

    performanceMetricsRef.current.gpuAccelerationUsage++;

    return preview;
  }, [gpuAcceleration, mobileOptimization, browserOptimization, finalConfig.enableHapticFeedback]);

  // Update drag preview position with mobile optimizations
  const updateMobilePreviewPosition = useCallback((
    preview: HTMLElement,
    x: number,
    y: number,
    options?: {
      smooth?: boolean;
      enableRotation?: boolean;
      rotationAngle?: number;
    }
  ) => {
    const { smooth = false, enableRotation = false, rotationAngle = 0 } = options || {};

    // Use GPU acceleration for smooth updates
    gpuAcceleration.updatePreview(preview, x, y, {
      smooth,
      enableRotation,
      rotationAngle,
    });

    // Apply mobile-specific position constraints
    if (mobileOptimization.isMobile) {
      // Ensure preview stays within viewport bounds
      const rect = preview.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        preview.style.left = `${viewportWidth - rect.width}px`;
      }

      if (y + rect.height > viewportHeight) {
        preview.style.top = `${viewportHeight - rect.height}px`;
      }
    }
  }, [gpuAcceleration, mobileOptimization.isMobile]);

  // Handle mobile drag start
  const handleMobileDragStart = useCallback((
    item: { id: string; type: "task" | "event" },
    event: React.TouchEvent | React.MouseEvent
  ) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const startPosition = {
      x: 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left,
      y: 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top,
    };

    // Record performance metrics
    performanceMetricsRef.current.dragStartCount++;
    const startTime = performance.now();

    // Use optimized drag store
    const { startDrag } = useDragStore.getState();
    startDrag(item, startPosition);

    // Record touch event for metrics
    if ('touches' in event) {
      performanceMetricsRef.current.touchEventCount++;
      touchOptimization.recordTouchStart();
    }

    return startTime;
  }, [touchOptimization]);

  // Handle mobile drag end
  const handleMobileDragEnd = useCallback((
    startTime: number,
    event?: React.TouchEvent | React.MouseEvent
  ) => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Record performance metrics
    performanceMetricsRef.current.dragEndCount++;

    // Update average drag duration
    const current = performanceMetricsRef.current.averageDragDuration;
    const count = performanceMetricsRef.current.dragEndCount;

    performanceMetricsRef.current.averageDragDuration =
      (current * (count - 1) + duration) / count;

    // Use optimized drag store
    const { endDrag } = useDragStore.getState();
    endDrag();

    // Record touch event for metrics
    if (event && 'touches' in event) {
      touchOptimization.recordTouchEnd();
    }

    // Trigger haptic feedback on successful drop
    if (finalConfig.enableHapticFeedback && mobileOptimization.isMobile) {
      try {
        navigator.vibrate?.(100); // Medium haptic feedback for drop
      } catch (e) {
        // Haptic feedback not supported
      }
    }

    return duration;
  }, [touchOptimization, finalConfig.enableHapticFeedback, mobileOptimization.isMobile]);

  // Get comprehensive performance metrics
  const getPerformanceMetrics = useMemo(() => {
    const touchMetrics = touchOptimization.getMetrics();
    const gpuStats = gpuAcceleration.getStats();

    return {
      ...performanceMetricsRef.current,
      touchMetrics,
      gpuStats,
      browserInfo: browserOptimization.browserInfo,
      performanceLevel: adaptivePerformance.performanceLevel,
      isMobile: mobileOptimization.isMobile,
      isOptimized: mobileOptimization.isOptimized,
    };
  }, [touchOptimization, gpuAcceleration, browserOptimization.browserInfo, adaptivePerformance.performanceLevel, mobileOptimization]);

  // Adaptive configuration based on performance
  const adaptiveConfig = useMemo(() => {
    const baseConfig = adaptivePerformance.getOptimizedConfig(finalConfig);

    // Further optimize based on real-time performance
    if (performanceMetricsRef.current.averageDragDuration > 100) {
      // Slow drags - reduce frame rate and disable advanced features
      baseConfig.maxFrameRate = Math.min(baseConfig.maxFrameRate, 30);
      baseConfig.enableGPUAcceleration = false;
    } else if (performanceMetricsRef.current.averageDragDuration < 50) {
      // Fast drags - can enable more features
      baseConfig.maxFrameRate = 60;
      baseConfig.enableGPUAcceleration = true;
    }

    return baseConfig;
  }, [adaptivePerformance, finalConfig]);

  return {
    // Core functions
    createMobilePreview,
    updateMobilePreviewPosition,
    handleMobileDragStart,
    handleMobileDragEnd,

    // State
    isMobile: mobileOptimization.isMobile,
    isOptimized: mobileOptimization.isOptimized,
    performanceLevel: adaptivePerformance.performanceLevel,

    // Configuration
    config: finalConfig,
    adaptiveConfig,

    // Performance
    performanceMetrics: getPerformanceMetrics,

    // Utilities
    touchOptimization,
    gpuAcceleration,
    browserOptimization,
    mobileOptimization,
    adaptivePerformance,
  };
}

/**
 * Hook for touch-optimized drag and drop components
 */
export function useTouchDragComponent() {
  const mobileOptimization = useMobileDragOptimization();

  const dragProps = useMemo(() => ({
    onTouchStart: (item: { id: string; type: "task" | "event" }) =>
      (event: React.TouchEvent) => {
        event.preventDefault(); // Prevent scrolling
        mobileOptimization.handleMobileDragStart(item, event);
      },

    onTouchMove: (event: React.TouchEvent) => {
      event.preventDefault(); // Prevent scrolling
      mobileOptimization.touchOptimization.recordTouchMove();

      // Update drag position
      if (event.touches[0]) {
        const { updatePosition } = useDragStore.getState();
        updatePosition({
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        });
      }
    },

    onTouchEnd: (startTime: number) =>
      (event: React.TouchEvent) => {
        event.preventDefault();
        mobileOptimization.handleMobileDragEnd(startTime, event);
      },

    // Mouse events for desktop fallback
    onMouseDown: (item: { id: string; type: "task" | "event" }) =>
      (event: React.MouseEvent) => {
        if (mobileOptimization.isMobile) return; // Don't handle mouse on mobile
        mobileOptimization.handleMobileDragStart(item, event);
      },

    onMouseMove: (event: React.MouseEvent) => {
      if (mobileOptimization.isMobile) return; // Don't handle mouse on mobile
      const { updatePosition } = useDragStore.getState();
      updatePosition({
        x: event.clientX,
        y: event.clientY,
      });
    },

    onMouseUp: (startTime: number) =>
      (event: React.MouseEvent) => {
        if (mobileOptimization.isMobile) return; // Don't handle mouse on mobile
        mobileOptimization.handleMobileDragEnd(startTime, event);
      },
  }), [mobileOptimization]);

  return {
    dragProps,
    ...mobileOptimization,
  };
}

/**
 * Hook for GPU-accelerated mobile animations
 */
export function useMobileAnimations() {
  const gpuAcceleration = useGPUAcceleratedDrag();
  const { isMobile } = useMobileOptimization();

  const createBounceAnimation = useCallback((element: HTMLElement) => {
    if (!isMobile) return null;

    return gpuAcceleration.createPreview(element, {
      scale: 1.1,
      opacity: 0.8,
    });
  }, [gpuAcceleration, isMobile]);

  const createSlideAnimation = useCallback((
    element: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number = 50
  ) => {
    if (!isMobile) return null;

    const animations = {
      up: `translate3d(0, -${distance}px, 0)`,
      down: `translate3d(0, ${distance}px, 0)`,
      left: `translate3d(-${distance}px, 0, 0)`,
      right: `translate3d(${distance}px, 0, 0)`,
    };

    return gpuAcceleration.createDragAnimation(element, [
      { transform: 'translate3d(0, 0, 0)', offset: 0 },
      { transform: animations[direction], offset: 0.5 },
      { transform: 'translate3d(0, 0, 0)', offset: 1 },
    ]);
  }, [gpuAcceleration, isMobile]);

  return {
    createBounceAnimation,
    createSlideAnimation,
    isMobile,
  };
}