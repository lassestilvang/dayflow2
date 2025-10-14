"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useOptimizedConflictDetection } from "@/hooks/useOptimizedConflictDetection";
import { getSpatialIndexStats } from "@/lib/optimized-conflict-detection";
import { getQuadTreePerformanceMetrics } from "@/lib/quadtree-spatial-index";
import type { Event, Task } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Database, Grid3X3 } from "lucide-react";

// Props for conflict detection monitor
interface ConflictDetectionMonitorProps {
  events: Event[];
  tasks: Task[];
  isVisible?: boolean;
  position?: { top?: number; right?: number; bottom?: number; left?: number };
}

/**
 * Real-time conflict detection performance monitor
 */
export function ConflictDetectionMonitor({
  events,
  tasks,
  isVisible = true,
  position = { top: 20, right: 20 },
}: ConflictDetectionMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    timestamp: number;
    timeIndexStats: {
      bucketCount: number;
      totalItems: number;
      averageItemsPerBucket: number;
      accessCount: number;
      hitRate: number;
      config: { bucketSize: number; maxBuckets: number; enableCompression: boolean };
    };
    quadTreeStats: {
      totalItems: number;
      treeDepth: number;
      nodeCount: number;
      averageItemsPerNode: number;
      itemCount: number;
    };
  }>>([]);

  const {
    performanceStats,
    updateSpatialIndices,
  } = useOptimizedConflictDetection(events, tasks);

  // Collect performance history
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const timeIndexStats = getSpatialIndexStats();
      const quadTreeStats = getQuadTreePerformanceMetrics();

      setPerformanceHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          timeIndexStats,
          quadTreeStats,
        }];

        // Keep only last 20 measurements
        return newHistory.slice(-20);
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  // Calculate performance trends
  const performanceTrends = useMemo(() => {
    if (performanceHistory.length < 2) {
      return { timeIndex: 'stable', quadTree: 'stable' };
    }

    const recent = performanceHistory.slice(-5);
    const older = performanceHistory.slice(-10, -5);

    const recentTimeIndexSize = recent.reduce((sum, h) => sum + (h.timeIndexStats?.bucketCount || 0), 0) / recent.length;
    const olderTimeIndexSize = older.reduce((sum, h) => sum + (h.timeIndexStats?.bucketCount || 0), 0) / older.length;

    const recentQuadTreeSize = recent.reduce((sum, h) => sum + (h.quadTreeStats?.nodeCount || 0), 0) / recent.length;
    const olderQuadTreeSize = older.reduce((sum, h) => sum + (h.quadTreeStats?.nodeCount || 0), 0) / older.length;

    return {
      timeIndex: recentTimeIndexSize > olderTimeIndexSize * 1.1 ? 'growing' :
                recentTimeIndexSize < olderTimeIndexSize * 0.9 ? 'shrinking' : 'stable',
      quadTree: recentQuadTreeSize > olderQuadTreeSize * 1.1 ? 'growing' :
               recentQuadTreeSize < olderQuadTreeSize * 0.9 ? 'shrinking' : 'stable',
    };
  }, [performanceHistory]);

  if (!isVisible) {
    return null;
  }

  const timeIndexStats = performanceStats?.timeIndex;
  const quadTreeStats = performanceStats?.quadTree;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${isExpanded ? 'w-96 h-[600px]' : 'w-64 h-32'}`}
      style={{
        top: position.top,
        right: position.right,
        bottom: position.bottom,
        left: position.left,
      }}
    >
      <Card className="bg-black/90 text-white border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Conflict Detection Monitor
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant={(performanceStats?.custom?.averageCheckTime ?? 0) < 5 ? "default" : "destructive"}>
                {(performanceStats?.custom?.averageCheckTime ?? 0) < 5 ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {(performanceStats?.custom?.averageCheckTime ?? 0).toFixed(1)}ms
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? '−' : '+'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {!isExpanded ? (
            // Compact view
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Time Index:</span>
                <span>{timeIndexStats?.bucketCount || 0} buckets</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>QuadTree:</span>
                <span>{quadTreeStats?.nodeCount || 0} nodes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Items:</span>
                <span>{timeIndexStats?.totalItems || 0} total</span>
              </div>
            </div>
          ) : (
            // Expanded view
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="time-index">Time Index</TabsTrigger>
                <TabsTrigger value="quadtree">QuadTree</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Time Index Buckets:</span>
                      <Badge variant="outline">{timeIndexStats?.bucketCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>QuadTree Nodes:</span>
                      <Badge variant="outline">{quadTreeStats?.nodeCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <Badge variant="outline">{timeIndexStats?.totalItems || 0}</Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Avg Check Time:</span>
                      <Badge variant={(performanceStats?.custom?.averageCheckTime ?? 0) < 5 ? "default" : "destructive"}>
                        {(performanceStats?.custom?.averageCheckTime ?? 0).toFixed(1)}ms
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Index Trend:</span>
                      <Badge variant={
                        performanceTrends.timeIndex === 'growing' ? 'destructive' :
                        performanceTrends.timeIndex === 'shrinking' ? 'default' : 'secondary'
                      }>
                        {performanceTrends.timeIndex}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>QuadTree Trend:</span>
                      <Badge variant={
                        performanceTrends.quadTree === 'growing' ? 'destructive' :
                        performanceTrends.quadTree === 'shrinking' ? 'default' : 'secondary'
                      }>
                        {performanceTrends.quadTree}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Performance Score</span>
                      <span>{((100 - (performanceStats?.custom?.averageCheckTime || 0) * 10)).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={Math.max(0, 100 - (performanceStats?.custom?.averageCheckTime || 0) * 10)}
                      className="h-2"
                    />
                  </div>
                </div>

                {performanceStats?.recommendations && performanceStats.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium">Recommendations:</h4>
                    <div className="space-y-1">
                      {performanceStats.recommendations.map((rec, index) => (
                        <div key={index} className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="time-index" className="space-y-2">
                {timeIndexStats ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Buckets:</span> {timeIndexStats.bucketCount}
                      </div>
                      <div>
                        <span className="font-medium">Total Items:</span> {timeIndexStats.totalItems}
                      </div>
                      <div>
                        <span className="font-medium">Avg per Bucket:</span> {timeIndexStats.averageItemsPerBucket.toFixed(1)}
                      </div>
                      <div>
                        <span className="font-medium">Access Count:</span> {timeIndexStats.accessCount}
                      </div>
                      <div>
                        <span className="font-medium">Hit Rate:</span> {(timeIndexStats.hitRate * 100).toFixed(1)}%
                      </div>
                      <div>
                        <span className="font-medium">Bucket Size:</span> {timeIndexStats.config.bucketSize}min
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-600">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={updateSpatialIndices}
                        className="w-full"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Update Time Index
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Time index not enabled</div>
                )}
              </TabsContent>

              <TabsContent value="quadtree" className="space-y-2">
                {quadTreeStats ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Nodes:</span> {quadTreeStats.nodeCount}
                      </div>
                      <div>
                        <span className="font-medium">Tree Depth:</span> {quadTreeStats.treeDepth}
                      </div>
                      <div>
                        <span className="font-medium">Total Items:</span> {quadTreeStats.totalItems}
                      </div>
                      <div>
                        <span className="font-medium">Avg per Node:</span> {quadTreeStats.averageItemsPerNode.toFixed(1)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-600">
                      <div className="text-xs text-gray-400 mb-2">
                        <Grid3X3 className="w-3 h-3 inline mr-1" />
                        2D spatial index for drag collisions
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">QuadTree not enabled</div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook for accessing conflict detection monitor state
 */
export function useConflictDetectionMonitor() {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(prev => !prev);

  return {
    isVisible,
    show,
    hide,
    toggle,
  };
}