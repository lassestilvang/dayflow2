import { gpuAccelerationManager } from "./gpu-acceleration";
import { touchManager } from "./touch-optimization";

// Browser detection utilities
interface BrowserInfo {
  name: string;
  version: number;
  engine: string;
  platform: string;
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsTouch: boolean;
  devicePixelRatio: number;
}

// Performance capabilities
interface BrowserCapabilities {
  maxTextureSize: number;
  supportsHardwareAcceleration: boolean;
  supportsPassiveListeners: boolean;
  supportsIntersectionObserver: boolean;
  supportsWebAnimations: boolean;
  supportsCustomProperties: boolean;
}

// Browser-specific optimization strategies
interface BrowserOptimizationStrategy {
  enableGPUAcceleration: boolean;
  enableTouchOptimization: boolean;
  enableBatchedUpdates: boolean;
  maxFrameRate: number;
  updateThrottle: number;
  memoryLimit: number;
}

/**
 * Browser detection and capability analysis
 */
export class BrowserOptimizer {
  private browserInfo: BrowserInfo | null = null;
  private capabilities: BrowserCapabilities | null = null;
  private optimizationStrategy: BrowserOptimizationStrategy | null = null;

  constructor() {
    this.detectBrowser();
    this.analyzeCapabilities();
    this.createOptimizationStrategy();
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): void {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Browser detection
    let name = 'unknown';
    let version = 0;
    let engine = 'unknown';

    if (userAgent.includes('Chrome')) {
      name = 'chrome';
      engine = 'blink';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Firefox')) {
      name = 'firefox';
      engine = 'gecko';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'safari';
      engine = 'webkit';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (userAgent.includes('Edge')) {
      name = 'edge';
      engine = 'blink';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }

    this.browserInfo = {
      name,
      version,
      engine,
      platform,
      isMobile: /Mobi|Android/i.test(userAgent),
      supportsWebGL: this.checkWebGLSupport(),
      supportsTouch: 'ontouchstart' in window,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }

  /**
   * Analyze browser capabilities
   */
  private analyzeCapabilities(): void {
    if (!this.browserInfo) return;

    const { name, version, isMobile } = this.browserInfo;

    // Check WebGL support
    const supportsWebGL = this.checkWebGLSupport();

    // Check various browser features
    const capabilities: BrowserCapabilities = {
      maxTextureSize: this.getMaxTextureSize(),
      supportsHardwareAcceleration: this.checkHardwareAcceleration(),
      supportsPassiveListeners: this.checkPassiveListenerSupport(),
      supportsIntersectionObserver: 'IntersectionObserver' in window,
      supportsWebAnimations: 'animate' in document.createElement('div'),
      supportsCustomProperties: CSS.supports('color', 'var(--test)'),
    };

    this.capabilities = capabilities;
  }

  /**
   * Create optimization strategy based on browser capabilities
   */
  private createOptimizationStrategy(): void {
    if (!this.browserInfo || !this.capabilities) return;

    const { name, version, isMobile, devicePixelRatio } = this.browserInfo;
    const { supportsHardwareAcceleration, maxTextureSize } = this.capabilities;

    // Base strategy
    const strategy: BrowserOptimizationStrategy = {
      enableGPUAcceleration: supportsHardwareAcceleration,
      enableTouchOptimization: isMobile || this.browserInfo.supportsTouch,
      enableBatchedUpdates: true,
      maxFrameRate: 60,
      updateThrottle: 16, // ~60fps
      memoryLimit: 100, // 100MB default
    };

    // Browser-specific adjustments
    switch (name) {
      case 'chrome':
        if (version >= 90) {
          strategy.maxFrameRate = 60;
          strategy.updateThrottle = 16;
          strategy.memoryLimit = 150;
        } else if (version >= 80) {
          strategy.maxFrameRate = 60;
          strategy.updateThrottle = 16;
          strategy.memoryLimit = 100;
        }
        break;

      case 'firefox':
        if (version >= 85) {
          strategy.maxFrameRate = 60;
          strategy.updateThrottle = 16;
          strategy.memoryLimit = 120;
        } else {
          strategy.maxFrameRate = 30; // Firefox can be slower with complex animations
          strategy.updateThrottle = 32;
        }
        break;

      case 'safari':
        if (version >= 14) {
          strategy.maxFrameRate = 60;
          strategy.updateThrottle = 16;
          strategy.memoryLimit = 80; // Safari has more conservative memory limits
        } else {
          strategy.maxFrameRate = 30;
          strategy.updateThrottle = 32;
        }
        break;

      case 'edge':
        if (version >= 90) {
          strategy.maxFrameRate = 60;
          strategy.updateThrottle = 16;
          strategy.memoryLimit = 150;
        }
        break;
    }

    // Mobile-specific adjustments
    if (isMobile) {
      strategy.maxFrameRate = Math.min(strategy.maxFrameRate, 30); // Mobile devices may have lower frame rates
      strategy.updateThrottle = Math.max(strategy.updateThrottle, 32);
      strategy.memoryLimit = Math.min(strategy.memoryLimit, 50); // Mobile memory constraints
    }

    // High DPI adjustments
    if (devicePixelRatio > 1) {
      strategy.memoryLimit = Math.floor(strategy.memoryLimit * (devicePixelRatio * 0.5));
    }

    this.optimizationStrategy = strategy;
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Check hardware acceleration support
   */
  private checkHardwareAcceleration(): boolean {
    const testElement = document.createElement('div');
    testElement.style.transform = 'translate3d(0, 0, 0)';

    const computedStyle = window.getComputedStyle(testElement);
    return computedStyle.transform === 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
  }

  /**
   * Check passive listener support
   */
  private checkPassiveListenerSupport(): boolean {
    let supportsPassive = false;

    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() {
          supportsPassive = true;
        }
      });

      window.addEventListener('testPassive', null as any, opts);
      window.removeEventListener('testPassive', null as any, opts);
    } catch (e) {}

    return supportsPassive;
  }

