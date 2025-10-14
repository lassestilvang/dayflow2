// Automated regression monitoring for drag and drop performance
// Detects performance regressions and tracks improvements over time

import { baselineMonitor, type BaselineMetrics } from "./baseline-monitor";

export interface RegressionAlert {
  id: string;
  timestamp: number;
  type: "regression" | "improvement" | "threshold_exceeded";
  metric: string;
  previousValue: number;
  currentValue: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}

export interface RegressionConfig {
  frameRateThreshold: number;
  memoryThresholdMB: number;
  collisionTimeThreshold: number;
  storeUpdateThreshold: number;
  enableAlerts: boolean;
  alertWebhook?: string;
}

class RegressionMonitor {
  private static instance: RegressionMonitor;
  private metricsHistory: BaselineMetrics[] = [];
  private alerts: RegressionAlert[] = [];
  private config: RegressionConfig = {
    frameRateThreshold: 60,
    memoryThresholdMB: 50,
    collisionTimeThreshold: 100,
    storeUpdateThreshold: 50,
    enableAlerts: true,
  };

  static getInstance(): RegressionMonitor {
    if (!RegressionMonitor.instance) {
      RegressionMonitor.instance = new RegressionMonitor();
    }
    return RegressionMonitor.instance;
  }

  updateConfig(config: Partial<RegressionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[REGRESSION] Configuration updated:", this.config);
  }

  addMetrics(metrics: BaselineMetrics): void {
    this.metricsHistory.push(metrics);

    // Keep only last 100 measurements to prevent memory bloat
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    // Analyze for regressions
    this.analyzeRegressions(metrics);
  }

  private analyzeRegressions(current: BaselineMetrics): void {
    if (this.metricsHistory.length < 2) return;

    const previous = this.metricsHistory[this.metricsHistory.length - 2]!;
    const alerts: RegressionAlert[] = [];

    // Check frame rate regression
    if (current.frameRate.average < previous.frameRate.average * 0.9) {
      // 10% drop
      alerts.push(
        this.createAlert(
          "regression",
          "Frame Rate",
          previous.frameRate.average,
          current.frameRate.average,
          this.config.frameRateThreshold
        )
      );
    }

    // Check memory usage regression
    if (
      current.memoryUsage.increaseMB >
      previous.memoryUsage.increaseMB * 1.2
    ) {
      // 20% increase
      alerts.push(
        this.createAlert(
          "regression",
          "Memory Usage",
          previous.memoryUsage.increaseMB,
          current.memoryUsage.increaseMB,
          this.config.memoryThresholdMB
        )
      );
    }

    // Check collision detection regression
    if (
      current.collisionDetection.averageTime >
      previous.collisionDetection.averageTime * 1.5
    ) {
      // 50% slower
      alerts.push(
        this.createAlert(
          "regression",
          "Collision Detection",
          previous.collisionDetection.averageTime,
          current.collisionDetection.averageTime,
          this.config.collisionTimeThreshold
        )
      );
    }

    // Check store update frequency regression
    if (
      current.storeUpdates.frequency >
      previous.storeUpdates.frequency * 1.3
    ) {
      // 30% increase
      alerts.push(
        this.createAlert(
          "regression",
          "Store Updates",
          previous.storeUpdates.frequency,
          current.storeUpdates.frequency,
          this.config.storeUpdateThreshold
        )
      );
    }

    // Check threshold violations
    if (current.frameRate.average < this.config.frameRateThreshold) {
      alerts.push(
        this.createAlert(
          "threshold_exceeded",
          "Frame Rate",
          previous.frameRate.average,
          current.frameRate.average,
          this.config.frameRateThreshold
        )
      );
    }

    if (current.memoryUsage.increaseMB > this.config.memoryThresholdMB) {
      alerts.push(
        this.createAlert(
          "threshold_exceeded",
          "Memory Usage",
          previous.memoryUsage.increaseMB,
          current.memoryUsage.increaseMB,
          this.config.memoryThresholdMB
        )
      );
    }

    if (
      current.collisionDetection.averageTime >
      this.config.collisionTimeThreshold
    ) {
      alerts.push(
        this.createAlert(
          "threshold_exceeded",
          "Collision Detection",
          previous.collisionDetection.averageTime,
          current.collisionDetection.averageTime,
          this.config.collisionTimeThreshold
        )
      );
    }

    if (current.storeUpdates.frequency > this.config.storeUpdateThreshold) {
      alerts.push(
        this.createAlert(
          "threshold_exceeded",
          "Store Updates",
          previous.storeUpdates.frequency,
          current.storeUpdates.frequency,
          this.config.storeUpdateThreshold
        )
      );
    }

    // Add alerts and send notifications
    alerts.forEach((alert) => {
      this.alerts.push(alert);
      this.sendAlert(alert);
    });
  }

