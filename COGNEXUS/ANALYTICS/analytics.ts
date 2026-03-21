/**
 * Analytics Collector & Aggregator
 * 
 * Real-time metrics collection for cognitive performance, memory usage,
 * task execution, and self-evolution tracking.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface MetricSeries {
  name: string;
  description: string;
  unit: string;
  points: MetricPoint[];
  aggregation: "avg" | "sum" | "max" | "min" | "last";
}

interface AnalyticsSnapshot {
  timestamp: number;
  sessionId: string;
  memory: {
    workingSetSize: number;
    episodicSize: number;
    semanticSize: number;
    importanceDistribution: number[];
  };
  cognition: {
    contextTokens: number;
    contextUsagePercent: number;
    compactionCount: number;
    lastCompactionAt: number | null;
  };
  tasks: {
    active: number;
    pending: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
  };
  evolution: {
    changesApplied: number;
    pendingChanges: number;
    performanceScore: number;
    trend: "improving" | "stable" | "declining";
  };
}

interface AnalyticsConfig {
  retentionDays: number;
  aggregationWindowMs: number;
  snapshotIntervalMs: number;
  enableRealtime: boolean;
  port: number;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  retentionDays: 30,
  aggregationWindowMs: 60000, // 1 minute
  snapshotIntervalMs: 5000,    // 5 seconds
  enableRealtime: true,
  port: 3738,                  // Default port for /__openclaw__/analytics
};

export class AnalyticsCollector {
  private api: OpenClawPluginApi;
  private config: AnalyticsConfig;
  private workspaceDir: string;
  private metricsDir: string;
  private metrics: Map<string, MetricSeries>;
  private snapshots: AnalyticsSnapshot[];
  private realtimeClients: Map<string, (snapshot: AnalyticsSnapshot) => void>;
  private server?: ReturnType<typeof import("http")["createServer"]>;
  
  constructor(api: OpenClawPluginApi, workspaceDir: string) {
    this.api = api;
    this.workspaceDir = workspaceDir.replace(/^~/, process.env.HOME ?? "");
    this.metricsDir = path.join(this.workspaceDir, "COGNEXUS", "ANALYTICS", "data");
    this.config = { ...DEFAULT_CONFIG };
    this.metrics = new Map();
    this.snapshots = [];
    this.realtimeClients = new Map();
    
    this.ensureDirectories();
    this.initMetrics();
    this.loadHistoricalSnapshots();
  }
  
  private ensureDirectories(): void {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }
  
  private initMetrics(): void {
    // Initialize metric series
    const metricDefs = [
      // Cognition metrics
      { name: "context_tokens", unit: "tokens", agg: "avg", desc: "Context token count" },
      { name: "context_usage_percent", unit: "percent", agg: "avg", desc: "Context window usage %" },
      { name: "compaction_count", unit: "count", agg: "sum", desc: "Total compactions" },
      { name: "compaction_duration_ms", unit: "ms", agg: "avg", desc: "Compaction duration" },
      
      // Memory metrics
      { name: "working_set_size", unit: "chunks", agg: "avg", desc: "Working set chunk count" },
      { name: "episodic_size", unit: "entries", agg: "avg", desc: "Episodic memory entries" },
      { name: "semantic_size", unit: "chunks", agg: "avg", desc: "Semantic memory chunks" },
      { name: "importance_avg", unit: "score", agg: "avg", desc: "Average chunk importance" },
      { name: "retrieval_latency_ms", unit: "ms", agg: "avg", desc: "Memory retrieval latency" },
      
      // Task metrics
      { name: "tasks_active", unit: "count", agg: "max", desc: "Active tasks" },
      { name: "tasks_pending", unit: "count", agg: "max", desc: "Pending tasks" },
      { name: "tasks_completed", unit: "count", agg: "sum", desc: "Completed tasks" },
      { name: "tasks_failed", unit: "count", agg: "sum", desc: "Failed tasks" },
      { name: "task_duration_ms", unit: "ms", agg: "avg", desc: "Average task duration" },
      
      // Deliberation metrics
      { name: "deliberations_run", unit: "count", agg: "sum", desc: "Parallel thinking runs" },
      { name: "deliberation_consensus", unit: "score", agg: "avg", desc: "Average consensus score" },
      { name: "personas_active", unit: "count", agg: "avg", desc: "Active personas" },
      
      // Evolution metrics
      { name: "evolution_changes", unit: "count", agg: "sum", desc: "Identity changes applied" },
      { name: "evolution_pending", unit: "count", agg: "max", desc: "Pending changes" },
      { name: "performance_score", unit: "score", agg: "last", desc: "Performance score" },
      
      // System metrics
      { name: "uptime_seconds", unit: "seconds", agg: "last", desc: "Gateway uptime" },
      { name: "memory_usage_mb", unit: "MB", agg: "avg", desc: "Process memory usage" },
    ];
    
    for (const def of metricDefs) {
      this.metrics.set(def.name, {
        name: def.name,
        description: def.desc,
        unit: def.unit,
        points: [],
        aggregation: def.agg as MetricSeries["aggregation"],
      });
    }
  }
  
  private loadHistoricalSnapshots(): void {
    const snapshotsPath = path.join(this.metricsDir, "snapshots.jsonl");
    try {
      if (fs.existsSync(snapshotsPath)) {
        const content = fs.readFileSync(snapshotsPath, "utf-8");
        const lines = content.trim().split("\n");
        this.snapshots = lines.map(l => JSON.parse(l)).slice(-1000); // Keep last 1000
      }
    } catch (e) {
      this.snapshots = [];
    }
  }
  
  // ===========================================================================
  // Metric Recording
  // ===========================================================================
  
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    const series = this.metrics.get(name);
    if (!series) return;
    
    series.points.push({
      timestamp: Date.now(),
      value,
      labels,
    });
    
    // Trim old points
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    series.points = series.points.filter(p => p.timestamp > cutoff);
  }
  
  recordSessionMetrics(sessionId: string, data: {
    contextTokens?: number;
    contextWindow?: number;
    workingSetSize?: number;
    episodicSize?: number;
    semanticSize?: number;
    compactionCount?: number;
  }): void {
    if (data.contextTokens !== undefined) {
      this.recordMetric("context_tokens", data.contextTokens);
    }
    
    if (data.contextTokens !== undefined && data.contextWindow !== undefined) {
      const usage = (data.contextTokens / data.contextWindow) * 100;
      this.recordMetric("context_usage_percent", usage);
    }
    
    if (data.workingSetSize !== undefined) {
      this.recordMetric("working_set_size", data.workingSetSize);
    }
    
    if (data.episodicSize !== undefined) {
      this.recordMetric("episodic_size", data.episodicSize);
    }
    
    if (data.semanticSize !== undefined) {
      this.recordMetric("semantic_size", data.semanticSize);
    }
    
    if (data.compactionCount !== undefined) {
      this.recordMetric("compaction_count", data.compactionCount);
    }
  }
  
  recordTaskMetrics(data: {
    active?: number;
    pending?: number;
    completed?: number;
    failed?: number;
    durationMs?: number;
  }): void {
    if (data.active !== undefined) {
      this.recordMetric("tasks_active", data.active);
    }
    if (data.pending !== undefined) {
      this.recordMetric("tasks_pending", data.pending);
    }
    if (data.completed !== undefined) {
      this.recordMetric("tasks_completed", data.completed);
    }
    if (data.failed !== undefined) {
      this.recordMetric("tasks_failed", data.failed);
    }
    if (data.durationMs !== undefined) {
      this.recordMetric("task_duration_ms", data.durationMs);
    }
  }
  
  recordEvolutionMetrics(data: {
    changes?: number;
    pending?: number;
    score?: number;
  }): void {
    if (data.changes !== undefined) {
      this.recordMetric("evolution_changes", data.changes);
    }
    if (data.pending !== undefined) {
      this.recordMetric("evolution_pending", data.pending);
    }
    if (data.score !== undefined) {
      this.recordMetric("performance_score", data.score);
    }
  }
  
  // ===========================================================================
  // Aggregation
  // ===========================================================================
  
  getAggregated(name: string, windowMs?: number): {
    value: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const series = this.metrics.get(name);
    if (!series || series.points.length === 0) return null;
    
    const window = windowMs ?? this.config.aggregationWindowMs;
    const cutoff = Date.now() - window;
    const points = series.points.filter(p => p.timestamp > cutoff);
    
    if (points.length === 0) return null;
    
    const values = points.map(p => p.value);
    
    return {
      value: this.aggregate(values, series.aggregation),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }
  
  private aggregate(values: number[], method: string): number {
    if (values.length === 0) return 0;
    
    switch (method) {
      case "avg":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "sum":
        return values.reduce((a, b) => a + b, 0);
      case "max":
        return Math.max(...values);
      case "min":
        return Math.min(...values);
      case "last":
        return values[values.length - 1];
      default:
        return values[values.length - 1];
    }
  }
  
  // ===========================================================================
  // Snapshot Generation
  // ===========================================================================
  
  generateSnapshot(sessionId: string): AnalyticsSnapshot {
    const contextTokens = this.getAggregated("context_tokens", 60000);
    const contextWindow = this.api.config.agents?.defaults?.model;
    
    const snapshot: AnalyticsSnapshot = {
      timestamp: Date.now(),
      sessionId,
      memory: {
        workingSetSize: this.getAggregated("working_set_size", 60000)?.value ?? 0,
        episodicSize: this.getAggregated("episodic_size", 60000)?.value ?? 0,
        semanticSize: this.getAggregated("semantic_size", 60000)?.value ?? 0,
        importanceDistribution: this.getImportanceDistribution(),
      },
      cognition: {
        contextTokens: contextTokens?.value ?? 0,
        contextUsagePercent: contextTokens?.value
          ? (contextTokens.value / 204800) * 100
          : 0,
        compactionCount: this.getAggregated("compaction_count", 3600000)?.value ?? 0,
        lastCompactionAt: this.getLastCompactionTime(),
      },
      tasks: {
        active: this.getAggregated("tasks_active", 60000)?.value ?? 0,
        pending: this.getAggregated("tasks_pending", 60000)?.value ?? 0,
        completed: this.getAggregated("tasks_completed", 3600000)?.value ?? 0,
        failed: this.getAggregated("tasks_failed", 3600000)?.value ?? 0,
        avgDurationMs: this.getAggregated("task_duration_ms", 60000)?.value ?? 0,
      },
      evolution: {
        changesApplied: this.getAggregated("evolution_changes", 86400000)?.value ?? 0,
        pendingChanges: this.getAggregated("evolution_pending", 60000)?.value ?? 0,
        performanceScore: this.getAggregated("performance_score", 3600000)?.value ?? 0.5,
        trend: this.calculateTrend(),
      },
    };
    
    this.snapshots.push(snapshot);
    
    // Trim old snapshots
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    this.snapshots = this.snapshots.filter(s => s.timestamp > cutoff);
    
    // Save snapshots
    this.saveSnapshots();
    
    // Broadcast to realtime clients
    this.broadcastSnapshot(snapshot);
    
    return snapshot;
  }
  
  private getImportanceDistribution(): number[] {
    // Generate histogram of importance scores
    const buckets = new Array(10).fill(0);
    const series = this.metrics.get("importance_avg");
    if (series) {
      for (const point of series.points.slice(-100)) {
        const bucket = Math.min(9, Math.floor(point.value * 10));
        buckets[bucket]++;
      }
    }
    return buckets;
  }
  
  private getLastCompactionTime(): number | null {
    const series = this.metrics.get("compaction_count");
    if (!series || series.points.length === 0) return null;
    return series.points[series.points.length - 1].timestamp;
  }
  
  private calculateTrend(): "improving" | "stable" | "declining" {
    const score = this.getAggregated("performance_score", 3600000);
    const prevScore = this.getHistoricalScore(3600000, 7200000);
    
    if (!score || !prevScore) return "stable";
    
    const diff = score.value - prevScore;
    if (diff > 0.05) return "improving";
    if (diff < -0.05) return "declining";
    return "stable";
  }
  
  private getHistoricalScore(windowMs: number, offsetMs: number): number | null {
    const cutoff = Date.now() - windowMs - offsetMs;
    const series = this.metrics.get("performance_score");
    if (!series) return null;
    
    const points = series.points.filter(p => p.timestamp > cutoff && p.timestamp < Date.now() - offsetMs);
    if (points.length === 0) return null;
    
    return this.aggregate(points.map(p => p.value), "avg");
  }
  
  private saveSnapshots(): void {
    const snapshotsPath = path.join(this.metricsDir, "snapshots.jsonl");
    const content = this.snapshots.map(s => JSON.stringify(s)).join("\n");
    fs.writeFileSync(snapshotsPath, content);
  }
  
  // ===========================================================================
  // Realtime
  // ===========================================================================
  
  subscribe(clientId: string, callback: (snapshot: AnalyticsSnapshot) => void): void {
    this.realtimeClients.set(clientId, callback);
  }
  
  unsubscribe(clientId: string): void {
    this.realtimeClients.delete(clientId);
  }
  
  private broadcastSnapshot(snapshot: AnalyticsSnapshot): void {
    for (const callback of this.realtimeClients.values()) {
      try {
        callback(snapshot);
      } catch (e) {
        // Client disconnected
      }
    }
  }
  
  // ===========================================================================
  // API Endpoints
  // ===========================================================================
  
  getSnapshot(sessionId: string): AnalyticsSnapshot {
    return this.generateSnapshot(sessionId);
  }
  
  getMetrics(names?: string[], windowMs?: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const series = names ?? Array.from(this.metrics.keys());
    
    for (const name of series) {
      const agg = this.getAggregated(name, windowMs);
      if (agg) {
        result[name] = agg;
      }
    }
    
    return result;
  }
  
  getHistoricalData(
    metricName: string,
    startTime: number,
    endTime: number
  ): MetricPoint[] {
    const series = this.metrics.get(metricName);
    if (!series) return [];
    
    return series.points.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
  }
  
  getDashboards(): {
    cognition: Record<string, unknown>;
    memory: Record<string, unknown>;
    tasks: Record<string, unknown>;
    evolution: Record<string, unknown>;
  } {
    return {
      cognition: {
        contextUsage: this.getAggregated("context_usage_percent", 60000),
        contextTokens: this.getAggregated("context_tokens", 60000),
        compactions: this.getAggregated("compaction_count", 3600000),
        compactionDuration: this.getAggregated("compaction_duration_ms", 3600000),
      },
      memory: {
        workingSet: this.getAggregated("working_set_size", 60000),
        episodic: this.getAggregated("episodic_size", 60000),
        semantic: this.getAggregated("semantic_size", 60000),
        importance: this.getAggregated("importance_avg", 60000),
      },
      tasks: {
        active: this.getAggregated("tasks_active", 60000),
        completed: this.getAggregated("tasks_completed", 3600000),
        failed: this.getAggregated("tasks_failed", 3600000),
        avgDuration: this.getAggregated("task_duration_ms", 60000),
      },
      evolution: {
        changes: this.getAggregated("evolution_changes", 86400000),
        pending: this.getAggregated("evolution_pending", 60000),
        score: this.getAggregated("performance_score", 3600000),
        trend: this.calculateTrend(),
      },
    };
  }
  
  // ===========================================================================
  // Cleanup
  // ===========================================================================
  
  dispose(): void {
    if (this.server) {
      this.server.close();
    }
    this.saveSnapshots();
  }
}

// ============================================================================
// Plugin Registration
// ============================================================================

export default function registerAnalytics(api: OpenClawPluginApi): void {
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");
  
  const analytics = new AnalyticsCollector(api, resolvedWorkspace);
  
  // Register analytics endpoints
  api.registerHttpRoute({
    path: "/cognexus/analytics/snapshot",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const sessionId = url.searchParams.get("sessionId") ?? "default";
      
      const snapshot = analytics.getSnapshot(sessionId);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(snapshot));
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/analytics/metrics",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const names = url.searchParams.get("names")?.split(",");
      const windowMs = parseInt(url.searchParams.get("window") ?? "60000");
      
      const metrics = analytics.getMetrics(names, windowMs);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(metrics));
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/analytics/dashboard",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => {
      const dashboard = analytics.getDashboards();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(dashboard));
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/analytics/history",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const metric = url.searchParams.get("metric") ?? "";
      const start = parseInt(url.searchParams.get("start") ?? String(Date.now() - 3600000));
      const end = parseInt(url.searchParams.get("end") ?? String(Date.now()));
      
      const history = analytics.getHistoricalData(metric, start, end);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(history));
      return true;
    },
  });
  
  api.runtime?.logger?.info?.("Analytics collector registered");
}
