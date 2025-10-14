import { dragPerformanceMonitor } from "./performance-monitor";

// GPU acceleration configuration
interface GPUAccelerationConfig {
  enableHardwareAcceleration: boolean;
  enableLayerPromotion: boolean;
  enableTransform3d: boolean;
  enableWillChange: boolean;
  maxTextureSize: number;
  enableSubpixelRendering: boolean;
}

// Default GPU acceleration configuration
const defaultGPUConfig: GPUAccelerationConfig = {
  enableHardwareAcceleration: true,
  enableLayerPromotion: true,
  enableTransform3d: true,
  enableWillChange: true,
  maxTextureSize: 4096,
  enableSubpixelRendering: true,
};

// Hardware acceleration utilities
export class GPUAccelerationManager {
  private config: GPUAccelerationConfig;
  private accelerationCache = new Map<string, boolean>();
  private performanceMetrics = {
    acceleratedElements: 0,
    fallbackElements: 0,
    averageAccelerationTime: 0,
  };

  constructor(config: Partial<GPUAccelerationConfig> = {}) {
    this.config = { ...defaultGPUConfig, ...config };
  }

  /**
   * Apply GPU acceleration to DOM element
   */
  accelerateElement(element: HTMLElement, options: {
    enableTransform?: boolean;
    enableOpacity?: boolean;
    enableFilters?: boolean;
    priority?: 'low' | 'medium' | 'high';
  } = {}): void {
    if (!this.config.enableHardwareAcceleration) {
      return;
    }

    const {
      enableTransform = true,
      enableOpacity = false,
      enableFilters = false,
      priority = 'medium',
    } = options;

    const startTime = performance.now();

    try {
      // Check if element is already accelerated
      const elementKey = this.getElementKey(element);
      if (this.accelerationCache.has(elementKey)) {
        return;
      }

      // Apply hardware acceleration styles
      const styles: Record<string, string> = {};

      if (this.config.enableTransform3d && enableTransform) {
        styles.transform = 'translateZ(0)';
      }

      if (this.config.enableLayerPromotion) {
        styles.willChange = this.buildWillChangeValue({
          transform: enableTransform,
          opacity: enableOpacity,
          filter: enableFilters,
        });
      }

      if (this.config.enableSubpixelRendering) {
        styles.backfaceVisibility = 'hidden';
        styles.perspective = '1000px';
      }

      // Apply containment for better performance
      if (priority === 'high') {
        styles.contain = 'layout style paint';
      } else if (priority === 'medium') {
        styles.contain = 'layout style';
      }

      // Apply styles
      Object.assign(element.style, styles);

      // Cache acceleration state
      this.accelerationCache.set(elementKey, true);
      this.performanceMetrics.acceleratedElements++;

      // Record performance metrics
      const accelerationTime = performance.now() - startTime;
      this.updateAverageAccelerationTime(accelerationTime);

    } catch (error) {
      console.error('[GPU ACCELERATION] Error accelerating element:', error);
      this.performanceMetrics.fallbackElements++;
    }
  }

  /**
   * Remove GPU acceleration from element
   */
  decelerateElement(element: HTMLElement): void {
    const elementKey = this.getElementKey(element);

    if (!this.accelerationCache.get(elementKey)) {
      return;
    }

    try {
      // Reset acceleration styles
      const resetStyles: Record<string, string> = {
        transform: '',
        willChange: 'auto',
        backfaceVisibility: '',
        perspective: '',
        contain: '',
      };

      Object.assign(element.style, resetStyles);
      this.accelerationCache.delete(elementKey);
    } catch (error) {
      console.error('[GPU ACCELERATION] Error decelerating element:', error);
    }
  }

  /**
   * Create hardware-accelerated drag preview
   */
  createAcceleratedPreview(
    originalElement: HTMLElement,
    options: {
      scale?: number;
      opacity?: number;
      rotation?: number;
      offset?: { x: number; y: number };
    } = {}
  ): HTMLElement {
    const {
      scale = 1.05,
      opacity = 0.9,
      rotation = 0,
      offset = { x: 0, y: 0 },
    } = options;

    const preview = originalElement.cloneNode(true) as HTMLElement;

    // Copy computed styles
    const computedStyle = window.getComputedStyle(originalElement);
    preview.style.cssText = computedStyle.cssText;

    // Apply GPU acceleration
    this.accelerateElement(preview, {
      enableTransform: true,
      enableOpacity: true,
      priority: 'high',
    });

    // Apply preview-specific styles
    Object.assign(preview.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      transformOrigin: 'center center',
      transition: 'none', // Disable transitions during drag
    });

