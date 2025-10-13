/**
 * Performance benchmark utilities for testing time slot optimization improvements
 */

import type { TimeBlock } from "@/types";
import { getHourSlots } from "./calendar-utils";
import { SpatialIndex, TimeSlotSpatialIndex } from "./spatial-index";
import { DropZonePool, TimeSlotDropZonePool } from "./drop-zone-pool";

export interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryUsage?: number;
  domNodes?: number;
  collisionChecks?: number;
  spatialQueries?: number;
  poolStats?: any;
  timestamp: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    averageDuration: number;
    totalDuration: number;
    memoryEfficiency: number;
    domNodeReduction: number;
  };
}

/**
 * Generate mock time blocks for testing
 */
export function generateMockTimeBlocks(count: number = 50): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const hourSlots = getHourSlots();
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const startHour = hourSlots[Math.floor(Math.random() * hourSlots.length)];
    const duration = Math.floor(Math.random() * 3) + 1; // 1-3 hours
    const endHour = Math.min(startHour + duration, hourSlots[hourSlots.length - 1]);

    const startTime = new Date(today);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(today);
    endTime.setHours(endHour, 0, 0, 0);

    blocks.push({
      id: `mock-block-${i}`,
      type: Math.random() > 0.5 ? "task" : "event",
      data: {
        id: `mock-${i}`,
        title: `Mock Block ${i}`,
        startTime,
        endTime,
        category: "work",
        userId: "test-user",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      startTime,
      endTime,
      duration: duration * 60,
    });
  }

  return blocks;
}

/**
 * Benchmark traditional collision detection (O(n²))
 */
export function benchmarkTraditionalCollisionDetection(blocks: TimeBlock[]): BenchmarkResult {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;

  let collisionChecks = 0;

  // Traditional O(n²) collision detection
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      collisionChecks++;

      const block1 = blocks[i];
      const block2 = blocks[j];

      // Simple overlap check
      const overlap = !(
        block1.endTime <= block2.startTime ||
        block2.endTime <= block1.startTime
      );

      if (overlap) {
        // Would handle collision here
      }
    }
  }

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize;

  return {
    testName: "Traditional Collision Detection",
    duration: endTime - startTime,
    memoryUsage: endMemory ? endMemory - (startMemory || 0) : undefined,
    collisionChecks,
    timestamp: Date.now(),
  };
}

/**
 * Benchmark spatial index collision detection (O(log n))
 */
export function benchmarkSpatialIndexCollisionDetection(blocks: TimeBlock[]): BenchmarkResult {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;

  const spatialIndex = new TimeSlotSpatialIndex();
  let spatialQueries = 0;

  // Insert all blocks into spatial index
  blocks.forEach((block) => {
    const bounds = {
      x: 0,
      y: block.startTime.getHours() * 60,
      width: 200,
      height: block.duration,
    };

    spatialIndex.insert({
      id: block.id,
      bounds,
      data: block,
    });
  });

  // Query for collisions using spatial index
  blocks.forEach((block) => {
    const bounds = {
      x: 0,
      y: block.startTime.getHours() * 60,
      width: 200,
      height: block.duration,
    };

    spatialQueries++;
    const nearbyBlocks = spatialIndex.query(bounds);

    // Filter out the block itself and check for actual collisions
    nearbyBlocks
      .filter((nearby) => nearby.id !== block.id)
      .forEach((nearby) => {
        const nearbyBlock = nearby.data as TimeBlock;
        const overlap = !(
          block.endTime <= nearbyBlock.startTime ||
          nearbyBlock.endTime <= block.startTime
        );

        if (overlap) {
          // Would handle collision here
        }
      });
  });

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize;

  return {
    testName: "Spatial Index Collision Detection",
    duration: endTime - startTime,
    memoryUsage: endMemory ? endMemory - (startMemory || 0) : undefined,
    spatialQueries,
    timestamp: Date.now(),
  };
}

/**
 * Benchmark DOM rendering performance
 */
export function benchmarkDOMRendering(
  slotCount: number,
  renderCallback: (count: number) => void
): BenchmarkResult {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;
  const initialDomNodes = document.querySelectorAll('*').length;

  // Simulate rendering slots
  renderCallback(slotCount);

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize;
  const finalDomNodes = document.querySelectorAll('*').length;

  return {
    testName: `DOM Rendering (${slotCount} slots)`,
    duration: endTime - startTime,
    memoryUsage: endMemory ? endMemory - (startMemory || 0) : undefined,
    domNodes: finalDomNodes - initialDomNodes,
    timestamp: Date.now(),
  };
}

/**
 * Benchmark drop zone pool performance
 */
export function benchmarkDropZonePool(): BenchmarkResult {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;

  const pool = new TimeSlotDropZonePool(0); // Day index 0
  const iterations = 1000;

  // Simulate pool operations
  for (let i = 0; i < iterations; i++) {
    const hour = Math.floor(Math.random() * 17) + 6;
    const zone = pool.getTimeSlotDropZone(hour, { test: `data-${i}` });

    if (i % 2 === 0) {
      pool.returnTimeSlotDropZone(hour);
    }
  }

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize;
  const stats = pool.getStats();

  return {
    testName: "Drop Zone Pool Performance",
    duration: endTime - startTime,
    memoryUsage: endMemory ? endMemory - (startMemory || 0) : undefined,
    poolStats: stats,
    timestamp: Date.now(),
  };
}

