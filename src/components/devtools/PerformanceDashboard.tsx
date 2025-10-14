// Enhanced Performance Dashboard with baseline monitoring and regression detection
"use client";

import React, { useEffect, useState } from "react";
import { baselineMonitor, type BaselineMetrics } from "@/lib/baseline-monitor";
import {
  regressionMonitor,
  type RegressionAlert,
} from "@/lib/regression-monitor";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

interface DashboardState {
  isVisible: boolean;
  currentMetrics: BaselineMetrics | null;
  alerts: RegressionAlert[];
  benchmarkResults: Array<{
    scenario: string;
    success: boolean;
    errors: string[];
    metrics?: {
      frameRate: { average: number };
      memoryUsage: { increaseMB: number };
    };
  }>;
  isMonitoring: boolean;
}

export function PerformanceDashboard() {
  const [state, setState] = useState<DashboardState>({
    isVisible: false,
    currentMetrics: null,
    alerts: [],
    benchmarkResults: [],
    isMonitoring: false,
  });

  useEffect(() => {
    // Load initial data
    loadDashboardData();

    // Set up periodic updates
    const interval = setInterval(loadDashboardData, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = () => {
    setState((prev) => ({
      ...prev,
      currentMetrics: baselineMonitor.getMetricsHistory().slice(-1)[0] || null,
      alerts: regressionMonitor.getAlerts(),
      benchmarkResults: [], // Placeholder for benchmark results
    }));
  };

  const toggleMonitoring = () => {
    setState((prev) => {
      const newMonitoringState = !prev.isMonitoring;

      if (newMonitoringState) {
        baselineMonitor.startCollection();
        console.log("[DASHBOARD] Started performance monitoring");
      } else {
        const metrics = baselineMonitor.stopCollection();
        if (metrics) {
          console.log(
            "[DASHBOARD] Stopped monitoring, collected metrics:",
            metrics
          );
        }
      }

      return { ...prev, isMonitoring: newMonitoringState };
    });
  };

  const runBenchmarks = async () => {
    console.log("[DASHBOARD] Running performance benchmarks...");
    try {
      const results: DashboardState["benchmarkResults"] = []; // Placeholder for benchmark results
      console.log("[DASHBOARD] Benchmarks completed:", results);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error("[DASHBOARD] Benchmark error:", error);
    }
  };

  const clearAlerts = () => {
    regressionMonitor.clearAlerts();
    loadDashboardData();
  };

  if (!state.isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <button
          onClick={() => setState((prev) => ({ ...prev, isVisible: true }))}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
        >
          📊 Perf Dashboard
        </button>

        {state.alerts.filter(
          (a) => a.severity === "critical" || a.severity === "high"
        ).length > 0 && (
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs animate-pulse">
            🚨{" "}
            {
              state.alerts.filter(
                (a) => a.severity === "critical" || a.severity === "high"
              ).length
            }{" "}
            Alerts
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Performance Dashboard</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMonitoring}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              state.isMonitoring
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {state.isMonitoring ? "⏹️ Stop Monitoring" : "▶️ Start Monitoring"}
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, isVisible: false }))}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
        {/* Current Metrics */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            📊 Current Metrics
            {state.isMonitoring && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                LIVE
              </span>
            )}
          </h4>

          {state.currentMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                title="Frame Rate"
                value={`${state.currentMetrics.frameRate.average}fps`}
                target="60fps"
                status={
                  state.currentMetrics.frameRate.average >= 60
                    ? "good"
                    : state.currentMetrics.frameRate.average >= 30
                    ? "warning"
                    : "bad"
                }
                details={`Min: ${state.currentMetrics.frameRate.min}, Max: ${state.currentMetrics.frameRate.max}`}
              />
              <MetricCard
                title="Memory Increase"
                value={`${state.currentMetrics.memoryUsage.increaseMB.toFixed(
                  1
                )}MB`}
                target="<50MB"
                status={
                  state.currentMetrics.memoryUsage.increaseMB < 50
                    ? "good"
                    : "bad"
                }
              />
              <MetricCard
                title="Collision Detection"
                value={`${state.currentMetrics.collisionDetection.averageTime.toFixed(
                  1
                )}ms`}
                target="<100ms"
                status={
                  state.currentMetrics.collisionDetection.averageTime < 100
                    ? "good"
                    : "bad"
                }
                details={`${state.currentMetrics.collisionDetection.totalChecks} checks`}
              />
              <MetricCard
                title="Store Updates"
                value={`${state.currentMetrics.storeUpdates.frequency}/sec`}
                target="<50/sec"
                status={
                  state.currentMetrics.storeUpdates.frequency < 50
                    ? "good"
                    : "bad"
                }
              />
              <MetricCard
                title="Time Slots"
                value={`${state.currentMetrics.timeSlotCreation.count}`}
                target="119"
                status="neutral"
              />
              <MetricCard
                title="Active Drags"
                value={`${dragPerformanceMonitor.getActiveSessions().length}`}
                target="0"
                status="neutral"
              />
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              No metrics collected yet. Start monitoring to see data.
            </div>
          )}
        </div>

        {/* Alerts */}
        {state.alerts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                🚨 Performance Alerts
              </h4>
              <button
                onClick={clearAlerts}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {state.alerts.slice(0, 5).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
              {state.alerts.length > 5 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{state.alerts.length - 5} more alerts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benchmark Results */}
        {state.benchmarkResults.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              🧪 Benchmark Results
            </h4>
            <div className="space-y-2">
              {state.benchmarkResults.slice(0, 3).map((result, index) => (
                <BenchmarkResultItem key={index} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={runBenchmarks}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Run Benchmarks
            </button>
            <button
              onClick={() => {
                const report = baselineMonitor.generateReport();
                console.log(report);
                alert("Baseline report logged to console");
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Generate Report
            </button>
            <button
              onClick={() => {
                const report = regressionMonitor.generateRegressionReport();
                console.log(report);
                alert("Regression report logged to console");
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Regression Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  target: string;
  status: "good" | "warning" | "bad" | "neutral";
  details?: string;
}

function MetricCard({
  title,
  value,
  target,
  status,
  details,
}: MetricCardProps) {
  const statusColors = {
    good: "text-green-600 bg-green-50 border-green-200",
    warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
    bad: "text-red-600 bg-red-50 border-red-200",
    neutral: "text-gray-600 bg-gray-50 border-gray-200",
  };

  return (
    <div className={`border rounded-lg p-3 ${statusColors[status]}`}>
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-gray-600">Target: {target}</div>
      {details && <div className="text-xs text-gray-500 mt-1">{details}</div>}
    </div>
  );
}

interface AlertItemProps {
  alert: RegressionAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const severityColors = {
    low: "border-blue-200 bg-blue-50",
    medium: "border-yellow-200 bg-yellow-50",
    high: "border-orange-200 bg-orange-50",
    critical: "border-red-200 bg-red-50",
  };

  const severityIcons = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🚨",
    critical: "🔥",
  };

  return (
    <div
      className={`border-l-4 p-2 rounded text-xs ${
        severityColors[alert.severity]
      }`}
    >
      <div className="flex items-center space-x-2">
        <span>{severityIcons[alert.severity]}</span>
        <span className="font-medium">{alert.metric}</span>
        <span className="text-gray-600">{alert.description}</span>
      </div>
      <div className="text-gray-500 mt-1">
        {new Date(alert.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface BenchmarkResultItemProps {
  result: DashboardState["benchmarkResults"][number];
}

function BenchmarkResultItem({ result }: BenchmarkResultItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{result.scenario}</div>
          <div className="text-xs text-gray-600">
            {result.success ? "✅ Passed" : "❌ Failed"}
            {result.errors.length > 0 && ` (${result.errors.length} errors)`}
          </div>
        </div>
        {result.metrics && (
          <div className="text-right text-xs text-gray-600">
            <div>FPS: {result.metrics.frameRate.average}</div>
            <div>
              Memory: {result.metrics.memoryUsage.increaseMB.toFixed(1)}MB
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Auto-enable dashboard in development
if (process.env.NODE_ENV === "development") {
  // Add global helpers to window
  (
    window as unknown as { performanceDashboard?: unknown }
  ).performanceDashboard = {
    show: () => {
      const event = new CustomEvent("show-performance-dashboard");
      window.dispatchEvent(event);
    },
    hide: () => {
      const event = new CustomEvent("hide-performance-dashboard");
      window.dispatchEvent(event);
    },
    getMetrics: () => baselineMonitor.getMetricsHistory(),
    getAlerts: () => regressionMonitor.getAlerts(),
    runBenchmarks: async () => [],
  };

  console.log("📊 Performance Dashboard helpers loaded");
  console.log("💡 Use window.performanceDashboard.show() to open dashboard");
  console.log(
    "📈 Use window.performanceDashboard.getMetrics() to get current metrics"
  );
}