    // Apply visual effects
    if (scale !== 1) {
      preview.style.transform = `scale(${scale})`;
    }

    if (opacity !== 1) {
      preview.style.opacity = opacity.toString();
    }

    if (rotation !== 0) {
      preview.style.transform = `rotate(${rotation}deg)`;
    }

    // Position preview
    const rect = originalElement.getBoundingClientRect();
    preview.style.left = `${rect.left + (offset.x || 0)}px`;
    preview.style.top = `${rect.top + (offset.y || 0)}px`;
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;

    return preview;
  }

  /**
   * Update drag preview position with hardware acceleration
   */
  updatePreviewPosition(
    preview: HTMLElement,
    x: number,
    y: number,
    options: {
      smooth?: boolean;
      enableRotation?: boolean;
      rotationAngle?: number;
    } = {}
  ): void {
    const { smooth = false, enableRotation = false, rotationAngle = 0 } = options;

    try {
      // Use transform3d for hardware acceleration
      let transform = `translate3d(${x}px, ${y}px, 0)`;

      if (enableRotation && rotationAngle !== 0) {
        transform += ` rotate(${rotationAngle}deg)`;
      }

      if (smooth) {
        preview.style.transition = 'transform 0.1s ease-out';
      } else {
        preview.style.transition = 'none';
      }

      preview.style.transform = transform;
    } catch (error) {
      console.error('[GPU ACCELERATION] Error updating preview position:', error);
    }
  }

  /**
   * Create GPU-accelerated animation for drag feedback
   */
  createDragAnimation(
    element: HTMLElement,
    keyframes: Array<{
      transform?: string;
      opacity?: number;
      scale?: number;
      offset: number;
    }>
  ): Animation | null {
    if (!element.animate) {
      return null; // Fallback for browsers without Web Animations API
    }

    try {
      // Ensure element is GPU accelerated
      this.accelerateElement(element, { priority: 'high' });

      const animationKeyframes = keyframes.map(frame => ({
        ...frame,
        transform: frame.transform || 'translate3d(0, 0, 0)',
      }));

      return element.animate(animationKeyframes, {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards',
      });
    } catch (error) {
      console.error('[GPU ACCELERATION] Error creating drag animation:', error);
      return null;
    }
  }

  /**
   * Optimize element for specific browser
   */
  optimizeForBrowser(element: HTMLElement, browserInfo: { name: string; version: number }): void {
    const { name, version } = browserInfo;

    // Browser-specific optimizations
    switch (name.toLowerCase()) {
      case 'chrome':
      case 'edge':
        if (version >= 90) {
          // Modern Chromium optimizations
          element.style.containIntrinsicSize = 'auto none';
        }
        break;

      case 'firefox':
        if (version >= 85) {
          // Firefox-specific optimizations
          element.style.contain = 'layout style paint';
        }
        break;

      case 'safari':
        if (version >= 14) {
          // Safari optimizations
          element.style.transform = 'translateZ(0)';
        }
        break;
    }
  }

  /**
   * Check if GPU acceleration is supported
   */
  isAccelerationSupported(): boolean {
    // Check for transform3d support
    const testElement = document.createElement('div');
    testElement.style.transform = 'translate3d(0, 0, 0)';

    const computedStyle = window.getComputedStyle(testElement);
    return computedStyle.transform === 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
  }

  /**
   * Get element cache key
   */
  private getElementKey(element: HTMLElement): string {
    return `${element.tagName}-${element.className}-${element.id}`;
  }

  /**
   * Build will-change value based on properties
   */
  private buildWillChangeValue(properties: {
    transform?: boolean;
    opacity?: boolean;
    filter?: boolean;
  }): string {
    const values: string[] = [];

    if (properties.transform) values.push('transform');
    if (properties.opacity) values.push('opacity');
    if (properties.filter) values.push('filter');

    return values.length > 0 ? values.join(', ') : 'auto';
  }

  /**
   * Update average acceleration time
   */
  private updateAverageAccelerationTime(accelerationTime: number): void {
    const current = this.performanceMetrics.averageAccelerationTime;
    const count = this.performanceMetrics.acceleratedElements;

    this.performanceMetrics.averageAccelerationTime =
      (current * (count - 1) + accelerationTime) / count;
  }

  /**
   * Get acceleration statistics
   */
  getStats() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.accelerationCache.size,
      isSupported: this.isAccelerationSupported(),
      config: this.config,
    };
  }

  /**
   * Clear acceleration cache
   */
  clearCache(): void {
    this.accelerationCache.clear();
  }
}