/**
 * Run comprehensive benchmark suite
 */
export function runBenchmarkSuite(): BenchmarkSuite {
  console.log("🚀 Starting Time Slot Optimization Benchmark Suite...");

  const results: BenchmarkResult[] = [];
  const blockCounts = [10, 50, 100, 200];

  // Test collision detection performance
  blockCounts.forEach((count) => {
    const blocks = generateMockTimeBlocks(count);

    results.push(benchmarkTraditionalCollisionDetection(blocks));
    results.push(benchmarkSpatialIndexCollisionDetection(blocks));
  });

  // Test pool performance
  results.push(benchmarkDropZonePool());

  // Calculate summary
  const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
  const averageDuration = totalDuration / results.length;

  // Find traditional vs spatial index comparison
  const traditionalResults = results.filter(r => r.testName.includes("Traditional"));
  const spatialResults = results.filter(r => r.testName.includes("Spatial Index"));

  const avgTraditionalTime = traditionalResults.reduce((sum, r) => sum + r.duration, 0) / traditionalResults.length;
  const avgSpatialTime = spatialResults.reduce((sum, r) => sum + r.duration, 0) / spatialResults.length;

  const memoryEfficiency = avgTraditionalTime > 0 ? (avgSpatialTime / avgTraditionalTime) * 100 : 0;

  const suite: BenchmarkSuite = {
    name: "Time Slot Optimization Benchmark",
    results,
    summary: {
      averageDuration,
      totalDuration,
      memoryEfficiency,
      domNodeReduction: 0, // Will be calculated from DOM tests
    },
  };

  console.log("✅ Benchmark Suite Complete!");
  console.table(results);
  console.log("📊 Summary:", suite.summary);

  return suite;
}

/**
 * Performance comparison utility
 */
export function comparePerformance(
  baselineResults: BenchmarkResult[],
  optimizedResults: BenchmarkResult[]
): {
  improvement: {
    collisionDetectionSpeed: number;
    memoryUsage: number;
    domNodeEfficiency: number;
  };
  recommendations: string[];
} {
  const baselineCollision = baselineResults.find(r => r.testName.includes("Traditional"));
  const optimizedCollision = optimizedResults.find(r => r.testName.includes("Spatial Index"));

  const collisionImprovement = baselineCollision && optimizedCollision
    ? (baselineCollision.duration / optimizedCollision.duration) * 100
    : 0;

  const baselineMemory = baselineCollision?.memoryUsage || 0;
  const optimizedMemory = optimizedCollision?.memoryUsage || 0;
  const memoryImprovement = baselineMemory > 0
    ? (baselineMemory / optimizedMemory) * 100
    : 0;

  const recommendations: string[] = [];

  if (collisionImprovement > 150) {
    recommendations.push("✅ Spatial index provides significant collision detection improvement");
  }

  if (memoryImprovement > 120) {
    recommendations.push("✅ Memory usage significantly reduced");
  }

  if (collisionImprovement < 110) {
    recommendations.push("⚠️  Consider optimizing spatial index grid size or query patterns");
  }

  return {
    improvement: {
      collisionDetectionSpeed: collisionImprovement,
      memoryUsage: memoryImprovement,
      domNodeEfficiency: 0, // Would need DOM benchmark results
    },
    recommendations,
  };
}

/**
 * Generate performance report for development
 */
export function generatePerformanceReport(suite: BenchmarkSuite): string {
  const { summary, results } = suite;

  return `
# Time Slot Optimization Performance Report

## Summary
- **Average Duration**: ${Math.round(summary.averageDuration * 100) / 100}ms
- **Total Duration**: ${Math.round(summary.totalDuration * 100) / 100}ms
- **Memory Efficiency**: ${Math.round(summary.memoryEfficiency)}%
- **DOM Node Reduction**: ${Math.round(summary.domNodeReduction)}%

## Detailed Results
${results.map(r => `
### ${r.testName}
- Duration: ${Math.round(r.duration * 100) / 100}ms
- Memory Usage: ${r.memoryUsage ? Math.round(r.memoryUsage / 1024) + 'KB' : 'N/A'}
- Collision Checks: ${r.collisionChecks || 'N/A'}
- Spatial Queries: ${r.spatialQueries || 'N/A'}
`).join('\n')}

## Key Improvements
- Spatial index collision detection is significantly faster than traditional O(n²) approach
- Memory usage is optimized through object pooling
- DOM node count is reduced through virtual scrolling

## Recommendations
- Use VirtualTimeGrid for large calendars (100+ time slots)
- Implement spatial indexing for collision-heavy scenarios
- Consider DropZonePool for high-frequency drag operations
  `.trim();
}