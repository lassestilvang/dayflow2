// Performance benchmark suite for drag and drop optimization
// Provides automated testing and comparison of performance metrics

import { baselineMonitor, type BaselineMetrics, type PerformanceBenchmark } from './baseline-monitor';
import { dragPerformanceMonitor } from './performance-monitor';

export interface BenchmarkScenario {
  name: string;
  description: string;
  setup?: () => Promise<void>;
  execute: () => Promise<void>;
  cleanup?: () => Promise<void>;
  iterations?: number;
}

export interface BenchmarkResult {
  scenario: string;
  metrics: BaselineMetrics;
  benchmarks: PerformanceBenchmark[];
  success: boolean;
  errors: string[];
}

class PerformanceBenchmarkSuite {
  private static instance: PerformanceBenchmarkSuite;
  private scenarios: Map<string, BenchmarkScenario> = new Map();
  private results: BenchmarkResult[] = [];

  static getInstance(): PerformanceBenchmarkSuite {
    if (!PerformanceBenchmarkSuite.instance) {
      PerformanceBenchmarkSuite.instance = new PerformanceBenchmarkSuite();
    }
    return PerformanceBenchmarkSuite.instance;
  }

  registerScenario(scenario: BenchmarkScenario): void {
    this.scenarios.set(scenario.name, scenario);
    console.log(`[BENCHMARK] Registered scenario: ${scenario.name}`);
  }

  async runScenario(scenarioName: string): Promise<BenchmarkResult> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    console.log(`[BENCHMARK] Running scenario: ${scenarioName}`);

    const errors: string[] = [];
    let metrics: BaselineMetrics | null = null;

