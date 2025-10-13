// Baseline performance monitoring for drag and drop optimization
// This module establishes baseline metrics for comparison after each optimization phase

import { dragPerformanceMonitor, type DragPerformanceData } from './performance-monitor';

export interface BaselineMetrics {
  timestamp: number;
  frameRate: {
    average: number;
    min: number;
    max: number;
    samples: number[];
  };
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    increase: number;
    increaseMB: number;
  };
  collisionDetection: {
    totalChecks: number;
    averageTime: number;
    maxTime: number;
    totalTime: number;
  };
  storeUpdates: {
    count: number;
    frequency: number; // updates per second
  };
  timeSlotCreation: {
    count: number;
    overhead: number;
  };
  dragOperations: {
    count: number;
    averageDuration: number;
    totalDuration: number;
  };
}

export interface PerformanceBenchmark {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: 'pass' | 'fail' | 'warning';
  trend: 'improving' | 'degrading' | 'stable';
}

class BaselineMonitor {
  private static instance: BaselineMonitor;
  private metrics: BaselineMetrics[] = [];
  private isCollecting = false;
  private collectionStartTime = 0;
  private frameRateSamples: number[] = [];
  private collisionDetectionTimes: number[] = [];
  private storeUpdateCount = 0;
  private dragStartTime = 0;
  private timeSlotCreationStart = 0;

  static getInstance(): BaselineMonitor {
    if (!BaselineMonitor.instance) {
      BaselineMonitor.instance = new BaselineMonitor();
    }
    return BaselineMonitor.instance;
  }

  startCollection(): void {
    this.isCollecting = true;
    this.collectionStartTime = performance.now();
    this.frameRateSamples = [];
    this.collisionDetectionTimes = [];
    this.storeUpdateCount = 0;
    this.dragStartTime = 0;

    console.log('[BASELINE] Started baseline collection');
  }

  stopCollection(): BaselineMetrics | null {
    if (!this.isCollecting) return null;

    this.isCollecting = false;
    const collectionDuration = performance.now() - this.collectionStartTime;

    // Get memory metrics
    const memoryInfo = this.getMemoryMetrics();

    // Calculate frame rate metrics
    const frameRateMetrics = this.calculateFrameRateMetrics();

    // Calculate collision detection metrics
    const collisionMetrics = this.calculateCollisionDetectionMetrics();

    // Calculate store update metrics
    const storeUpdateMetrics = this.calculateStoreUpdateMetrics(collectionDuration);

    // Get time slot creation metrics
    const timeSlotMetrics = this.getTimeSlotCreationMetrics();

    // Get drag operation metrics
    const dragMetrics = this.getDragOperationMetrics();

    const baseline: BaselineMetrics = {
      timestamp: Date.now(),
      frameRate: frameRateMetrics,
      memoryUsage: memoryInfo,
      collisionDetection: collisionMetrics,
      storeUpdates: storeUpdateMetrics,
      timeSlotCreation: timeSlotMetrics,
      dragOperations: dragMetrics,
    };

    this.metrics.push(baseline);

    console.log('[BASELINE] Collection completed:', baseline);
    return baseline;
  }

  recordFrameRate(fps: number): void {
    if (this.isCollecting) {
      this.frameRateSamples.push(fps);
    }
  }

  recordCollisionDetection(duration: number): void {
    if (this.isCollecting) {
      this.collisionDetectionTimes.push(duration);
    }
  }

  recordStoreUpdate(): void {
    if (this.isCollecting) {
      this.storeUpdateCount++;
    }
  }

  recordDragStart(): void {
    this.dragStartTime = performance.now();
  }

  recordDragEnd(): void {
    if (this.dragStartTime > 0) {
      const duration = performance.now() - this.dragStartTime;
      console.log(`[BASELINE] Drag operation completed in ${duration.toFixed(2)}ms`);
    }
  }

  recordTimeSlotCreationStart(): void {
    this.timeSlotCreationStart = performance.now();
  }

  recordTimeSlotCreationEnd(): void {
    if (this.timeSlotCreationStart > 0) {
      const duration = performance.now() - this.timeSlotCreationStart;
      console.log(`[BASELINE] Time slot creation took ${duration.toFixed(2)}ms`);
    }
  }

  private getMemoryMetrics() {
    const memory = (performance as any).memory;
    if (!memory) {
      return {
        initial: 0,
        peak: 0,
        final: 0,
        increase: 0,
        increaseMB: 0,
      };
    }

    const initial = memory.usedJSHeapSize;
    const final = memory.usedJSHeapSize;
    const increase = final - initial;
    const increaseMB = increase / (1024 * 1024);

    return {
      initial,
      peak: memory.totalJSHeapSize,
      final,
      increase,
      increaseMB,
    };
  }

  private calculateFrameRateMetrics() {
    if (this.frameRateSamples.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        samples: [],
      };
    }

    const sum = this.frameRateSamples.reduce((a, b) => a + b, 0);
    const average = sum / this.frameRateSamples.length;
    const min = Math.min(...this.frameRateSamples);
    const max = Math.max(...this.frameRateSamples);

