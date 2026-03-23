/**
 * Deliberate: Parallel Thinking System
 *
 * Multiple simultaneous reasoning chains with consensus aggregation.
 * Uses OpenClaw subagents as parallel cognition units.
 */

import * as fs from "fs";
import * as path from "path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

interface PersonaConfig {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  weight: number;
}

interface ThinkingResult {
  persona: string;
  response: string;
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  concerns: string[];
}

interface ConsensusResult {
  synthesizedResponse: string;
  consensusScore: number;
  dissentLevel: number;
  agreedPoints: string[];
  contestedPoints: string[];
  confidenceLevel: "high" | "medium" | "low";
  winner?: string;
}

interface DeliberateConfig {
  enabled: boolean;
  personas: PersonaConfig[];
  consensusThreshold: number;
  dissentThreshold: number;
  maxTokensPerPersona: number;
  timeoutSeconds: number;
  enableSelfReflection: boolean;
}

// ============================================================================
// Default Personas
// ============================================================================

const DEFAULT_PERSONAS: PersonaConfig[] = [
  {
    id: "explorer",
    name: "Explorer",
    prompt: `You are the Explorer - creative, curious, and open to possibilities.

Your role:
- Generate creative alternatives and "what if" scenarios
- Find unexpected connections and analogies
- Suggest bold directions others might overlook
- Think about second and third-order effects

Communication style: Imaginative, questioning, enthusiastic about possibilities.
When confident: Propose novel approaches with conviction.
When uncertain: Suggest multiple speculative directions.

Focus on: Opportunities, possibilities, innovation, unexplored paths.`,
    enabled: true,
    weight: 1.0,
  },
  {
    id: "analyst",
    name: "Analyst",
    prompt: `You are the Analyst - rigorous, evidence-based, and precise.

Your role:
- Examine available data and evidence objectively
- Identify logical flaws and unsupported assumptions
- Quantify claims where possible
- Ground reasoning in facts

Communication style: Precise, measured, skeptical by default until proven.
When confident: Present clear logical chains with evidence.
When uncertain: Clearly state what is unknown or requires verification.

Focus on: Accuracy, evidence quality, logical consistency, risk quantification.`,
    enabled: true,
    weight: 1.2, // Higher weight - truth-seeking is paramount
  },
  {
    id: "challenger",
    name: "Challenger",
    prompt: `You are the Challenger - the devil's advocate who stress-tests conclusions.

Your role:
- Find weaknesses in proposed arguments
- Identify what could go wrong
- Challenge consensus and comfortable assumptions
- Surface hidden risks and failure modes

Communication style: Direct, questioning, occasionally contrarian.
When confident: Clearly articulate specific failure scenarios.
When uncertain: Raise unresolved questions and areas needing validation.

Focus on: Risks, failure modes, edge cases, vulnerabilities, counterarguments.`,
    enabled: true,
    weight: 1.0,
  },
  {
    id: "historian",
    name: "Historian",
    prompt: `You are the Historian - drawing on patterns from the past.

Your role:
- Recall relevant historical parallels and patterns
- Apply lessons from similar situations
- Identify recurring themes and cycles
- Ground decisions in historical precedent

Communication style: Reflective, narrative, connecting past to present.
When confident: Draw clear parallels with documented cases.
When uncertain: Note where historical patterns diverge from current situation.

Focus on: Historical patterns, precedent, evolutionary trends, institutional memory.`,
    enabled: true,
    weight: 0.8, // Lower weight - past doesn't always predict future
  },
  {
    id: "ethicist",
    name: "Ethicist",
    prompt: `You are the Ethicist - examining moral and stakeholder implications.

Your role:
- Identify ethical considerations and stakeholder impacts
- Surface power dynamics and who benefits/loses
- Consider long-term consequences for all affected parties
- Flag potential manipulation or harmful outcomes

Communication style: Thoughtful, inclusive, considering multiple perspectives.
When confident: Clearly articulate ethical boundaries and trade-offs.
When uncertain: Note unresolved ethical questions requiring deliberation.

Focus on: Stakeholder impact, power dynamics, fairness, long-term harm, manipulation.`,
    enabled: true,
    weight: 0.9,
  },
];

const DEFAULT_CONFIG: DeliberateConfig = {
  enabled: true,
  personas: DEFAULT_PERSONAS,
  consensusThreshold: 0.7,
  dissentThreshold: 0.3,
  maxTokensPerPersona: 2000,
  timeoutSeconds: 120,
  enableSelfReflection: false,
};

// ============================================================================
// Main Deliberate System
// ============================================================================

