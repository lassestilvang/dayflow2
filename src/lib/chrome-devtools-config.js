// Chrome DevTools Performance Profiling Configuration
// Load this file in Chrome DevTools Console for optimized drag & drop profiling

(function() {
  'use strict';

  // Performance monitoring setup for drag and drop analysis
  window.dragPerformanceConfig = {
    // Enable performance monitoring
    enablePerformanceMonitoring: true,

    // Frame rate monitoring
    frameRateMonitoring: {
      enabled: true,
      warningThreshold: 30, // FPS
      criticalThreshold: 15, // FPS
    },

    // Memory monitoring
    memoryMonitoring: {
      enabled: true,
      warningThreshold: 50 * 1024 * 1024, // 50MB
      criticalThreshold: 100 * 1024 * 1024, // 100MB
      checkInterval: 1000, // ms
    },

    // Paint and layout monitoring
    paintMonitoring: {
      enabled: true,
      trackLayoutThrashing: true,
      trackPaintFlashing: false, // Enable in DevTools settings instead
    },

    // Network monitoring for API calls during drag
    networkMonitoring: {
      enabled: true,
      trackConflictChecks: true,
      trackStateUpdates: true,
    },

    // Custom performance markers
    markers: {
      dragStart: 'drag-start',
      dragEnd: 'drag-end',
      conflictCheck: 'conflict-check',
      positionCalculation: 'position-calc',
      storeUpdate: 'store-update',
      render: 'render',
    }
  };

  // Performance marker utilities
  window.performanceMarkers = {
    mark: function(name) {
      if (performance.mark) {
        performance.mark(name);
        console.log(`[MARK] ${name} at ${performance.now().toFixed(2)}ms`);
      }
    },

    measure: function(name, startMark, endMark) {
      if (performance.measure) {
        try {
          performance.measure(name, startMark, endMark);
          const measure = performance.getEntriesByName(name)[0];
          console.log(`[MEASURE] ${name}: ${measure.duration.toFixed(2)}ms`);
          return measure.duration;
        } catch (e) {
          console.warn(`[MEASURE] Failed to measure ${name}:`, e.message);
        }
      }
      return 0;
    },

    getDuration: function(markName) {
      const entries = performance.getEntriesByName(markName);
      return entries.length > 0 ? entries[0].duration : 0;
    },

    clearMarks: function(pattern) {
      if (performance.clearMarks) {
        if (pattern) {
          performance.getEntriesByName().forEach(entry => {
            if (entry.name.includes(pattern)) {
              performance.clearMarks(entry.name);
            }
          });
        } else {
          performance.clearMarks();
        }
      }
    },

    clearMeasures: function(pattern) {
      if (performance.clearMeasures) {
        if (pattern) {
          performance.getEntriesByName().forEach(entry => {
            if (entry.name.includes(pattern)) {
              performance.clearMeasures(entry.name);
            }
          });
        } else {
          performance.clearMeasures();
        }
      }
    }
  };

  // Frame rate monitor
  window.frameRateMonitor = {
    frameCount: 0,
    lastTime: performance.now(),
    fpsHistory: [],
    maxHistorySize: 60,

    start: function() {
      console.log('[FPS] Starting frame rate monitoring');
      this.frameCount = 0;
      this.lastTime = performance.now();
      this.fpsHistory = [];

      const monitor = () => {
        this.frameCount++;
        const now = performance.now();
        const deltaTime = now - this.lastTime;

        if (deltaTime >= 1000) {
          const fps = Math.round((this.frameCount * 1000) / deltaTime);
          this.fpsHistory.push(fps);

          if (this.fpsHistory.length > this.maxHistorySize) {
            this.fpsHistory.shift();
          }

          const avgFps = this.getAverageFPS();
          console.log(`[FPS] Current: ${fps}, Average: ${avgFps}`);

          if (fps < window.dragPerformanceConfig.frameRateMonitoring.warningThreshold) {
            console.warn(`[FPS WARNING] Frame rate dropped to ${fps} FPS`);
          }

          if (fps < window.dragPerformanceConfig.frameRateMonitoring.criticalThreshold) {
            console.error(`[FPS CRITICAL] Frame rate critically low: ${fps} FPS`);
          }

          this.frameCount = 0;
          this.lastTime = now;
        }

        requestAnimationFrame(monitor);
      };

      requestAnimationFrame(monitor);
    },

    getAverageFPS: function() {
      if (this.fpsHistory.length === 0) return 0;
      return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    },

    getFPSHistory: function() {
      return [...this.fpsHistory];
    },

    reset: function() {
      this.fpsHistory = [];
      this.frameCount = 0;
      this.lastTime = performance.now();
    }
  };

  // Memory monitor
  window.memoryMonitor = {
    intervalId: null,
    history: [],
    maxHistorySize: 100,

    start: function() {
      console.log('[MEMORY] Starting memory monitoring');
      this.history = [];

      this.intervalId = setInterval(() => {
        if (performance.memory) {
          const memory = performance.memory;
          const usage = {
            timestamp: Date.now(),
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
          };

          this.history.push(usage);

          if (this.history.length > this.maxHistorySize) {
            this.history.shift();
          }

          console.log(`[MEMORY] ${usage.percentage}% (${Math.round(usage.used / 1024 / 1024)}MB / ${Math.round(usage.total / 1024 / 1024)}MB)`);

          if (usage.used > window.dragPerformanceConfig.memoryMonitoring.warningThreshold) {
            console.warn(`[MEMORY WARNING] High memory usage: ${Math.round(usage.used / 1024 / 1024)}MB`);
          }

          if (usage.used > window.dragPerformanceConfig.memoryMonitoring.criticalThreshold) {
            console.error(`[MEMORY CRITICAL] Memory usage critically high: ${Math.round(usage.used / 1024 / 1024)}MB`);
          }
        }
      }, window.dragPerformanceConfig.memoryMonitoring.checkInterval);
    },

    stop: function() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    getHistory: function() {
      return [...this.history];
    },

    getCurrentUsage: function() {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100)
        };
      }
      return null;
    }
  };

  // Drag operation monitor
  window.dragMonitor = {
    activeDrags: new Map(),

    startDrag: function(dragId, element) {
      console.log(`[DRAG] Starting drag: ${dragId}`);

      const dragInfo = {
        id: dragId,
        startTime: performance.now(),
        startMemory: window.memoryMonitor.getCurrentUsage(),
        element: element,
        conflictChecks: 0,
        positionCalculations: 0,
        renders: 0,
        events: []
      };

      this.activeDrags.set(dragId, dragInfo);
      window.performanceMarkers.mark(window.dragPerformanceConfig.markers.dragStart);

      return dragId;
    },

    recordEvent: function(dragId, eventType, data) {
      const drag = this.activeDrags.get(dragId);
      if (drag) {
        drag.events.push({
          type: eventType,
          timestamp: performance.now(),
          data: data
        });

        switch (eventType) {
          case 'conflict-check':
            drag.conflictChecks++;
            window.performanceMarkers.mark(window.dragPerformanceConfig.markers.conflictCheck);
            break;
          case 'position-calculation':
            drag.positionCalculations++;
            window.performanceMarkers.mark(window.dragPerformanceConfig.markers.positionCalculation);
            break;
          case 'render':
            drag.renders++;
            window.performanceMarkers.mark(window.dragPerformanceConfig.markers.render);
            break;
          case 'store-update':
            window.performanceMarkers.mark(window.dragPerformanceConfig.markers.storeUpdate);
            break;
        }
      }
    },

    endDrag: function(dragId) {
      const drag = this.activeDrags.get(dragId);
      if (!drag) return null;

      drag.endTime = performance.now();
      drag.duration = drag.endTime - drag.startTime;
      drag.endMemory = window.memoryMonitor.getCurrentUsage();

      console.log(`[DRAG] Ended drag: ${dragId}`, {
        duration: `${drag.duration.toFixed(2)}ms`,
        conflictChecks: drag.conflictChecks,
        positionCalculations: drag.positionCalculations,
        renders: drag.renders,
        memoryDelta: drag.endMemory && drag.startMemory ?
          `${Math.round((drag.endMemory.used - drag.startMemory.used) / 1024 / 1024)}MB` : 'unknown'
      });

      window.performanceMarkers.mark(window.dragPerformanceConfig.markers.dragEnd);

      this.activeDrags.delete(dragId);
      return drag;
    },

    getActiveDrags: function() {
      return Array.from(this.activeDrags.entries()).map(([id, drag]) => ({
        id,
        duration: drag.endTime ? drag.endTime - drag.startTime : performance.now() - drag.startTime,
        conflictChecks: drag.conflictChecks,
        positionCalculations: drag.positionCalculations,
        renders: drag.renders
      }));
    }
  };

  // Auto-start monitoring if enabled
  if (window.dragPerformanceConfig.enablePerformanceMonitoring) {
    window.frameRateMonitor.start();
    window.memoryMonitor.start();

    console.log('[PERF] Performance monitoring started');
    console.log('[PERF] Use window.dragMonitor to track drag operations');
    console.log('[PERF] Use window.performanceMarkers to create custom marks');
  }

  // DevTools integration helpers
  window.devToolsHelpers = {
    // Get all performance entries
    getPerformanceEntries: function(type = 'all') {
      const entries = performance.getEntries();
      switch (type) {
        case 'marks':
          return performance.getEntriesByType('mark');
        case 'measures':
          return performance.getEntriesByType('measure');
        case 'navigation':
          return performance.getEntriesByType('navigation');
        default:
          return entries;
      }
    },

    // Export performance data as JSON
    exportPerformanceData: function() {
      return {
        marks: performance.getEntriesByType('mark'),
        measures: performance.getEntriesByType('measure'),
        memory: window.memoryMonitor.getHistory(),
        fps: window.frameRateMonitor.getFPSHistory(),
        activeDrags: window.dragMonitor.getActiveDrags(),
        timestamp: Date.now()
      };
    },

    // Clear all performance data
    clearPerformanceData: function() {
      window.performanceMarkers.clearMarks();
      window.performanceMarkers.clearMeasures();
      window.frameRateMonitor.reset();
      window.memoryMonitor.history = [];
      console.log('[PERF] All performance data cleared');
    },

    // Generate performance report
    generateReport: function() {
      const data = this.exportPerformanceData();
      console.log('=== PERFORMANCE REPORT ===');
      console.log(`Total Marks: ${data.marks.length}`);
      console.log(`Total Measures: ${data.measures.length}`);
      console.log(`Average FPS: ${window.frameRateMonitor.getAverageFPS()}`);
      console.log(`Memory Samples: ${data.memory.length}`);
      console.log(`Active Drags: ${data.activeDrags.length}`);

      if (data.measures.length > 0) {
        console.log('\nTop Measures:');
        data.measures
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .forEach(measure => {
            console.log(`  ${measure.name}: ${measure.duration.toFixed(2)}ms`);
          });
      }

      return data;
    }
  };

  console.log('🚀 Chrome DevTools Performance Config loaded!');
  console.log('📊 Use window.devToolsHelpers.generateReport() to see performance summary');
  console.log('🎯 Use window.dragMonitor.startDrag(id) to track drag operations');
  console.log('🏷️  Use window.performanceMarkers.mark(name) to create custom marks');

})();