  /**
   * Get maximum texture size for GPU acceleration
   */
  private getMaxTextureSize(): number {
    if (this.browserInfo?.supportsWebGL) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          return gl.getParameter(gl.MAX_TEXTURE_SIZE);
        }
      } catch (e) {}
    }

    // Fallback based on browser
    if (this.browserInfo?.isMobile) {
      return 2048; // Mobile devices typically have smaller texture limits
    }

    return 4096; // Desktop default
  }

  /**
   * Apply browser-specific optimizations to element
   */
  optimizeElement(element: HTMLElement): void {
    if (!this.browserInfo || !this.capabilities) return;

    // Apply GPU acceleration if supported
    if (this.capabilities.supportsHardwareAcceleration) {
      gpuAccelerationManager.accelerateElement(element, { priority: 'high' });
    }

    // Apply browser-specific optimizations
    gpuAccelerationManager.optimizeForBrowser(element, this.browserInfo);

    // Apply mobile-specific optimizations
    if (this.browserInfo.isMobile && this.optimizationStrategy?.enableTouchOptimization) {
      element.classList.add('mobile-optimized');
    }
  }

  /**
   * Get current browser information
   */
  getBrowserInfo(): BrowserInfo | null {
    return this.browserInfo ? { ...this.browserInfo } : null;
  }

  /**
   * Get browser capabilities
   */
  getCapabilities(): BrowserCapabilities | null {
    return this.capabilities ? { ...this.capabilities } : null;
  }

  /**
   * Get optimization strategy
   */
  getOptimizationStrategy(): BrowserOptimizationStrategy | null {
    return this.optimizationStrategy ? { ...this.optimizationStrategy } : null;
  }

  /**
   * Update optimization strategy based on performance feedback
   */
  updateStrategyFromPerformance(performanceData: {
    averageFrameRate: number;
    memoryUsage: number;
    updateInterval: number;
  }): void {
    if (!this.optimizationStrategy) return;

    const { averageFrameRate, memoryUsage, updateInterval } = performanceData;

    // Adjust frame rate based on actual performance
    if (averageFrameRate < 30 && this.optimizationStrategy.maxFrameRate > 30) {
      this.optimizationStrategy.maxFrameRate = 30;
      this.optimizationStrategy.updateThrottle = 32;
    } else if (averageFrameRate > 50 && this.optimizationStrategy.maxFrameRate < 60) {
      this.optimizationStrategy.maxFrameRate = 60;
      this.optimizationStrategy.updateThrottle = 16;
    }

    // Adjust memory limit based on usage
    if (memoryUsage > this.optimizationStrategy.memoryLimit * 0.8) {
      this.optimizationStrategy.memoryLimit = Math.floor(memoryUsage * 1.2);
    }
  }
}

// Global browser optimizer instance
export const browserOptimizer = new BrowserOptimizer();

/**
 * React hook for browser-aware optimizations
 */
