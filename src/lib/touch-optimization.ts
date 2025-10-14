import { dragPerformanceMonitor } from "./performance-monitor";

// Touch event configuration
interface TouchConfig {
  activationDistance: number; // Minimum distance before drag starts
  activationDelay: number; // Delay before drag activation (prevents accidental drags)
  enableHapticFeedback: boolean;
  enableMomentumScrolling: boolean;
  touchSlop: number; // Minimum distance to consider a drag vs scroll
}

// Default touch configuration optimized for mobile performance
const defaultTouchConfig: TouchConfig = {
  activationDistance: 8, // 8px minimum movement
  activationDelay: 250, // 250ms delay for mobile
  enableHapticFeedback: true,
  enableMomentumScrolling: true,
  touchSlop: 10, // 10px slop for better touch responsiveness
};

// Touch state management
interface TouchState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastMoveTime: number;
  velocityX: number;
  velocityY: number;
  hasActivated: boolean;
  activationTimeout: NodeJS.Timeout | null;
}

// Touch manager class for optimized mobile interactions
export class TouchManager {
  private config: TouchConfig;
  private touchState: TouchState | null = null;
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();
  private isEnabled = false;

  constructor(config: Partial<TouchConfig> = {}) {
    this.config = { ...defaultTouchConfig, ...config };
  }

  /**
   * Enable touch optimization
   */
  enable(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;

    // Add global touch event listeners
    this.addTouchListeners();

    if (this.config.enableHapticFeedback) {
      this.enableHapticFeedback();
    }
  }

  /**
   * Disable touch optimization
   */
  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;

    // Remove global touch event listeners
    this.removeTouchListeners();