// Global GPU acceleration manager
export const gpuAccelerationManager = new GPUAccelerationManager();

/**
 * React hook for GPU-accelerated drag previews
 */
export function useGPUAcceleratedDrag() {
  const createPreview = React.useCallback((
    originalElement: HTMLElement,
    options?: Parameters<typeof gpuAccelerationManager.createAcceleratedPreview>[1]
  ) => {
    return gpuAccelerationManager.createAcceleratedPreview(originalElement, options);
  }, []);

  const updatePreview = React.useCallback((
    preview: HTMLElement,
    x: number,
    y: number,
    options?: Parameters<typeof gpuAccelerationManager.updatePreviewPosition>[3]
  ) => {
    gpuAccelerationManager.updatePreviewPosition(preview, x, y, options);
  }, []);

  const accelerateElement = React.useCallback((
    element: HTMLElement,
    options?: Parameters<typeof gpuAccelerationManager.accelerateElement>[1]
  ) => {
    gpuAccelerationManager.accelerateElement(element, options);
  }, []);

  const decelerateElement = React.useCallback((element: HTMLElement) => {
    gpuAccelerationManager.decelerateElement(element);
  }, []);

  const getStats = React.useCallback(() => {
    return gpuAccelerationManager.getStats();
  }, []);

  return {
    createPreview,
    updatePreview,
    accelerateElement,
    decelerateElement,
    getStats,
  };
}

/**
 * Hook for browser-specific optimizations
 */
export function useBrowserOptimization() {
  const [browserInfo, setBrowserInfo] = React.useState<{
    name: string;
    version: number;
    isMobile: boolean;
  } | null>(null);

  React.useEffect(() => {
    // Detect browser information
    const userAgent = navigator.userAgent;
    let name = 'unknown';
    let version = 0;

    if (userAgent.includes('Chrome')) {
      name = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Firefox')) {
      name = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Safari')) {
      name = 'safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Edge')) {
      name = 'edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }

    setBrowserInfo({
      name,
      version,
      isMobile: /Mobi|Android/i.test(userAgent),
    });
  }, []);

  const optimizeForBrowser = React.useCallback((element: HTMLElement) => {
    if (browserInfo) {
      gpuAccelerationManager.optimizeForBrowser(element, browserInfo);
    }
  }, [browserInfo]);

  return {
    browserInfo,
    optimizeForBrowser,
    isMobile: browserInfo?.isMobile || false,
  };
}

/**
 * Hook for mobile GPU optimization
 */
export function useMobileGPUOptimization() {
  const { isMobile } = useBrowserOptimization();
  const [isOptimized, setIsOptimized] = React.useState(false);

  React.useEffect(() => {
    if (isMobile && !isOptimized) {
      // Apply mobile-specific GPU optimizations
      const style = document.createElement('style');
      style.textContent = `
        .mobile-gpu-accelerated {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-perspective: 1000;
          perspective: 1000;
          will-change: transform;
        }

        .mobile-drag-preview {
          -webkit-transform: translate3d(var(--x, 0), var(--y, 0), 0);
          transform: translate3d(var(--x, 0), var(--y, 0), 0);
          will-change: transform;
          contain: layout style paint;
        }
      `;

      document.head.appendChild(style);
      setIsOptimized(true);
    }
  }, [isMobile, isOptimized]);

  const applyMobileOptimization = React.useCallback((element: HTMLElement) => {
    if (isMobile) {
      element.classList.add('mobile-gpu-accelerated');
    }
  }, [isMobile]);

  return {
    isMobile,
    isOptimized,
    applyMobileOptimization,
  };
}

// Import React for hooks
import React from "react";