export function useBrowserOptimization() {
  const [optimizationInfo, setOptimizationInfo] = React.useState<{
    browser: BrowserInfo | null;
    capabilities: BrowserCapabilities | null;
    strategy: BrowserOptimizationStrategy | null;
  }>({
    browser: null,
    capabilities: null,
    strategy: null,
  });

  React.useEffect(() => {
    // Update optimization info when browser is detected
    const updateInfo = () => {
      setOptimizationInfo({
        browser: browserOptimizer.getBrowserInfo(),
        capabilities: browserOptimizer.getCapabilities(),
        strategy: browserOptimizer.getOptimizationStrategy(),
      });
    };

    updateInfo();

    // Update periodically to catch any changes
    const interval = setInterval(updateInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  const optimizeElement = React.useCallback((element: HTMLElement) => {
    browserOptimizer.optimizeElement(element);
  }, []);

  const updateStrategyFromPerformance = React.useCallback((performanceData: {
    averageFrameRate: number;
    memoryUsage: number;
    updateInterval: number;
  }) => {
    browserOptimizer.updateStrategyFromPerformance(performanceData);
    setOptimizationInfo(prev => ({
      ...prev,
      strategy: browserOptimizer.getOptimizationStrategy(),
    }));
  }, []);

  return {
    ...optimizationInfo,
    optimizeElement,
    updateStrategyFromPerformance,
  };
}

/**
 * Hook for mobile-specific optimizations
 */
export function useMobileOptimization() {
  const { browser, strategy } = useBrowserOptimization();
  const isMobile = browser?.isMobile || false;

  React.useEffect(() => {
    if (isMobile && strategy?.enableTouchOptimization) {
      // Enable touch optimization for mobile devices
      touchManager.enable();

      // Add mobile-specific CSS
      const mobileStyles = document.getElementById('mobile-optimization-styles');
      if (!mobileStyles) {
        const style = document.createElement('style');
        style.id = 'mobile-optimization-styles';
        style.textContent = `
          .mobile-optimized {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            user-select: none;
          }

          .mobile-drag-element {
            position: relative;
            z-index: 1;
          }

          .mobile-drag-element:active {
            z-index: 9999;
          }
        `;
        document.head.appendChild(style);
      }
    }

    return () => {
      if (isMobile) {
        touchManager.disable();
      }
    };
  }, [isMobile, strategy?.enableTouchOptimization]);

  const applyMobileOptimization = React.useCallback((element: HTMLElement) => {
    if (isMobile) {
      element.classList.add('mobile-optimized', 'mobile-drag-element');
      browserOptimizer.optimizeElement(element);
    }
  }, [isMobile]);

  return {
    isMobile,
    applyMobileOptimization,
    touchEnabled: strategy?.enableTouchOptimization || false,
  };
}

/**
 * Hook for adaptive performance based on device capabilities
 */
export function useAdaptivePerformance() {
  const { browser, capabilities, strategy } = useBrowserOptimization();
  const [performanceLevel, setPerformanceLevel] = React.useState<'low' | 'medium' | 'high'>('medium');

  React.useEffect(() => {
    if (!browser || !capabilities || !strategy) return;

    // Determine performance level based on device capabilities
    let level: 'low' | 'medium' | 'high' = 'medium';

    if (browser.isMobile) {
      level = 'low';
    } else if (capabilities.supportsHardwareAcceleration && browser.devicePixelRatio <= 1) {
      level = 'high';
    } else if (capabilities.supportsHardwareAcceleration) {
      level = 'medium';
    } else {
      level = 'low';
    }

    setPerformanceLevel(level);
  }, [browser, capabilities, strategy]);

  const getOptimizedConfig = React.useCallback((baseConfig: any) => {
    const config = { ...baseConfig };

    switch (performanceLevel) {
      case 'low':
        config.maxFrameRate = 30;
        config.updateThrottle = 32;
        config.enableGPUAcceleration = false;
        config.enableBatchedUpdates = true;
        break;

      case 'medium':
        config.maxFrameRate = 60;
        config.updateThrottle = 16;
        config.enableGPUAcceleration = true;
        config.enableBatchedUpdates = true;
        break;

      case 'high':
        config.maxFrameRate = 60;
        config.updateThrottle = 16;
        config.enableGPUAcceleration = true;
        config.enableBatchedUpdates = true;
        config.enableAdvancedOptimizations = true;
        break;
    }

    return config;
  }, [performanceLevel]);

  return {
    performanceLevel,
    browser,
    capabilities,
    strategy,
    getOptimizedConfig,
  };
}

// Import React for hooks
import React from "react";