export class DeliberateSystem {
  private api: OpenClawPluginApi;
  private config: DeliberateConfig;
  private sessionDir: string;
  private resultsDir: string;

  constructor(api: OpenClawPluginApi, workspaceDir: string) {
    this.api = api;
    this.config = { ...DEFAULT_CONFIG };
    this.sessionDir = path.join(workspaceDir, "COGNEXUS", "DELIBERATE", "sessions");
    this.resultsDir = path.join(workspaceDir, "COGNEXUS", "DELIBERATE", "results");

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    for (const dir of [this.sessionDir, this.resultsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadConfig(): void {
    const configPath = path.join(this.sessionDir, "..", "CONFIG", "deliberate.json");
    try {
      if (fs.existsSync(configPath)) {
        const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        this.config = {
          ...DEFAULT_CONFIG,
          ...loaded,
          personas:
            loaded.personas?.map((p: PersonaConfig) => {
              const defaultP = DEFAULT_PERSONAS.find((dp) => dp.id === p.id);
              return defaultP ? { ...defaultP, ...p } : p;
            }) ?? DEFAULT_PERSONAS,
        };
      }
    } catch (e) {
      this.api.runtime?.logger?.warn?.("Failed to load Deliberate config, using defaults");
    }
  }

  private saveConfig(): void {
    const configPath = path.join(this.sessionDir, "..", "CONFIG", "deliberate.json");
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  // ===========================================================================
  // Run parallel thinking
  // ===========================================================================

  async think(prompt: string, context?: string): Promise<ConsensusResult> {
    this.loadConfig();

    if (!this.config.enabled) {
      return this.fallbackResponse("Deliberate is disabled");
    }

    const enabledPersonas = this.config.personas.filter((p) => p.enabled);

    if (enabledPersonas.length === 0) {
      return this.fallbackResponse("No personas enabled");
    }

    const startTime = Date.now();

    // Run all personas in parallel
    const results = await Promise.all(
      enabledPersonas.map((persona) => this.runPersona(prompt, persona, context)),
    );

    const elapsed = Date.now() - startTime;
    this.api.runtime?.logger?.info?.(
      `Deliberate: ${results.length} personas completed in ${elapsed}ms`,
    );

    // Aggregate results
    return this.aggregateResults(results, prompt);
  }

  // ===========================================================================
  // Run single persona as subagent
  // ===========================================================================

  private async runPersona(
    prompt: string,
    persona: PersonaConfig,
    context?: string,
  ): Promise<ThinkingResult> {
    const sessionId = `deliberate-${persona.id}-${Date.now()}`;

    const personaPrompt = `${persona.prompt}

${context ? `\n\n## Context\n${context}\n` : ""}

## Your Task
Analyze the following and provide your perspective:

"${prompt}"

## Output Format
Provide your response in this exact format:

### Reasoning
[Your step-by-step reasoning process]

### Key Points
- [Point 1]
- [Point 2]
- [Point 3]

### Concerns
- [Concern 1]
- [Concern 2]

### Confidence
[Your confidence level: 0.0 - 1.0]

### Response
[Your synthesized response addressing the prompt]`;

    try {
      // Run as isolated subagent
      const result = await this.api.runtime?.subagent?.run({
        sessionKey: `deliberate:${persona.id}:${Date.now()}`,
        message: personaPrompt,
        deliver: false,
      });

      // Parse result
      const response = result?.message ?? result?.text ?? "";
      const { keyPoints, concerns, confidence } = this.parsePersonaOutput(response);

      return {
        persona: persona.id,
        response: this.extractResponse(response),
        confidence,
        reasoning: this.extractSection(response, "Reasoning"),
        keyPoints,
        concerns,
      };
    } catch (error) {
      this.api.runtime?.logger?.error?.(`Persona ${persona.id} failed`, error);
      return {
        persona: persona.id,
        response: "",
        confidence: 0,
        reasoning: `Error: ${error}`,
        keyPoints: [],
        concerns: ["Failed to complete analysis"],
      };
    }
  }

  // ===========================================================================
  // Parse persona output
  // ===========================================================================

  private parsePersonaOutput(output: string): {
    keyPoints: string[];
    concerns: string[];
    confidence: number;
  } {
    const keyPoints = this.extractListItems(output, "Key Points");
    const concerns = this.extractListItems(output, "Concerns");

    // Extract confidence
    let confidence = 0.5;
    const confMatch = output.match(/Confidence[\s\n]+([\d.]+)/i);
    if (confMatch) {
      confidence = parseFloat(confMatch[1]);
    }

    return { keyPoints, concerns, confidence };
  }

  private extractSection(text: string, section: string): string {
    const pattern = new RegExp(`###\\s+${section}\\s*\\n([\\s\\S]*?)(?=###\\s+\\w+|$$)`, "i");
    const match = text.match(pattern);
    return match ? match[1].trim() : "";
  }

  private extractListItems(text: string, section: string): string[] {
    const sectionPattern = new RegExp(
      `###\\s+${section}\\s*\\n([\\s\\S]*?)(?=###\\s+\\w+|$$)`,
      "i",
    );
    const sectionMatch = text.match(sectionPattern);

    if (!sectionMatch) return [];

    const items: string[] = [];
    const listPattern = /-\s+(.+)/g;
    let match;

    while ((match = listPattern.exec(sectionMatch[1])) !== null) {
      items.push(match[1].trim());
    }

    return items;
  }

  private extractResponse(text: string): string {
    const pattern = /###\s+Response\s*\n([\s\S]*?)(?=$$)/i;
    const match = text.match(pattern);
    return match ? match[1].trim() : text.slice(0, 500);
  }

  // ===========================================================================
  // Aggregate results into consensus
  // ===========================================================================

  private aggregateResults(results: ThinkingResult[], originalPrompt: string): ConsensusResult {
    // Filter out empty responses
    const validResults = results.filter((r) => r.response.length > 0);

    if (validResults.length === 0) {
      return this.fallbackResponse("No personas provided valid responses");
    }

    // Calculate weighted confidence
    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const result of validResults) {
      const persona = this.config.personas.find((p) => p.id === result.persona);
      const weight = persona?.weight ?? 1.0;
      weightedConfidence += result.confidence * weight;
      totalWeight += weight;
    }

    const avgConfidence = weightedConfidence / totalWeight;

    // Find agreed and contested points
    const allPoints = validResults.flatMap((r) => r.keyPoints);
    const pointFrequency = new Map<string, number>();

    for (const point of allPoints) {
      const normalized = point.toLowerCase().trim();
      pointFrequency.set(normalized, (pointFrequency.get(normalized) ?? 0) + 1);
    }

    const agreedPoints: string[] = [];
    const contestedPoints: string[] = [];

    for (const [point, freq] of pointFrequency) {
      const ratio = freq / validResults.length;
      if (ratio >= this.config.consensusThreshold) {
        agreedPoints.push(point);
      } else if (ratio <= this.config.dissentThreshold) {
        contestedPoints.push(point);
      }
    }

    // Calculate consensus score
    const consensusScore =
      agreedPoints.length > 0 ? Math.min(1, agreedPoints.length / (validResults.length * 0.5)) : 0;

    // Calculate dissent level
    const dissentLevel = contestedPoints.length > 0 ? contestedPoints.length / allPoints.length : 0;

    // Determine confidence level
    let confidenceLevel: "high" | "medium" | "low";
    if (avgConfidence >= 0.7) {
      confidenceLevel = "high";
    } else if (avgConfidence >= 0.4) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "low";
    }

    // Find winner (highest confidence)
    const winnerResult = validResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );

    // Synthesize response
    const synthesizedResponse = this.synthesize(
      validResults,
      agreedPoints,
      contestedPoints,
      originalPrompt,
    );

    // Log results
    this.logResults({
      prompt: originalPrompt,
      results: validResults,
      consensus: {
        synthesizedResponse,
        consensusScore,
        dissentLevel,
        agreedPoints,
        contestedPoints,
        confidenceLevel,
        winner: winnerResult.persona,
      },
    });

    return {
      synthesizedResponse,
      consensusScore,
      dissentLevel,
      agreedPoints,
      contestedPoints,
      confidenceLevel,
      winner: winnerResult.persona,
    };
  }

  // ===========================================================================
  // Synthesize final response
  // ===========================================================================

  private synthesize(
    results: ThinkingResult[],
    agreedPoints: string[],
    contestedPoints: string[],
    originalPrompt: string,
  ): string {
    // Sort by confidence
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);

    // Build synthesis
    let synthesis = `# Deliberate Synthesis\n\n`;
    synthesis += `## Response to: "${originalPrompt}"\n\n`;

    // Agreement section
    if (agreedPoints.length > 0) {
      synthesis += `## Points of Agreement\n`;
      for (const point of agreedPoints.slice(0, 5)) {
        synthesis += `- ${point}\n`;
      }
      synthesis += `\n`;
    }

    // Contested points
    if (contestedPoints.length > 0) {
      synthesis += `## Points of Contention\n`;
      for (const point of contestedPoints.slice(0, 3)) {
        synthesis += `- ${point}\n`;
      }
      synthesis += `\n`;
    }

    // Main synthesis from highest confidence
    synthesis += `## Synthesized View\n\n`;
    synthesis += `${sorted[0].response}\n\n`;

    // Add insights from others if significantly different
    if (sorted.length > 1 && sorted[1].confidence > 0.4) {
      synthesis += `### Additional Perspectives\n\n`;
      synthesis += `**${sorted[1].persona}** adds: ${sorted[1].response.slice(0, 300)}...\n\n`;
    }

    // Concerns summary
    const allConcerns = results.flatMap((r) => r.concerns);
    if (allConcerns.length > 0) {
      synthesis += `## Key Concerns to Address\n`;
      const uniqueConcerns = [...new Set(allConcerns)].slice(0, 5);
      for (const concern of uniqueConcerns) {
        synthesis += `- ${concern}\n`;
      }
    }

    return synthesis;
  }

