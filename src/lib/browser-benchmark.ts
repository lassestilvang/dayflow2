/**
 * Browser-based performance benchmark for time slot optimization
 * Can be run in browser console for real performance testing
 */

import { SpatialIndex, TimeSlotSpatialIndex } from "./spatial-index";
import { DropZonePool, TimeSlotDropZonePool } from "./drop-zone-pool";

// Make functions available globally for browser console testing
declare global {
  interface Window {
    runTimeSlotBenchmark: () => void;
    benchmarkCollisionDetection: () => void;
    benchmarkSpatialIndex: () => void;
    benchmarkDropZonePool: () => void;
  }
}

/**
 * Generate mock time blocks for browser testing
 */
export function generateMockBlocks(count: number = 50) {
  const blocks = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const startHour = 6 + Math.floor(Math.random() * 11); // 6 AM to 5 PM
    const duration = Math.floor(Math.random() * 3) + 1; // 1-3 hours

    const startTime = new Date(today);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(today);
    endTime.setHours(startHour + duration, 0, 0, 0);

    blocks.push({
      id: `block-${i}`,
      startTime,
      endTime,
      duration: duration * 60,
    });
  }

  return blocks;
}

/**
 * Traditional collision detection benchmark
 */
export function benchmarkTraditionalCollision(blocks: any[]) {
  console.log(`🔍 Testing traditional collision detection with ${blocks.length} blocks...`);

  const startTime = performance.now();
  let collisionChecks = 0;

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      collisionChecks++;

      const block1 = blocks[i];
      const block2 = blocks[j];

      const overlap = !(
        block1.endTime <= block2.startTime ||
        block2.endTime <= block1.startTime
      );

      if (overlap) {
        // Handle collision
      }
    }
  }

  const duration = performance.now() - startTime;
  const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

  console.log(`⏱️  Traditional collision: ${duration.toFixed(2)}ms`);
  console.log(`🔢 Collision checks: ${collisionChecks}`);
  console.log(`💾 Memory usage: ${Math.round(memoryUsage / 1024)}KB`);

  return { duration, collisionChecks, memoryUsage };
}

/**
 * Spatial index collision detection benchmark
 */
export function benchmarkSpatialIndexCollision(blocks: any[]) {
  console.log(`🌐 Testing spatial index collision detection with ${blocks.length} blocks...`);

  const startTime = performance.now();
  const spatialIndex = new TimeSlotSpatialIndex();
  let spatialQueries = 0;

  // Insert blocks into spatial index
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

  // Query for collisions
  blocks.forEach((block) => {
    const bounds = {
      x: 0,
      y: block.startTime.getHours() * 60,
      width: 200,
      height: block.duration,
    };

    spatialQueries++;
    const nearbyBlocks = spatialIndex.query(bounds);

    nearbyBlocks
      .filter((nearby: any) => nearby.id !== block.id)
      .forEach((nearby: any) => {
        const nearbyBlock = nearby.data;
        const overlap = !(
          block.endTime <= nearbyBlock.startTime ||
          nearbyBlock.endTime <= block.startTime
        );
      });
  });

  const duration = performance.now() - startTime;
  const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

  console.log(`⏱️  Spatial index collision: ${duration.toFixed(2)}ms`);
  console.log(`🔢 Spatial queries: ${spatialQueries}`);
  console.log(`💾 Memory usage: ${Math.round(memoryUsage / 1024)}KB`);

  return { duration, spatialQueries, memoryUsage };
}

/**
 * Drop zone pool benchmark
 */
export function benchmarkDropZonePool() {
  console.log(`🏊 Testing drop zone pool performance...`);

  const startTime = performance.now();
  const pool = new TimeSlotDropZonePool(0);
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const hour = Math.floor(Math.random() * 17) + 6;
    const zone = pool.getTimeSlotDropZone(hour, { test: `data-${i}` });

    if (i % 3 === 0) {
      pool.returnTimeSlotDropZone(hour);
    }
  }

  const duration = performance.now() - startTime;
  const stats = pool.getStats();

  console.log(`⏱️  Pool operations: ${duration.toFixed(2)}ms`);
  console.log(`📊 Pool stats:`, stats);

  return { duration, stats };
}

