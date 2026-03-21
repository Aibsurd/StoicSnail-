/**
 * Task Flow Executor
 * 
 * DAG-based workflow decomposition and parallel execution.
 * Breaks complex tasks into dependency graphs, executes in parallel where possible,
 * aggregates results, and handles failures gracefully.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface Task {
  id: string;
  type: TaskType;
  description: string;
  input: Record<string, unknown>;
  dependsOn: string[];
  priority: number;
  timeoutMs: number;
  retryCount: number;
  maxRetries: number;
  agent?: string;
  metadata?: Record<string, unknown>;
}

export type TaskType = 
  | "analyze"
  | "research"
  | "code"
  | "test"
  | "review"
  | "document"
  | "synthesize"
  | "delegate"
  | "wait"
  | "transform";

export interface TaskResult {
  taskId: string;
  status: "pending" | "running" | "completed" | "failed" | "blocked";
  output?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  attempts: number;
}

export interface FlowGraph {
  id: string;
  rootTaskId: string;
  tasks: Map<string, Task>;
  results: Map<string, TaskResult>;
  createdAt: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  metadata?: Record<string, unknown>;
}

export interface FlowConfig {
  maxParallelTasks: number;
  maxConcurrentAgents: number;
  defaultTimeoutMs: number;
  defaultRetries: number;
  enableHumanInTheLoop: boolean;
  humanTimeoutMs: number;
  checkpointIntervalMs: number;
}

const DEFAULT_CONFIG: FlowConfig = {
  maxParallelTasks: 5,
  maxConcurrentAgents: 3,
  defaultTimeoutMs: 300000, // 5 minutes
  defaultRetries: 2,
  enableHumanInTheLoop: false,
  humanTimeoutMs: 600000, // 10 minutes
  checkpointIntervalMs: 30000, // 30 seconds
};

// ============================================================================
// Flow Executor
// ============================================================================

export class FlowExecutor {
  private api: OpenClawPluginApi;
  private config: FlowConfig;
  private workspaceDir: string;
  private flowsDir: string;
  private activeFlows: Map<string, FlowGraph>;
  private taskHandlers: Map<TaskType, TaskHandler>;
  private checkpoints: Map<string, unknown>;
  
  constructor(api: OpenClawPluginApi, workspaceDir: string) {
    this.api = api;
    this.workspaceDir = workspaceDir.replace(/^~/, process.env.HOME ?? "");
    this.flowsDir = path.join(this.workspaceDir, "COGNEXUS", "FLOW", "flows");
    this.config = { ...DEFAULT_CONFIG };
    this.activeFlows = new Map();
    this.checkpoints = new Map();
    this.taskHandlers = new Map();
    
    this.ensureDirectories();
    this.registerDefaultHandlers();
  }
  
  private ensureDirectories(): void {
    if (!fs.existsSync(this.flowsDir)) {
      fs.mkdirSync(this.flowsDir, { recursive: true });
    }
  }
  
  private registerDefaultHandlers(): void {
    // Register built-in task handlers
    this.registerHandler("analyze", this.handleAnalyze.bind(this));
    this.registerHandler("research", this.handleResearch.bind(this));
    this.registerHandler("code", this.handleCode.bind(this));
    this.registerHandler("test", this.handleTest.bind(this));
    this.registerHandler("review", this.handleReview.bind(this));
    this.registerHandler("document", this.handleDocument.bind(this));
    this.registerHandler("synthesize", this.handleSynthesize.bind(this));
    this.registerHandler("delegate", this.handleDelegate.bind(this));
    this.registerHandler("wait", this.handleWait.bind(this));
    this.registerHandler("transform", this.handleTransform.bind(this));
  }
  
  // ===========================================================================
  // Public API
  // ===========================================================================
  
  registerHandler(type: TaskType, handler: TaskHandler): void {
    this.taskHandlers.set(type, handler);
  }
  
  async createFlow(
    description: string,
    taskDefinitions: Omit<Task, "id">[]
  ): Promise<FlowGraph> {
    const flowId = this.generateId();
    
    // Create tasks with IDs
    const tasks = new Map<string, Task>();
    const taskIdMap = new Map<number, string>();
    
    taskDefinitions.forEach((def, index) => {
      const taskId = def.id || `${flowId}-task-${index}`;
      taskIdMap.set(index, taskId);
      
      // Fix up dependencies with actual IDs
      const dependsOn = def.dependsOn.map(depIdx => {
        if (typeof depIdx === "string") return depIdx;
        return taskIdMap.get(depIdx) || `unknown-${depIdx}`;
      });
      
      const task: Task = {
        ...def,
        id: taskId,
        dependsOn,
        timeoutMs: def.timeoutMs || this.config.defaultTimeoutMs,
        maxRetries: def.maxRetries ?? this.config.defaultRetries,
        retryCount: 0,
      };
      
      tasks.set(taskId, task);
    });
    
    // Find root task (task with no dependencies)
    let rootTaskId = flowId;
    for (const [taskId, task] of tasks) {
      if (task.dependsOn.length === 0) {
        rootTaskId = taskId;
        break;
      }
    }
    
    const flow: FlowGraph = {
      id: flowId,
      rootTaskId,
      tasks,
      results: new Map(),
      createdAt: Date.now(),
      status: "pending",
    };
    
    // Initialize results
    for (const taskId of tasks.keys()) {
      flow.results.set(taskId, {
        taskId,
        status: "pending",
        attempts: 0,
      });
    }
    
    this.activeFlows.set(flowId, flow);
    this.saveFlow(flow);
    
    this.api.runtime?.logger?.info?.(`Flow ${flowId} created with ${tasks.size} tasks`);
    
    return flow;
  }
  
  async executeFlow(flowId: string): Promise<FlowGraph> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }
    
    flow.status = "running";
    this.saveFlow(flow);
    
    try {
      await this.executeFlowInternal(flow);
      
      // Determine final status
      const results = Array.from(flow.results.values());
      const hasFailed = results.some(r => r.status === "failed");
      const allCompleted = results.every(r => r.status === "completed");
      
      flow.status = hasFailed ? "failed" : allCompleted ? "completed" : "running";
      
    } catch (error) {
      flow.status = "failed";
      this.api.runtime?.logger?.error?.(`Flow ${flowId} failed`, error);
    }
    
    this.saveFlow(flow);
    return flow;
  }
  
  async executeFlowInternal(flow: FlowGraph): Promise<void> {
    const runningTasks = new Set<string>();
    const completedTasks = new Set<string>();
    
    while (true) {
      // Find tasks ready to execute
      const readyTasks = this.findReadyTasks(flow, completedTasks, runningTasks);
      
      // Execute ready tasks (respecting parallelism limit)
      const slots = this.config.maxParallelTasks - runningTasks.size;
      const toExecute = readyTasks.slice(0, slots);
      
      for (const task of toExecute) {
        runningTasks.add(task.id);
        this.executeTask(flow, task.id).then(result => {
          flow.results.set(task.id, result);
          runningTasks.delete(task.id);
          completedTasks.add(task.id);
          this.saveFlow(flow);
        }).catch(error => {
          this.api.runtime?.logger?.error?.(`Task ${task.id} threw`, error);
          runningTasks.delete(task.id);
        });
      }
      
      // Check completion
      if (runningTasks.size === 0 && readyTasks.length === 0) {
        // Check if blocked tasks have unmet dependencies
        const pendingTasks = Array.from(flow.results.values())
          .filter(r => r.status === "pending");
        
        if (pendingTasks.length > 0) {
          // Check for circular dependencies or missing deps
          const blocked = this.detectBlockedTasks(flow, completedTasks);
          if (blocked.length > 0) {
            this.api.runtime?.logger?.warn?.(
              `Flow ${flow.id} has blocked tasks: ${blocked.join(", ")}`
            );
            break;
          }
        }
        break;
      }
      
      // Wait before next iteration
      await this.sleep(100);
    }
  }
  
  private findReadyTasks(
    flow: FlowGraph,
    completed: Set<string>,
    running: Set<string>
  ): Task[] {
    const ready: Task[] = [];
    
    for (const [taskId, task] of flow.tasks) {
      const result = flow.results.get(taskId)!;
      
      // Skip if not pending
      if (result.status !== "pending") continue;
      
      // Skip if already running
      if (running.has(taskId)) continue;
      
      // Check if all dependencies are completed
      const depsCompleted = task.dependsOn.every(depId => completed.has(depId));
      
      if (depsCompleted) {
        ready.push(task);
      }
    }
    
    // Sort by priority (higher first)
    ready.sort((a, b) => b.priority - a.priority);
    
    return ready;
  }
  
  private detectBlockedTasks(flow: FlowGraph, completed: Set<string>): string[] {
    const blocked: string[] = [];
    
    for (const [taskId, result] of flow.results) {
      if (result.status !== "pending") continue;
      
      const task = flow.tasks.get(taskId)!;
      const unmetDeps = task.dependsOn.filter(depId => !completed.has(depId));
      
      if (unmetDeps.length > 0) {
        blocked.push(`${taskId} (waiting for: ${unmetDeps.join(", ")})`);
      }
    }
    
    return blocked;
  }
  
  private async executeTask(flow: FlowGraph, taskId: string): Promise<TaskResult> {
    const task = flow.tasks.get(taskId)!;
    const result: TaskResult = {
      taskId,
      status: "running",
      startedAt: Date.now(),
      attempts: 1,
    };
    
    flow.results.set(taskId, result);
    this.saveFlow(flow);
    
    try {
      // Get dependency results
      const depsOutput = new Map<string, unknown>();
      for (const depId of task.dependsOn) {
        const depResult = flow.results.get(depId);
        if (depResult?.output) {
          depsOutput.set(depId, depResult.output);
        }
      }
      
      // Get handler
      const handler = this.taskHandlers.get(task.type);
      if (!handler) {
        throw new Error(`No handler for task type: ${task.type}`);
      }
      
      // Execute with timeout
      const output = await this.withTimeout(
        handler({
          task,
          input: task.input,
          dependencies: depsOutput,
          flow,
          api: this.api,
        }),
        task.timeoutMs
      );
      
      result.status = "completed";
      result.output = output;
      result.completedAt = Date.now();
      result.durationMs = result.completedAt - (result.startedAt ?? 0);
      
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = Date.now();
      result.durationMs = result.completedAt - (result.startedAt ?? 0);
      
      // Retry if allowed
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        result.status = "pending";
        result.attempts++;
        this.api.runtime?.logger?.info?.(
          `Task ${taskId} failed, retry ${task.retryCount}/${task.maxRetries}`
        );
      }
    }
    
    return result;
  }
  
  getFlowStatus(flowId: string): FlowGraph | undefined {
    return this.activeFlows.get(flowId);
  }
  
  cancelFlow(flowId: string): boolean {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return false;
    
    flow.status = "cancelled";
    
    // Cancel pending tasks
    for (const [taskId, result] of flow.results) {
      if (result.status === "pending" || result.status === "running") {
        result.status = "failed";
        result.error = "Flow cancelled";
        result.completedAt = Date.now();
      }
    }
    
    this.saveFlow(flow);
    return true;
  }
  
  // ===========================================================================
  // Task Handlers
  // ===========================================================================
  
  private async handleAnalyze(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    const content = task.input.content as string;
    const focus = task.input.focus as string[] | undefined;
    
    // Run analysis subagents in parallel
    const analyses = await Promise.all([
      this.subagentTask("Analyze structure and patterns", content),
      this.subagentTask("Identify key themes and concepts", content),
      this.subagentTask("Detect potential issues or risks", content),
    ]);
    
    return {
      structure: analyses[0],
      themes: analyses[1],
      risks: analyses[2],
      summary: `Analysis of ${content.length} characters`,
    };
  }
  
  private async handleResearch(params: TaskHandlerParams): Promise<unknown> {
    const { task } = params;
    const query = task.input.query as string;
    const sources = task.input.sources as string[] | undefined;
    
    // Use web search
    const searchResults = await this.api.runtime?.webSearch?.search({
      config: this.api.config,
      args: { query, count: sources?.length ?? 10 },
    });
    
    return {
      query,
      results: searchResults ?? [],
      timestamp: new Date().toISOString(),
    };
  }
  
  private async handleCode(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    const spec = task.input.spec as string;
    const language = task.input.language as string || "typescript";
    
    // Check for input from analyze task
    const analyzeResult = dependencies.get(
      Array.from(dependencies.keys()).find(k => k.includes("analyze")) || ""
    );
    
    // Generate code
    const codeResult = await this.subagentTask(
      `Write ${language} code for: ${spec}`,
      analyzeResult ? `Additional context: ${JSON.stringify(analyzeResult)}` : ""
    );
    
    return {
      language,
      spec,
      code: codeResult,
      generatedAt: new Date().toISOString(),
    };
  }
  
  private async handleTest(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    
    // Find code task result
    const codeResult = dependencies.get(
      Array.from(dependencies.keys()).find(k => k.includes("code")) || ""
    );
    
    if (!codeResult) {
      return { error: "No code to test" };
    }
    
    // Generate tests
    const testResult = await this.subagentTask(
      `Write tests for the following code:\n${JSON.stringify(codeResult)}`,
      ""
    );
    
    return {
      tests: testResult,
      code: codeResult,
    };
  }
  
  private async handleReview(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    
    const codeResult = dependencies.get(
      Array.from(dependencies.keys()).find(k => k.includes("code")) || ""
    );
    const testResult = dependencies.get(
      Array.from(dependencies.keys()).find(k => k.includes("test")) || ""
    );
    
    const reviewResult = await this.subagentTask(
      `Review this code and tests:\nCode:\n${JSON.stringify(codeResult)}\n\nTests:\n${JSON.stringify(testResult)}`,
      "Focus on: correctness, edge cases, security, performance"
    );
    
    return {
      review: reviewResult,
      issues: this.extractIssues(reviewResult),
    };
  }
  
  private async handleDocument(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    
    const codeResult = dependencies.get(
      Array.from(dependencies.keys()).find(k => k.includes("code")) || ""
    );
    
    const docResult = await this.subagentTask(
      `Generate documentation for:\n${JSON.stringify(codeResult)}`,
      "Include: overview, usage examples, API reference, architecture notes"
    );
    
    return {
      documentation: docResult,
    };
  }
  
  private async handleSynthesize(params: TaskHandlerParams): Promise<unknown> {
    const { dependencies } = params;
    
    // Aggregate all results
    const allResults = Object.fromEntries(dependencies);
    
    const synthesis = await this.subagentTask(
      "Synthesize the following results into a coherent summary:",
      JSON.stringify(allResults, null, 2)
    );
    
    return {
      synthesis,
      components: Object.keys(dependencies),
      timestamp: new Date().toISOString(),
    };
  }
  
  private async handleDelegate(params: TaskHandlerParams): Promise<unknown> {
    const { task } = params;
    const targetAgent = task.agent || "main";
    const message = task.input.message as string;
    
    // Delegate to another agent
    const result = await this.api.runtime?.subagent?.run({
      sessionKey: `flow-delegate-${Date.now()}`,
      message,
      deliver: false,
    });
    
    return {
      delegatedTo: targetAgent,
      result: result?.message ?? result,
    };
  }
  
  private async handleWait(params: TaskHandlerParams): Promise<unknown> {
    const { task } = params;
    const duration = task.input.durationMs as number || 1000;
    
    await this.sleep(duration);
    
    return { waited: duration };
  }
  
  private async handleTransform(params: TaskHandlerParams): Promise<unknown> {
    const { task, dependencies } = params;
    const transform = task.input.transform as string;
    
    const input = task.input.data || Object.fromEntries(dependencies);
    
    const result = await this.subagentTask(
      `Transform the following data using: ${transform}`,
      JSON.stringify(input, null, 2)
    );
    
    return {
      transform,
      input,
      output: result,
    };
  }
  
  // ===========================================================================
  // Helper Methods
  // ===========================================================================
  
  private async subagentTask(prompt: string, context: string): Promise<string> {
    try {
      const result = await this.api.runtime?.subagent?.run({
        sessionKey: `flow-task-${Date.now()}`,
        message: context ? `${prompt}\n\nContext:\n${context}` : prompt,
        deliver: false,
      });
      return result?.message ?? result?.text ?? "";
    } catch (error) {
      this.api.runtime?.logger?.error?.("Subagent task failed", error);
      return `Error: ${error}`;
    }
  }
  
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private generateId(): string {
    return crypto.randomBytes(8).toString("hex");
  }
  
  private extractIssues(text: string): string[] {
    const issues: string[] = [];
    const patterns = [
      /(?:issue|problem|bug|error|warning|concern)[:\s]+(.+?)(?:\n|$)/gi,
      /(?:should|must|need to)[:\s]+(.+?)(?:\n|$)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        issues.push(match[1].trim());
      }
    }
    
    return [...new Set(issues)].slice(0, 10);
  }
  
  private saveFlow(flow: FlowGraph): void {
    const flowPath = path.join(this.flowsDir, `${flow.id}.json`);
    const data = {
      ...flow,
      tasks: Array.from(flow.tasks.entries()),
      results: Array.from(flow.results.entries()),
    };
    fs.writeFileSync(flowPath, JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Task Handler Type
// ============================================================================

interface TaskHandlerParams {
  task: Task;
  input: Record<string, unknown>;
  dependencies: Map<string, unknown>;
  flow: FlowGraph;
  api: OpenClawPluginApi;
}

type TaskHandler = (params: TaskHandlerParams) => Promise<unknown>;

// ============================================================================
// Plugin Registration
// ============================================================================

export default function registerFlowExecutor(api: OpenClawPluginApi): void {
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");
  
  const executor = new FlowExecutor(api, resolvedWorkspace);
  
  // Register HTTP routes for flow management
  api.registerHttpRoute({
    path: "/cognexus/flow/create",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { description, tasks } = JSON.parse(body);
          const flow = await executor.createFlow(description, tasks);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ flowId: flow.id }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/flow/execute",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const flowId = url.searchParams.get("flowId");
      
      if (!flowId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "flowId required" }));
        return true;
      }
      
      const flow = await executor.executeFlow(flowId);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ flowId: flow.id, status: flow.status }));
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/flow/status",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const flowId = url.searchParams.get("flowId");
      
      if (!flowId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "flowId required" }));
        return true;
      }
      
      const flow = executor.getFlowStatus(flowId);
      if (!flow) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Flow not found" }));
        return true;
      }
      
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        id: flow.id,
        status: flow.status,
        tasks: Array.from(flow.results.entries()).map(([id, r]) => ({
          id,
          status: r.status,
          durationMs: r.durationMs,
          error: r.error,
        })),
      }));
      return true;
    },
  });
  
  api.registerHttpRoute({
    path: "/cognexus/flow/cancel",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const flowId = url.searchParams.get("flowId");
      
      if (!flowId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "flowId required" }));
        return true;
      }
      
      const cancelled = executor.cancelFlow(flowId);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ cancelled }));
      return true;
    },
  });
  
  api.runtime?.logger?.info?.("Flow executor registered");
}