  // ===========================================================================
  // Fallback
  // ===========================================================================

  private fallbackResponse(reason: string): ConsensusResult {
    return {
      synthesizedResponse: `[Deliberate skipped: ${reason}]`,
      consensusScore: 0,
      dissentLevel: 0,
      agreedPoints: [],
      contestedPoints: [],
      confidenceLevel: "low",
    };
  }

  // ===========================================================================
  // Logging
  // ===========================================================================

  private logResults(data: {
    prompt: string;
    results: ThinkingResult[];
    consensus: ConsensusResult;
  }): void {
    const logFile = path.join(this.resultsDir, `deliberation-${Date.now()}.json`);

    try {
      fs.writeFileSync(logFile, JSON.stringify(data, null, 2));

      // Also append to summary
      const summaryFile = path.join(this.resultsDir, "summary.jsonl");
      const summary = {
        timestamp: new Date().toISOString(),
        personas: data.results.map((r) => r.persona),
        consensusScore: data.consensus.consensusScore,
        confidence: data.consensus.confidenceLevel,
        winner: data.consensus.winner,
      };
      fs.appendFileSync(summaryFile, JSON.stringify(summary) + "\n");
    } catch (e) {
      this.api.runtime?.logger?.error?.("Failed to log Deliberate results", e);
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  setPersonaEnabled(personaId: string, enabled: boolean): void {
    const persona = this.config.personas.find((p) => p.id === personaId);
    if (persona) {
      persona.enabled = enabled;
      this.saveConfig();
    }
  }

  getConfig(): DeliberateConfig {
    this.loadConfig();
    return { ...this.config };
  }
}

// ============================================================================
// Plugin Registration
// ============================================================================

export default function registerDeliberate(api: OpenClawPluginApi): void {
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");

  const deliberate = new DeliberateSystem(api, resolvedWorkspace);

  // Register deliberation hook
  api.registerHook("before_agent_start", async (params) => {
    const message = params.messages?.[params.messages.length - 1]?.content ?? "";

    // Check if we should run deliberate
    if (
      message.startsWith("!deliberate") ||
      message.startsWith("!think") ||
      message.includes("##deliberate")
    ) {
      const actualPrompt = message
        .replace(/^!(?:deliberate|think)/, "")
        .replace(/##deliberate/, "")
        .trim();

      const result = await deliberate.think(actualPrompt);

      // Return deliberation result instead of normal processing
      return {
        override: true,
        response: result.synthesizedResponse,
        metadata: {
          deliberated: true,
          consensusScore: result.consensusScore,
          personas: result.winner,
        },
      };
    }

    return null;
  });

  api.runtime?.logger?.info?.("Deliberate parallel thinking system registered");
}

// ============================================================================
// Utility: Extract key insights from results
// ============================================================================

export function extractInsights(results: ThinkingResult[]): {
  innovativeIdeas: string[];
  riskFactors: string[];
  consensusSummary: string;
} {
  const innovativeIdeas: string[] = [];
  const riskFactors: string[] = [];

  for (const result of results) {
    if (result.persona === "explorer") {
      innovativeIdeas.push(...result.keyPoints.slice(0, 2));
    }
    if (result.persona === "challenger") {
      riskFactors.push(...result.concerns.slice(0, 2));
    }
  }

  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const consensusSummary =
    avgConfidence > 0.7
      ? "High consensus across perspectives"
      : avgConfidence > 0.4
        ? "Moderate consensus, some divergence"
        : "Low consensus, significant divergence";

  return { innovativeIdeas, riskFactors, consensusSummary };
}
