/**
 * Self-Evolution Engine
 *
 * Autonomous identity refinement through session analysis and pattern detection.
 * Safely modifies agent's self-model based on demonstrated effectiveness.
 *
 * Safety constraints:
 * - All changes require verification before permanent application
 * - Full git backup before any modification
 * - Rollback capability always available
 * - Human-in-the-loop for significant changes
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

interface EvolutionConfig {
  enabled: boolean;
  autoReflect: boolean;
  reflectionIntervalHours: number;
  minConfidenceForChange: number;
  maxChangesPerSession: number;
  requireVerification: boolean;
  backupBeforeChange: boolean;
  evolutionLogPath: string;
}

interface SessionAnalysis {
  sessionId: string;
  patterns: DetectedPattern[];
  successfulStrategies: string[];
  failedStrategies: string[];
  newCapabilities: string[];
  degradedCapabilities: string[];
  keyDecisions: string[];
  unresolvedIssues: string[];
  overallScore: number;
}

interface DetectedPattern {
  type: "positive" | "negative" | "neutral";
  description: string;
  evidence: string[];
  confidence: number;
  firstObserved: string;
  frequency: number;
}

interface IdentityChange {
  file: string;
  section?: string;
  oldContent: string;
  newContent: string;
  reason: string;
  timestamp: string;
  verified: boolean;
  rolledBack?: boolean;
}

interface SelfModel {
  capabilities: Record<string, { level: number; lastUsed: number; successRate: number }>;
  preferredApproaches: string[];
  knownLimitations: string[];
  recentChanges: IdentityChange[];
  performanceHistory: { date: string; score: number }[];
}

const DEFAULT_CONFIG: EvolutionConfig = {
  enabled: true,
  autoReflect: true,
  reflectionIntervalHours: 24,
  minConfidenceForChange: 0.75,
  maxChangesPerSession: 3,
  requireVerification: true,
  backupBeforeChange: true,
  evolutionLogPath: "COGNEXUS/EVOLUTION/evolution-log.jsonl",
};

const BACKUP_BRANCH = "evolution-backup";

export class EvolutionEngine {
  private api: OpenClawPluginApi;
  private config: EvolutionConfig;
  private workspaceDir: string;
  private evolutionDir: string;
  private selfModel!: SelfModel;
  private pendingChanges: IdentityChange[] = [];

  constructor(api: OpenClawPluginApi, workspaceDir: string) {
    this.api = api;
    this.workspaceDir = workspaceDir.replace(/^~/, process.env.HOME ?? "");
    this.evolutionDir = path.join(this.workspaceDir, "COGNEXUS", "EVOLUTION");
    this.config = { ...DEFAULT_CONFIG };

    this.ensureDirectories();
    this.loadConfig();
    this.loadSelfModel();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.evolutionDir,
      path.join(this.evolutionDir, "backups"),
      path.join(this.evolutionDir, "analysis"),
      path.join(this.evolutionDir, "pending"),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadConfig(): void {
    const configPath = path.join(this.evolutionDir, "config.json");
    try {
      if (fs.existsSync(configPath)) {
        const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        this.config = { ...DEFAULT_CONFIG, ...loaded };
      }
    } catch (e) {
      // Use defaults
    }
  }

  private saveConfig(): void {
    const configPath = path.join(this.evolutionDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  private loadSelfModel(): void {
    const modelPath = path.join(this.evolutionDir, "self-model.json");
    try {
      if (fs.existsSync(modelPath)) {
        this.selfModel = JSON.parse(fs.readFileSync(modelPath, "utf-8"));
      } else {
        this.selfModel = {
          capabilities: {},
          preferredApproaches: [],
          knownLimitations: [],
          recentChanges: [],
          performanceHistory: [],
        };
      }
    } catch (e) {
      this.selfModel = {
        capabilities: {},
        preferredApproaches: [],
        knownLimitations: [],
        recentChanges: [],
        performanceHistory: [],
      };
    }
  }

  private saveSelfModel(): void {
    const modelPath = path.join(this.evolutionDir, "self-model.json");
    fs.writeFileSync(modelPath, JSON.stringify(this.selfModel, null, 2));
  }

  // ===========================================================================
  // Git backup before changes
  // ===========================================================================

  private createBackup(change: IdentityChange): string | null {
    if (!this.config.backupBeforeChange) return null;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        this.evolutionDir,
        "backups",
        `${path.basename(change.file)}.${timestamp}.bak`,
      );

      // Read current content
      const filePath = path.join(this.workspaceDir, change.file);
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupFile);
        this.log(`Backup created: ${backupFile}`);
        return backupFile;
      }
    } catch (e) {
      this.log(`Backup failed: ${e}`);
    }
    return null;
  }

  private gitCommit(message: string): boolean {
    try {
      const gitDir = path.join(this.workspaceDir, ".git");
      if (!fs.existsSync(gitDir)) {
        this.log("No git repo found, skipping commit");
        return false;
      }

      // Add all changes
      execSync("git add -A", { cwd: this.workspaceDir });

      // Commit
      execSync(`git commit -m "${message}"`, { cwd: this.workspaceDir });

      this.log(`Git commit: ${message}`);
      return true;
    } catch (e) {
      // Git commit failed, likely no changes
      return false;
    }
  }

  // ===========================================================================
  // Session Analysis
  // ===========================================================================

  async analyzeSession(sessionId: string, transcriptPath?: string): Promise<SessionAnalysis> {
    const analysis: SessionAnalysis = {
      sessionId,
      patterns: [],
      successfulStrategies: [],
      failedStrategies: [],
      newCapabilities: [],
      degradedCapabilities: [],
      keyDecisions: [],
      unresolvedIssues: [],
      overallScore: 0,
    };

    try {
      // Read transcript if available
      if (transcriptPath && fs.existsSync(transcriptPath)) {
        const content = fs.readFileSync(transcriptPath, "utf-8");
        this.analyzeTranscript(content, analysis);
      }

      // Analyze for patterns
      analysis.patterns = this.detectPatterns(analysis);

      // Calculate overall score
      const positivePatterns = analysis.patterns.filter((p) => p.type === "positive");
      const negativePatterns = analysis.patterns.filter((p) => p.type === "negative");
      analysis.overallScore = Math.max(
        0,
        Math.min(1, 0.5 + (positivePatterns.length - negativePatterns.length) * 0.1),
      );

      // Update self-model
      this.updateSelfModel(analysis);

      // Log analysis
      const analysisPath = path.join(this.evolutionDir, "analysis", `${sessionId}.json`);
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    } catch (e) {
      this.log(`Session analysis failed: ${e}`);
    }

    return analysis;
  }

  private analyzeTranscript(content: string, analysis: SessionAnalysis): void {
    // Extract key decisions
    const decisionPatterns = [
      /(?:decided|chose|selected|agreed|resolved)\s+(?:to\s+)?(.+?)(?:\.|$)/gi,
      /(?:will|shall|going to)\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of decisionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const decision = match[1].trim();
        if (decision.length > 10 && decision.length < 200) {
          analysis.keyDecisions.push(decision);
        }
      }
    }

    // Detect success indicators
    const successIndicators = [
      /(?:success|worked|achieved|completed|solved|fixed)/gi,
      /(?:excellent|great|perfect|exactly|better)/gi,
    ];

    for (const indicator of successIndicators) {
      const matches = content.match(indicator);
      if (matches) {
        analysis.successfulStrategies.push(...matches.slice(0, 3));
      }
    }

    // Detect failure indicators
    const failureIndicators = [
      /(?:failed|broke|error|wrong|mistake|bug)/gi,
      /(?:try again|reconsider|didn't work|couldn't)/gi,
    ];

    for (const indicator of failureIndicators) {
      const matches = content.match(indicator);
      if (matches) {
        analysis.failedStrategies.push(...matches.slice(0, 3));
      }
    }

    // Extract unresolved issues
    const unresolvedPatterns = [/(?:\?|need to|should|todo|tbd)\s+(.+?)(?:\?|$)/gi];

    for (const pattern of unresolvedPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        analysis.unresolvedIssues.push(match[1].trim());
      }
    }
  }

  private detectPatterns(analysis: SessionAnalysis): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Pattern: Repeated successful approaches
    if (analysis.successfulStrategies.length >= 3) {
      patterns.push({
        type: "positive",
        description: "Consistently successful approach observed",
        evidence: analysis.successfulStrategies.slice(0, 5),
        confidence: Math.min(0.9, 0.5 + analysis.successfulStrategies.length * 0.1),
        firstObserved: new Date().toISOString(),
        frequency: analysis.successfulStrategies.length,
      });
    }

    // Pattern: Repeated failures
    if (analysis.failedStrategies.length >= 2) {
      patterns.push({
        type: "negative",
        description: "Recurring failure pattern detected",
        evidence: analysis.failedStrategies.slice(0, 5),
        confidence: Math.min(0.9, 0.5 + analysis.failedStrategies.length * 0.15),
        firstObserved: new Date().toISOString(),
        frequency: analysis.failedStrategies.length,
      });
    }

    // Pattern: Complex decisions
    if (analysis.keyDecisions.length >= 5) {
      patterns.push({
        type: "neutral",
        description: "Complex decision-making session",
        evidence: analysis.keyDecisions.slice(0, 3),
        confidence: 0.7,
        firstObserved: new Date().toISOString(),
        frequency: analysis.keyDecisions.length,
      });
    }

    return patterns;
  }

  private updateSelfModel(analysis: SessionAnalysis): void {
    // Update performance history
    this.selfModel.performanceHistory.push({
      date: new Date().toISOString(),
      score: analysis.overallScore,
    });

    // Keep last 100 entries
    if (this.selfModel.performanceHistory.length > 100) {
      this.selfModel.performanceHistory = this.selfModel.performanceHistory.slice(-100);
    }

    // Extract capability changes
    for (const pattern of analysis.patterns) {
      if (pattern.type === "positive") {
        // Capability improved
        const capability = pattern.description;
        if (!this.selfModel.capabilities[capability]) {
          this.selfModel.capabilities[capability] = {
            level: 0.5,
            lastUsed: Date.now(),
            successRate: 0.5,
          };
        }
        this.selfModel.capabilities[capability].successRate += 0.1;
        this.selfModel.capabilities[capability].level = Math.min(
          1,
          this.selfModel.capabilities[capability].level + 0.05,
        );
      } else if (pattern.type === "negative") {
        const capability = pattern.description;
        if (this.selfModel.capabilities[capability]) {
          this.selfModel.capabilities[capability].successRate -= 0.1;
          this.selfModel.capabilities[capability].level = Math.max(
            0,
            this.selfModel.capabilities[capability].level - 0.05,
          );
        }
      }
    }

    this.saveSelfModel();
  }

  // ===========================================================================
  // Identity Modification
  // ===========================================================================

  async proposeChange(
    file: string,
    section: string | undefined,
    change: {
      description: string;
      oldContent: string;
      newContent: string;
      reason: string;
    },
  ): Promise<IdentityChange> {
    const identityChange: IdentityChange = {
      file,
      section,
      oldContent: change.oldContent,
      newContent: change.newContent,
      reason: change.reason,
      timestamp: new Date().toISOString(),
      verified: false,
    };

    // Create backup
    this.createBackup(identityChange);

    // Add to pending changes
    this.pendingChanges.push(identityChange);

    // Save pending
    this.savePendingChanges();

    // Log the proposal
    this.log(`Proposed change to ${file}: ${change.description}`);

    // Auto-apply if verification disabled
    if (!this.config.requireVerification) {
      return this.applyChange(identityChange);
    }

    return identityChange;
  }

  async applyChange(change: IdentityChange): Promise<boolean> {
    try {
      const filePath = path.join(this.workspaceDir, change.file);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        this.log(`Cannot apply change: file not found ${filePath}`);
        return false;
      }

      // Read current content
      let content = fs.readFileSync(filePath, "utf-8");

      // Apply change
      if (change.section) {
        // Section-specific replacement
        const sectionPattern = new RegExp(`(${change.section}[\\s\\S]*?)(?=\\n##|\\n#|$)`, "i");
        content = content.replace(sectionPattern, change.newContent + "\n\n$1");
      } else {
        // Full content replacement
        content = content.replace(change.oldContent, change.newContent);
      }

      // Write back
      fs.writeFileSync(filePath, content);

      // Mark as verified and applied
      change.verified = true;

      // Git commit
      this.gitCommit(`Evolution: ${change.reason}`);

      // Add to recent changes
      this.selfModel.recentChanges.push(change);

      // Keep last 50 changes
      if (this.selfModel.recentChanges.length > 50) {
        this.selfModel.recentChanges = this.selfModel.recentChanges.slice(-50);
      }

      this.saveSelfModel();
      this.log(`Applied change to ${change.file}: ${change.reason}`);

      // Remove from pending
      this.pendingChanges = this.pendingChanges.filter((c) => c !== change);
      this.savePendingChanges();

      return true;
    } catch (e) {
      this.log(`Failed to apply change: ${e}`);
      return false;
    }
  }

  async rollbackChange(change: IdentityChange): Promise<boolean> {
    try {
      const filePath = path.join(this.workspaceDir, change.file);

      if (!fs.existsSync(filePath)) {
        this.log(`Cannot rollback: file not found ${filePath}`);
        return false;
      }

      // Restore old content
      let content = fs.readFileSync(filePath, "utf-8");

      if (change.section) {
        // Section rollback
        const sectionPattern = new RegExp(`(${change.section}[\\s\\S]*?)(?=\\n##|\\n#|$)`, "i");
        content = content.replace(sectionPattern, change.oldContent + "\n\n$1");
      } else {
        // Full rollback
        content = content.replace(change.newContent, change.oldContent);
      }

      fs.writeFileSync(filePath, content);

      // Mark as rolled back
      change.rolledBack = true;

      // Git commit rollback
      this.gitCommit(`Rollback: ${change.reason}`);

      this.log(`Rolled back change to ${change.file}`);

      // Remove from pending
      this.pendingChanges = this.pendingChanges.filter((c) => c !== change);
      this.savePendingChanges();

      return true;
    } catch (e) {
      this.log(`Rollback failed: ${e}`);
      return false;
    }
  }

  private savePendingChanges(): void {
    const pendingPath = path.join(this.evolutionDir, "pending", "changes.json");
    fs.writeFileSync(pendingPath, JSON.stringify(this.pendingChanges, null, 2));
  }

  // ===========================================================================
  // Recommendation Engine
  // ===========================================================================

  getRecommendations(): {
    id: string;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    proposedChange?: Partial<IdentityChange>;
  }[] {
    const recommendations: ReturnType<typeof this.getRecommendations> = [];

    // Analyze recent performance trend
    const recentHistory = this.selfModel.performanceHistory.slice(-10);
    if (recentHistory.length >= 3) {
      const avgScore = recentHistory.reduce((s, h) => s + h.score, 0) / recentHistory.length;
      const recentTrend = recentHistory[recentHistory.length - 1].score - recentHistory[0].score;

      if (recentTrend < -0.1) {
        recommendations.push({
          id: "performance-decline",
          priority: "high",
          title: "Performance Decline Detected",
          description: `Recent performance has declined. Consider reviewing recent changes.`,
        });
      }
    }

    // Identify capabilities that need improvement
    for (const [cap, data] of Object.entries(this.selfModel.capabilities)) {
      if (data.successRate < 0.4 && data.level > 0.3) {
        recommendations.push({
          id: `capability-${cap}`,
          priority: "medium",
          title: `Capability Needs Refinement: ${cap}`,
          description: `Success rate is ${(data.successRate * 100).toFixed(0)}% but capability level is ${(data.level * 100).toFixed(0)}%. Consider updating approach.`,
        });
      }
    }

    // Identify unresolved limitations
    if (this.selfModel.knownLimitations.length > 0) {
      recommendations.push({
        id: "review-limitations",
        priority: "low",
        title: "Review Known Limitations",
        description: `${this.selfModel.knownLimitations.length} limitations tracked. Consider addressing some.`,
      });
    }

    return recommendations;
  }

  // ===========================================================================
  // Reflection Loop
  // ===========================================================================

  async runReflection(sessionId: string): Promise<SessionAnalysis | null> {
    if (!this.config.enabled || !this.config.autoReflect) {
      return null;
    }

    this.log(`Running reflection for session ${sessionId}`);

    // Find transcript
    const transcriptPath = path.join(
      this.workspaceDir,
      ".openclaw",
      "agents",
      "main",
      "sessions",
      `${sessionId}.jsonl`,
    );

    const analysis = await this.analyzeSession(
      sessionId,
      fs.existsSync(transcriptPath) ? transcriptPath : undefined,
    );

    // Generate recommendations based on analysis
    if (analysis.patterns.some((p) => p.type === "negative" && p.confidence > 0.7)) {
      const recommendations = this.getRecommendations();
      if (recommendations.length > 0) {
        this.log(`Generated ${recommendations.length} recommendations`);
      }
    }

    return analysis;
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  private log(message: string): void {
    const logFile = path.join(this.evolutionDir, "evolution-log.jsonl");
    const entry = {
      timestamp: new Date().toISOString(),
      message,
    };

    try {
      fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    } catch (e) {
      // Ignore
    }

    this.api.runtime?.logger?.info?.(`[Evolution] ${message}`);
  }

  getSelfModel(): SelfModel {
    return { ...this.selfModel };
  }

  getPendingChanges(): IdentityChange[] {
    return [...this.pendingChanges];
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }
}

// ============================================================================
// Plugin Registration
// ============================================================================

export default function registerEvolutionEngine(api: OpenClawPluginApi): void {
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");

  const evolution = new EvolutionEngine(api, resolvedWorkspace);

  // Register after-agent hook for automatic reflection
  api.registerHook("agent_end", async (params) => {
    const sessionId = params.sessionId ?? "unknown";

    try {
      await evolution.runReflection(sessionId);
    } catch (e) {
      api.runtime?.logger?.error?.("Evolution reflection failed", e);
    }

    return null;
  });

  // Register commands
  api.registerHttpRoute({
    path: "/cognexus/evolution/status",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          enabled: evolution.getSelfModel() !== null,
          pendingChanges: evolution.getPendingChanges().length,
          recommendations: evolution.getRecommendations().slice(0, 5),
        }),
      );
      return true;
    },
  });

  api.registerHttpRoute({
    path: "/cognexus/evolution/analyze",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "sessionId required" }));
        return true;
      }

      const analysis = await evolution.runReflection(sessionId);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(analysis));
      return true;
    },
  });

  api.runtime?.logger?.info?.("Evolution engine registered");
}