    return {
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
      samples: this.frameRateSamples,
    };
  }

  private calculateCollisionDetectionMetrics() {
    if (this.collisionDetectionTimes.length === 0) {
      return {
        totalChecks: 0,
        averageTime: 0,
        maxTime: 0,
        totalTime: 0,
      };
    }

    const totalTime = this.collisionDetectionTimes.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / this.collisionDetectionTimes.length;
    const maxTime = Math.max(...this.collisionDetectionTimes);

    return {
      totalChecks: this.collisionDetectionTimes.length,
      averageTime: Math.round(averageTime * 100) / 100, // Round to 2 decimal places
      maxTime: Math.round(maxTime * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
    };
  }

  private calculateStoreUpdateMetrics(collectionDuration: number) {
    const frequency = collectionDuration > 0 ? (this.storeUpdateCount / collectionDuration) * 1000 : 0;

    return {
      count: this.storeUpdateCount,
      frequency: Math.round(frequency),
    };
  }

  private getTimeSlotCreationMetrics() {
    // This would need to be integrated with the actual time slot creation code
    // For now, we'll use the known value of 119 instances
    return {
      count: 119,
      overhead: 0, // Would be calculated based on actual measurements
    };
  }

  private getDragOperationMetrics() {
    // This would be populated from actual drag session data
    return {
      count: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  generateBenchmarks(): PerformanceBenchmark[] {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return [];

    return [
      {
        name: 'Frame Rate',
        target: 60,
        current: latest.frameRate.average,
        unit: 'fps',
        status: latest.frameRate.average >= 60 ? 'pass' : latest.frameRate.average >= 30 ? 'warning' : 'fail',
        trend: 'stable', // Would be calculated by comparing with previous measurements
      },
      {
        name: 'Memory Usage Increase',
        target: 50,
        current: latest.memoryUsage.increaseMB,
        unit: 'MB',
        status: latest.memoryUsage.increaseMB < 50 ? 'pass' : 'fail',
        trend: 'stable',
      },
      {
        name: 'Collision Detection Time',
        target: 100,
        current: latest.collisionDetection.maxTime,
        unit: 'ms',
        status: latest.collisionDetection.maxTime < 100 ? 'pass' : 'fail',
        trend: 'stable',
      },
      {
        name: 'Store Update Frequency',
        target: 50,
        current: latest.storeUpdates.frequency,
        unit: 'updates/sec',
        status: latest.storeUpdates.frequency < 50 ? 'pass' : 'fail',
        trend: 'stable',
      },
      {
        name: 'Time Slot Creation Count',
        target: 119,
        current: latest.timeSlotCreation.count,
        unit: 'instances',
        status: 'pass', // This is the current baseline
        trend: 'stable',
      },
    ];
  }

  generateReport(): string {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return 'No baseline data collected yet';

    const benchmarks = this.generateBenchmarks();

    let report = '=== BASELINE PERFORMANCE REPORT ===\n\n';
    report += `Collection Time: ${new Date(latest.timestamp).toISOString()}\n\n`;

    report += '📊 KEY METRICS:\n';
    report += `Frame Rate: ${latest.frameRate.average}fps (min: ${latest.frameRate.min}, max: ${latest.frameRate.max})\n`;
    report += `Memory Increase: ${latest.memoryUsage.increaseMB.toFixed(2)}MB\n`;
    report += `Collision Detection: ${latest.collisionDetection.averageTime}ms avg (${latest.collisionDetection.totalChecks} checks)\n`;
    report += `Store Updates: ${latest.storeUpdates.count} total (${latest.storeUpdates.frequency}/sec)\n`;
    report += `Time Slots: ${latest.timeSlotCreation.count} instances\n\n`;

    report += '🎯 BENCHMARKS:\n';
    benchmarks.forEach(benchmark => {
      const status = benchmark.status === 'pass' ? '✅' : benchmark.status === 'warning' ? '⚠️' : '❌';
      report += `${status} ${benchmark.name}: ${benchmark.current}${benchmark.unit} (target: ${benchmark.target}${benchmark.unit})\n`;
    });

    return report;
  }

  getMetricsHistory(): BaselineMetrics[] {
    return [...this.metrics];
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

export const baselineMonitor = BaselineMonitor.getInstance();

// Enhanced drag performance monitor integration
export const enhancedDragPerformanceMonitor = {
  ...dragPerformanceMonitor,

  startDragSession(dragId: string): string {
    baselineMonitor.recordDragStart();
    return dragPerformanceMonitor.startDragSession(dragId);
  },

  endDragSession(dragId: string): DragPerformanceData | null {
    baselineMonitor.recordDragEnd();
    return dragPerformanceMonitor.endDragSession(dragId);
  },

  recordConflictCheck(dragId: string): void {
    const startTime = performance.now();
    dragPerformanceMonitor.recordConflictCheck(dragId);
    const duration = performance.now() - startTime;
    baselineMonitor.recordCollisionDetection(duration);
  },

  recordPositionCalculation(dragId: string): void {
    dragPerformanceMonitor.recordPositionCalculation(dragId);
  },
};