    try {
      // Setup phase
      if (scenario.setup) {
        await scenario.setup();
      }

      // Start baseline collection
      baselineMonitor.startCollection();

      // Execute the scenario
      const iterations = scenario.iterations || 1;
      for (let i = 0; i < iterations; i++) {
        console.log(`[BENCHMARK] Iteration ${i + 1}/${iterations}`);
        await scenario.execute();
      }

      // Stop collection and get metrics
      metrics = baselineMonitor.stopCollection();

      if (!metrics) {
        throw new Error('Failed to collect baseline metrics');
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error(`[BENCHMARK] Error in scenario ${scenarioName}:`, error);
    } finally {
      // Cleanup phase
      if (scenario.cleanup) {
        try {
          await scenario.cleanup();
        } catch (error) {
          errors.push(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    const result: BenchmarkResult = {
      scenario: scenarioName,
      metrics: metrics || this.getEmptyMetrics(),
      benchmarks: metrics ? baselineMonitor.generateBenchmarks() : [],
      success: errors.length === 0,
      errors,
    };

    this.results.push(result);

    console.log(`[BENCHMARK] Scenario ${scenarioName} completed:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  }

  async runAllScenarios(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const scenarioName of this.scenarios.keys()) {
      const result = await this.runScenario(scenarioName);
      results.push(result);
    }

    return results;
  }

  private getEmptyMetrics(): BaselineMetrics {
    return {
      timestamp: Date.now(),
      frameRate: { average: 0, min: 0, max: 0, samples: [] },
      memoryUsage: { initial: 0, peak: 0, final: 0, increase: 0, increaseMB: 0 },
      collisionDetection: { totalChecks: 0, averageTime: 0, maxTime: 0, totalTime: 0 },
      storeUpdates: { count: 0, frequency: 0 },
      timeSlotCreation: { count: 0, overhead: 0 },
      dragOperations: { count: 0, averageDuration: 0, totalDuration: 0 },
    };
  }

  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available';
    }

    let report = '=== PERFORMANCE BENCHMARK REPORT ===\n\n';

    this.results.forEach(result => {
      report += `📋 SCENARIO: ${result.scenario}\n`;
      report += `Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`;

      if (result.errors.length > 0) {
        report += `Errors:\n`;
        result.errors.forEach(error => report += `  - ${error}\n`);
      }

      if (result.success) {
        const metrics = result.metrics;
        report += `Frame Rate: ${metrics.frameRate.average}fps\n`;
        report += `Memory Increase: ${metrics.memoryUsage.increaseMB.toFixed(2)}MB\n`;
        report += `Collision Detection: ${metrics.collisionDetection.averageTime}ms avg\n`;
        report += `Store Updates: ${metrics.storeUpdates.count} total\n`;
        report += `Time Slots: ${metrics.timeSlotCreation.count} instances\n\n`;

        // Benchmark status
        const passing = result.benchmarks.filter(b => b.status === 'pass').length;
        const warning = result.benchmarks.filter(b => b.status === 'warning').length;
        const failing = result.benchmarks.filter(b => b.status === 'fail').length;

        report += `Benchmarks: ${passing} passed, ${warning} warnings, ${failing} failed\n\n`;
      }

      report += '---\n\n';
    });

    return report;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }
}

export const performanceBenchmarkSuite = PerformanceBenchmarkSuite.getInstance();

// Predefined benchmark scenarios
export const predefinedScenarios: BenchmarkScenario[] = [
  {
    name: 'basic-drag-operation',
    description: 'Basic drag and drop operation with single task',
    iterations: 5,
    execute: async () => {
      // Simulate basic drag operation
      const dragId = `benchmark-drag-${Date.now()}`;
      dragPerformanceMonitor.startDragSession(dragId);

      // Simulate collision checks
      for (let i = 0; i < 10; i++) {
        dragPerformanceMonitor.recordConflictCheck(dragId);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Simulate position calculations
      for (let i = 0; i < 20; i++) {
        dragPerformanceMonitor.recordPositionCalculation(dragId);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      dragPerformanceMonitor.endDragSession(dragId);
    },
  },
  {
    name: 'heavy-collision-detection',
    description: 'Stress test collision detection with many items',
    iterations: 3,
    execute: async () => {
      const dragId = `collision-benchmark-${Date.now()}`;
      dragPerformanceMonitor.startDragSession(dragId);

      // Simulate heavy collision detection (119 time slots)
      for (let i = 0; i < 119; i++) {
        const startTime = performance.now();
        dragPerformanceMonitor.recordConflictCheck(dragId);
        const duration = performance.now() - startTime;
        baselineMonitor.recordCollisionDetection(duration);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2));
      }

      dragPerformanceMonitor.endDragSession(dragId);
    },
  },
  {
    name: 'memory-stress-test',
    description: 'Test memory usage during extended drag operations',
    iterations: 10,
    execute: async () => {
      const dragId = `memory-benchmark-${Date.now()}`;
      dragPerformanceMonitor.startDragSession(dragId);

      // Create multiple drag sessions to stress memory
      for (let i = 0; i < 50; i++) {
        dragPerformanceMonitor.recordConflictCheck(dragId);
        dragPerformanceMonitor.recordPositionCalculation(dragId);

        if (i % 10 === 0) {
          // Force garbage collection check
          if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
          }
        }

        await new Promise(resolve => setTimeout(resolve, 20));
      }

      dragPerformanceMonitor.endDragSession(dragId);
    },
  },
  {
    name: 'store-update-frequency',
    description: 'Test store update frequency during drag operations',
    iterations: 8,
    execute: async () => {
      const dragId = `store-benchmark-${Date.now()}`;
      dragPerformanceMonitor.startDragSession(dragId);

      // Simulate frequent store updates
      for (let i = 0; i < 100; i++) {
        baselineMonitor.recordStoreUpdate();

        if (i % 10 === 0) {
          dragPerformanceMonitor.recordConflictCheck(dragId);
        }

        await new Promise(resolve => setTimeout(resolve, 5));
      }

      dragPerformanceMonitor.endDragSession(dragId);
    },
  },
  {
    name: 'time-slot-creation-overhead',
    description: 'Measure time slot creation performance overhead',
    iterations: 3,
    execute: async () => {
      baselineMonitor.recordTimeSlotCreationStart();

      // Simulate creating 119 time slots
      for (let i = 0; i < 119; i++) {
        // Simulate time slot creation overhead
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      baselineMonitor.recordTimeSlotCreationEnd();
    },
  },
];

// Register predefined scenarios
predefinedScenarios.forEach(scenario => {
  performanceBenchmarkSuite.registerScenario(scenario);
});

// Utility functions for manual benchmarking
export const benchmarkUtils = {
  startBenchmark: (name: string) => {
    console.log(`[BENCHMARK] Starting manual benchmark: ${name}`);
    baselineMonitor.startCollection();
  },

  endBenchmark: (name: string) => {
    console.log(`[BENCHMARK] Ending manual benchmark: ${name}`);
    const metrics = baselineMonitor.stopCollection();
    if (metrics) {
      console.log(`[BENCHMARK] ${name} results:`, metrics);
      console.log(baselineMonitor.generateReport());
    }
    return metrics;
  },

  measureOperation: async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    console.log(`[BENCHMARK] Measuring operation: ${name}`);

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      console.log(`[BENCHMARK] ${name} completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[BENCHMARK] ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  measureSyncOperation: <T>(name: string, operation: () => T): T => {
    const startTime = performance.now();
    console.log(`[BENCHMARK] Measuring sync operation: ${name}`);

    try {
      const result = operation();
      const duration = performance.now() - startTime;
      console.log(`[BENCHMARK] ${name} completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[BENCHMARK] ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },
};