  private createAlert(
    type: "regression" | "improvement" | "threshold_exceeded",
    metric: string,
    previousValue: number,
    currentValue: number,
    threshold: number
  ): RegressionAlert {
    const change = ((currentValue - previousValue) / previousValue) * 100;
    const severity = this.calculateSeverity(metric, Math.abs(change));

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      metric,
      previousValue,
      currentValue,
      threshold,
      severity,
      description: this.generateAlertDescription(
        type,
        metric,
        previousValue,
        currentValue,
        change
      ),
    };
  }

  private calculateSeverity(
    _metric: string,
    changePercent: number
  ): "low" | "medium" | "high" | "critical" {
    if (changePercent > 50) return "critical";
    if (changePercent > 25) return "high";
    if (changePercent > 10) return "medium";
    return "low";
  }

  private generateAlertDescription(
    type: string,
    metric: string,
    previousValue: number,
    currentValue: number,
    change: number
  ): string {
    const changeText =
      change > 0
        ? `increased by ${change.toFixed(1)}%`
        : `decreased by ${Math.abs(change).toFixed(1)}%`;
    const fromTo = `${previousValue.toFixed(2)} → ${currentValue.toFixed(2)}`;

    switch (type) {
      case "regression":
        return `${metric} performance regressed: ${fromTo} (${changeText})`;
      case "improvement":
        return `${metric} performance improved: ${fromTo} (${changeText})`;
      case "threshold_exceeded":
        return `${metric} exceeded threshold: ${currentValue.toFixed(
          2
        )} (threshold: ${this.getThresholdForMetric(metric)})`;
      default:
        return `${metric} changed: ${fromTo}`;
    }
  }

  private getThresholdForMetric(metric: string): number {
    switch (metric) {
      case "Frame Rate":
        return this.config.frameRateThreshold;
      case "Memory Usage":
        return this.config.memoryThresholdMB;
      case "Collision Detection":
        return this.config.collisionTimeThreshold;
      case "Store Updates":
        return this.config.storeUpdateThreshold;
      default:
        return 0;
    }
  }

  private async sendAlert(alert: RegressionAlert): Promise<void> {
    if (!this.config.enableAlerts) return;

    console.warn(
      `[REGRESSION ALERT] ${alert.severity.toUpperCase()}: ${alert.description}`
    );

    // Send webhook notification if configured
    if (this.config.alertWebhook) {
      try {
        await fetch(this.config.alertWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(alert),
        });
      } catch (error) {
        console.error("[REGRESSION] Failed to send webhook alert:", error);
      }
    }

    // Store alert in local storage for persistence
    this.persistAlerts();
  }

  private persistAlerts(): void {
    try {
      localStorage.setItem(
        "drag-drop-regression-alerts",
        JSON.stringify(this.alerts.slice(-50))
      ); // Keep last 50 alerts
    } catch (error) {
      console.error("[REGRESSION] Failed to persist alerts:", error);
    }
  }

  loadPersistedAlerts(): void {
    try {
      const stored = localStorage.getItem("drag-drop-regression-alerts");
      if (stored) {
        this.alerts = JSON.parse(stored);
        console.log(
          `[REGRESSION] Loaded ${this.alerts.length} persisted alerts`
        );
      }
    } catch (error) {
      console.error("[REGRESSION] Failed to load persisted alerts:", error);
    }
  }

  getAlerts(since?: Date): RegressionAlert[] {
    let alerts = this.alerts;

    if (since) {
      alerts = alerts.filter((alert) => alert.timestamp >= since.getTime());
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  getAlertsBySeverity(
    severity: "low" | "medium" | "high" | "critical"
  ): RegressionAlert[] {
    return this.alerts.filter((alert) => alert.severity === severity);
  }

  getMetricsTrend(
    metric: keyof BaselineMetrics,
    window: number = 10
  ): "improving" | "degrading" | "stable" {
    if (this.metricsHistory.length < window) return "stable";

    const recent = this.metricsHistory.slice(-window);
    const values = recent.map((m) => this.extractMetricValue(m, metric));

    if (values.length < 2) return "stable";

    const first = values[0]!;
    const last = values[values.length - 1]!;
    const change = ((last - first) / first) * 100;

    if (change > 5) return "improving";
    if (change < -5) return "degrading";
    return "stable";
  }

  private extractMetricValue(
    metrics: BaselineMetrics,
    metric: keyof BaselineMetrics
  ): number {
    switch (metric) {
      case "frameRate":
        return metrics.frameRate.average;
      case "memoryUsage":
        return metrics.memoryUsage.increaseMB;
      case "collisionDetection":
        return metrics.collisionDetection.averageTime;
      case "storeUpdates":
        return metrics.storeUpdates.frequency;
      case "timeSlotCreation":
        return metrics.timeSlotCreation.count;
      case "dragOperations":
        return metrics.dragOperations.averageDuration;
      default:
        return 0;
    }
  }

  generateRegressionReport(): string {
    const recentAlerts = this.getAlerts();
    const criticalAlerts = this.getAlertsBySeverity("critical");
    const highAlerts = this.getAlertsBySeverity("high");

    let report = "=== REGRESSION MONITORING REPORT ===\n\n";

    report += `Total Alerts: ${recentAlerts.length}\n`;
    report += `Critical: ${criticalAlerts.length}\n`;
    report += `High: ${highAlerts.length}\n`;
    report += `Medium: ${this.getAlertsBySeverity("medium").length}\n`;
    report += `Low: ${this.getAlertsBySeverity("low").length}\n\n`;

    if (recentAlerts.length > 0) {
      report += "RECENT ALERTS:\n";
      recentAlerts.slice(0, 10).forEach((alert) => {
        const time = new Date(alert.timestamp).toLocaleString();
        report += `${time} [${alert.severity.toUpperCase()}] ${
          alert.description
        }\n`;
      });
      report += "\n";
    }

    report += "METRIC TRENDS:\n";
    const metrics: (keyof BaselineMetrics)[] = [
      "frameRate",
      "memoryUsage",
      "collisionDetection",
      "storeUpdates",
    ];
    metrics.forEach((metric) => {
      const trend = this.getMetricsTrend(metric);
      const trendIcon =
        trend === "improving" ? "📈" : trend === "degrading" ? "📉" : "➡️";
      report += `${trendIcon} ${metric}: ${trend}\n`;
    });

    return report;
  }

  clearAlerts(): void {
    this.alerts = [];
    try {
      localStorage.removeItem("drag-drop-regression-alerts");
    } catch (error) {
      console.error("[REGRESSION] Failed to clear persisted alerts:", error);
    }
  }

  exportAlerts(): string {
    return JSON.stringify(this.alerts, null, 2);
  }
}

export const regressionMonitor = RegressionMonitor.getInstance();

// Initialize with persisted alerts
if (typeof window !== "undefined") {
  regressionMonitor.loadPersistedAlerts();
}

// Integration with baseline monitor
export const enhancedBaselineMonitor = {
  ...baselineMonitor,

  stopCollection(): BaselineMetrics | null {
    const metrics = baselineMonitor.stopCollection();
    if (metrics) {
      regressionMonitor.addMetrics(metrics);
    }
    return metrics;
  },
};