    // Clear any active touch state
    if (this.touchState) {
      this.clearTouchState();
    }
  }

  /**
   * Add touch event listeners to document
   */
  private addTouchListeners(): void {
    const passiveSupported = this.supportsPassive();

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), passiveSupported);
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), passiveSupported);
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), passiveSupported);
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), passiveSupported);
  }

  /**
   * Remove touch event listeners from document
   */
  private removeTouchListeners(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return; // Only handle single touch

    const touch = event.touches[0];
    const now = performance.now();

    this.touchState = {
      isActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: now,
      lastMoveTime: now,
      velocityX: 0,
      velocityY: 0,
      hasActivated: false,
      activationTimeout: null,
    };

    // Set activation timeout for delayed drag activation
    if (this.config.activationDelay > 0) {
      this.touchState.activationTimeout = setTimeout(() => {
        if (this.touchState && !this.touchState.hasActivated) {
          this.activateDrag();
        }
      }, this.config.activationDelay);
    }

    // Emit touch start event
    this.emit('touchstart', { touch, originalEvent: event });
  }

  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchState || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const now = performance.now();
    const deltaTime = now - this.touchState.lastMoveTime;

    // Update position
    this.touchState.currentX = touch.clientX;
    this.touchState.currentY = touch.clientY;
    this.touchState.lastMoveTime = now;

    // Calculate velocity
    if (deltaTime > 0) {
      const deltaX = touch.clientX - this.touchState.startX;
      const deltaY = touch.clientY - this.touchState.startY;

      this.touchState.velocityX = deltaX / deltaTime;
      this.touchState.velocityY = deltaY / deltaTime;
    }

    // Check if movement exceeds activation distance
    const distance = Math.sqrt(
      Math.pow(touch.clientX - this.touchState.startX, 2) +
      Math.pow(touch.clientY - this.touchState.startY, 2)
    );

    if (distance >= this.config.activationDistance && !this.touchState.hasActivated) {
      this.activateDrag();
    }

    // Only emit move events after activation
    if (this.touchState.hasActivated) {
      this.emit('touchmove', {
        touch,
        deltaX: touch.clientX - this.touchState.startX,
        deltaY: touch.clientY - this.touchState.startY,
        velocity: { x: this.touchState.velocityX, y: this.touchState.velocityY },
        originalEvent: event,
      });
    }
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.touchState) return;

    // Clear activation timeout
    if (this.touchState.activationTimeout) {
      clearTimeout(this.touchState.activationTimeout);
    }

    const touch = event.changedTouches[0];
    const duration = performance.now() - this.touchState.startTime;

    // Emit touch end event
    this.emit('touchend', {
      touch,
      duration,
      velocity: { x: this.touchState.velocityX, y: this.touchState.velocityY },
      wasActivated: this.touchState.hasActivated,
      originalEvent: event,
    });

    // Clear touch state
    this.clearTouchState();
  }

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel(event: TouchEvent): void {
    if (this.touchState) {
      this.emit('touchcancel', { originalEvent: event });
      this.clearTouchState();
    }
  }

  /**
   * Activate drag operation
   */
  private activateDrag(): void {
    if (!this.touchState) return;

    this.touchState.hasActivated = true;

    // Provide haptic feedback if enabled
    if (this.config.enableHapticFeedback) {
      this.triggerHapticFeedback('light');
    }

    this.emit('dragactivate', {
      startPosition: { x: this.touchState.startX, y: this.touchState.startY },
      currentPosition: { x: this.touchState.currentX, y: this.touchState.currentY },
    });
  }

  /**
   * Clear touch state
   */
  private clearTouchState(): void {
    this.touchState = null;
  }

  /**
   * Check if browser supports passive event listeners
   */
  private supportsPassive(): boolean {
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
   * Enable haptic feedback
   */
  private enableHapticFeedback(): void {
    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      this.triggerHapticFeedback = (pattern: string) => {
        const patterns = {
          light: 50,
          medium: 100,
          heavy: 200,
        };

        if (patterns[pattern as keyof typeof patterns]) {
          navigator.vibrate(patterns[pattern as keyof typeof patterns]);
        }
      };
    } else {
      this.triggerHapticFeedback = () => {}; // No-op fallback
    }
  }

  /**
   * Trigger haptic feedback (will be overridden if vibration is supported)
   */
  private triggerHapticFeedback(pattern: string): void {
    // Placeholder - will be overridden in enableHapticFeedback
  }

  /**
   * Add event listener for touch events
   */
  addEventListener(event: string, handler: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(handler);

    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  /**
   * Emit custom touch event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[TOUCH MANAGER] Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Get current touch state (for debugging)
   */
  getTouchState() {
    return this.touchState ? { ...this.touchState } : null;
  }

  /**
   * Get touch configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update touch configuration
   */
  updateConfig(newConfig: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global touch manager instance
export const touchManager = new TouchManager();

/**
 * React hook for touch-optimized drag and drop
 */
export function useTouchOptimization() {
  const [isEnabled, setIsEnabled] = React.useState(false);

  const enable = React.useCallback(() => {
    touchManager.enable();
    setIsEnabled(true);
  }, []);

  const disable = React.useCallback(() => {
    touchManager.disable();
    setIsEnabled(false);
  }, []);

  const addEventListener = React.useCallback((event: string, handler: (data: any) => void) => {
    return touchManager.addEventListener(event, handler);
  }, []);

  const getTouchState = React.useCallback(() => {
    return touchManager.getTouchState();
  }, []);

  const updateConfig = React.useCallback((config: Partial<TouchConfig>) => {
    touchManager.updateConfig(config);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      touchManager.disable();
    };
  }, []);

  return {
    isEnabled,
    enable,
    disable,
    addEventListener,
    getTouchState,
    updateConfig,
    config: touchManager.getConfig(),
  };
}

/**
 * Hook for mobile-optimized drag performance
 */
export function useMobileDragOptimization() {
  const performanceMetrics = React.useRef({
    touchStartCount: 0,
    touchMoveCount: 0,
    touchEndCount: 0,
    averageMoveInterval: 0,
    lastMoveTime: 0,
  });

  const recordTouchStart = React.useCallback(() => {
    performanceMetrics.current.touchStartCount++;
  }, []);

  const recordTouchMove = React.useCallback(() => {
    const now = performance.now();
    const lastMoveTime = performanceMetrics.current.lastMoveTime;

    if (lastMoveTime > 0) {
      const interval = now - lastMoveTime;
      const currentAvg = performanceMetrics.current.averageMoveInterval;
      const count = performanceMetrics.current.touchMoveCount;

      // Update running average
      performanceMetrics.current.averageMoveInterval =
        (currentAvg * count + interval) / (count + 1);
    }

    performanceMetrics.current.touchMoveCount++;
    performanceMetrics.current.lastMoveTime = now;
  }, []);

  const recordTouchEnd = React.useCallback(() => {
    performanceMetrics.current.touchEndCount++;
  }, []);

  const getMetrics = React.useMemo(() => {
    return { ...performanceMetrics.current };
  }, []);

  const resetMetrics = React.useCallback(() => {
    performanceMetrics.current = {
      touchStartCount: 0,
      touchMoveCount: 0,
      touchEndCount: 0,
      averageMoveInterval: 0,
      lastMoveTime: 0,
    };
  }, []);

  return {
    recordTouchStart,
    recordTouchMove,
    recordTouchEnd,
    getMetrics,
    resetMetrics,
  };
}

// Import React for hooks
import React from "react";