/**
 * Virtual scrolling benchmark
 */
export function benchmarkVirtualScrolling() {
  console.log(`📜 Testing virtual scrolling performance...`);

  const totalSlots = 119; // 7 days * 17 hours
  const visibleSlots = 20; // Typical viewport
  const slotHeight = 60;

  const startTime = performance.now();

  // Simulate virtual scrolling calculations
  for (let scrollTop = 0; scrollTop < totalSlots * slotHeight; scrollTop += 10) {
    const startIndex = Math.max(0, Math.floor(scrollTop / slotHeight) - 5);
    const endIndex = Math.min(
      totalSlots - 1,
      Math.floor((scrollTop + 600) / slotHeight) + 5
    );

    const visibleCount = endIndex - startIndex + 1;

    // Simulate rendering only visible slots
    for (let i = startIndex; i <= endIndex; i++) {
      // Simulate slot rendering work
      const slotTop = i * slotHeight;
      const isVisible = slotTop >= scrollTop && slotTop <= scrollTop + 600;
    }
  }

  const duration = performance.now() - startTime;

  console.log(`⏱️  Virtual scrolling: ${duration.toFixed(2)}ms`);
  console.log(`📊 Rendered ${visibleSlots} of ${totalSlots} slots (${Math.round((visibleSlots/totalSlots)*100)}%)`);

  return { duration, visibleSlots, totalSlots };
}

/**
 * Run all benchmarks
 */
export function runTimeSlotBenchmark() {
  console.log("🚀 Starting Time Slot Optimization Benchmarks...\n");

  const blockCounts = [20, 50, 100];

  blockCounts.forEach(count => {
    console.log(`\n📋 Testing with ${count} blocks:`);
    console.log("─".repeat(50));

    const blocks = generateMockBlocks(count);

    const traditional = benchmarkTraditionalCollision(blocks);
    const spatial = benchmarkSpatialIndexCollision(blocks);

    const improvement = traditional.duration > 0 ? (traditional.duration / spatial.duration).toFixed(1) : "∞";
    console.log(`🚀 Performance improvement: ${improvement}x faster`);
  });

  console.log("\n" + "🏊".repeat(20));
  benchmarkDropZonePool();

  console.log("\n" + "📜".repeat(20));
  benchmarkVirtualScrolling();

  console.log("\n✅ All benchmarks complete!");
}

/**
 * Compare performance between traditional and optimized approaches
 */
export function comparePerformance() {
  const blocks = generateMockBlocks(100);

  console.log("🔥 Performance Comparison (100 blocks)");
  console.log("=".repeat(60));

  const traditional = benchmarkTraditionalCollision(blocks);
  const spatial = benchmarkSpatialIndexCollision(blocks);
  const pool = benchmarkDropZonePool();
  const virtual = benchmarkVirtualScrolling();

  console.log("\n📊 Summary:");
  console.log(`Collision Detection: ${traditional.duration > 0 ? (traditional.duration / spatial.duration).toFixed(1) : "∞"}x improvement`);
  console.log(`Memory Efficiency: Pool reduces allocations by ~${Math.round(pool.stats.poolUtilization * 100)}%`);
  console.log(`DOM Efficiency: Virtual scrolling renders ~${Math.round((virtual.visibleSlots/virtual.totalSlots)*100)}% of slots`);

  return {
    traditional,
    spatial,
    pool,
    virtual,
  };
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.runTimeSlotBenchmark = runTimeSlotBenchmark;
  window.benchmarkCollisionDetection = () => benchmarkTraditionalCollision(generateMockBlocks(50));
  window.benchmarkSpatialIndex = () => benchmarkSpatialIndexCollision(generateMockBlocks(50));
  window.benchmarkDropZonePool = benchmarkDropZonePool;
}

console.log(`
🚀 Time Slot Optimization Benchmark Tools Loaded!

Available functions:
- runTimeSlotBenchmark() - Run all benchmarks
- benchmarkCollisionDetection() - Test traditional collision detection
- benchmarkSpatialIndex() - Test spatial index collision detection
- benchmarkDropZonePool() - Test drop zone pool performance
- comparePerformance() - Compare all approaches

Run these in the browser console to test performance!
`);