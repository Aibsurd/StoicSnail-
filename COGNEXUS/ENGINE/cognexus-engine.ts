/**
 * CogneXus Context Engine Plugin
 * 
 * Advanced memory hierarchy: Working Memory → Episodic Memory → Semantic Memory
 * Importance-weighted retrieval with attention-based selection
 * 
 * This replaces the legacy context engine to provide:
 * - Three-tier memory hierarchy
 * - Importance scoring with decay
 * - Attention-based retrieval
 * - Cross-session pattern detection
 * - Automatic memory consolidation
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

interface MemoryChunk {
  id: string;
  content: string;
  importance: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  sessionId: string;
  type: "message" | "tool_result" | "compaction" | "reflection";
  metadata?: Record<string, unknown>;
}

interface WorkingSet {
  chunks: Map<string, MemoryChunk>;
  attentionWeights: Map<string, number>;
  queryEmbedding?: number[];
  lastQueryTime: number;
}

interface EpisodicEntry {
  sessionId: string;
  summary: string;
  importance: number;
  startTime: number;
  endTime: number;
  chunkIds: string[];
  keyDecisions: string[];
  unresolvedQuestions: string[];
}

interface SemanticMemoryIndex {
  chunks: Map<string, SemanticChunk>;
  lastUpdated: number;
}

interface SemanticChunk {
  id: string;
  content: string;
  embedding: number[];
  importance: number;
  source: "memory-md" | "daily-log" | "reflection" | "extracted";
  tags: string[];
  createdAt: number;
  lastAccessed: number;
}

interface ImportanceFactors {
  recency: number;        // Time since last access
  frequency: number;      // Access count
  semantic: number;       // Semantic richness
  emotional: number;      // Emotional salience markers
  utility: number;       // Past utility in similar contexts
  uniqueness: number;     // Information novelty
}

interface CogneXusConfig {
  workingMemoryLimit: number;      // Max chunks in WM (tokens approximation)
  episodicRetention: number;       // How many sessions to keep in EM
  semanticUpdateInterval: number;  // Ms between semantic index updates
  importanceDecay: number;         // Base decay rate per day
  attentionWindow: number;         // How many chunks attention considers
  consolidationThreshold: number;  // Importance threshold for SM promotion
  temporalDecayFactor: number;    // How fast recency matters
  enablePatternDetection: boolean;
  patternMinConfidence: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: CogneXusConfig = {
  workingMemoryLimit: 50,         // ~50 chunks in attention window
  episodicRetention: 30,          // Keep 30 sessions in EM
  semanticUpdateInterval: 5 * 60 * 1000,  // 5 minutes
  importanceDecay: 0.95,           // 5% decay per day
  attentionWindow: 20,             // Top 20 chunks for attention
  consolidationThreshold: 0.6,     // Score above 0.6 goes to SM
  temporalDecayFactor: 0.1,        // Recency weight
  enablePatternDetection: true,
  patternMinConfidence: 0.7,
};

const MEMORY_DIR = "cognexus-memory";
const WORKING_SET_FILE = "working-set.json";
const EPISODIC_DIR = "episodic";
const SEMANTIC_DIR = "semantic";
const PATTERNS_FILE = "patterns.json";
const CONFIG_FILE = "config.json";
const EVOLUTION_LOG = "evolution-log.jsonl";

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

function simpleEmbedding(text: string): number[] {
  // Simplified embedding: hash-based pseudo-vectors for demo
  // In production, use actual embeddings from memorySearch
  const hash = crypto.createHash("sha256").update(text).digest();
  const dim = 128;
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < 32; i++) {
    const idx = hash[i] % dim;
    vec[idx] += (hash[i] > 127 ? 1 : -1) * (1 - i / 32);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / (norm + 1e-10));
}

function analyzeEmotionalSalience(text: string): number {
  // Detect emotional/important markers
  const markers = [
    /\b(important|critical|urgent|key|essential|must|never|always)\b/gi,
    /\b(decision|chose|chose not|agreed|refused|accepted|rejected)\b/gi,
    /\b(fixed|broken|failed|succeeded|workaround|discovered|realized)\b/gi,
    /\b(but|however|although|despite|because|therefore|hence)\b/gi,
  ];
  
  let score = 0;
  for (const marker of markers) {
    const matches = text.match(marker);
    if (matches) score += matches.length * 0.1;
  }
  return Math.min(1, score);
}

function computeImportanceScore(
  chunk: MemoryChunk,
  factors: Partial<ImportanceFactors>,
  config: CogneXusConfig
): number {
  const recencyDays = (Date.now() - chunk.lastAccessed) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.exp(-config.temporalDecayFactor * recencyDays);
  
  const frequencyScore = Math.log1p(chunk.accessCount) / 10;
  const semanticScore = factors.semantic ?? 0.5;
  const emotionalScore = factors.emotional ?? analyzeEmotionalSalience(chunk.content);
  const utilityScore = factors.utility ?? 0.5;
  const uniquenessScore = factors.uniqueness ?? 0.5;
  
  // Weighted combination
  const weights = {
    recency: 0.15,
    frequency: 0.15,
    semantic: 0.20,
    emotional: 0.15,
    utility: 0.20,
    uniqueness: 0.15,
  };
  
  const score = 
    weights.recency * recencyScore +
    weights.frequency * Math.min(1, frequencyScore) +
    weights.semantic * semanticScore +
    weights.emotional * emotionalScore +
    weights.utility * utilityScore +
    weights.uniqueness * uniquenessScore;
  
  // Apply decay
  const daysSinceCreation = (Date.now() - chunk.createdAt) / (1000 * 60 * 60 * 24);
  const decayedScore = score * Math.pow(config.importanceDecay, daysSinceCreation);
  
  return Math.max(0, Math.min(1, decayedScore));
}

function extractKeyDecisions(content: string): string[] {
  // Extract decision-like statements
  const patterns = [
    /(?:decided|chose|selected|agreed|resolved)\s+(?:to\s+)?(.+?)(?:\.|$)/gi,
    /(?:will|shall|going to)\s+(.+?)(?:\.|$)/gi,
    /(?:created|made|built|implemented)\s+(?:a\s+)?(.+?)(?:\.|$)/gi,
  ];
  
  const decisions: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const decision = match[1].trim();
      if (decision.length > 10 && decision.length < 200) {
        decisions.push(decision);
      }
    }
  }
  return decisions.slice(0, 5); // Max 5 decisions
}

function extractQuestions(content: string): string[] {
  // Extract unresolved questions
  const pattern = /(?:what about|how do we|should we|need to|pending|todo|tbd)\s+(.+?)(?:\?|$)/gi;
  const questions: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    questions.push(match[1].trim());
  }
  return questions.slice(0, 5);
}

// ============================================================================
// CogneXus Context Engine Implementation
// ============================================================================

export default function registerCogneXusEngine(api: OpenClawPluginApi): void {
  const engineId = "cognexus";
  
  // Load or initialize config
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");
  const memoryDir = path.join(resolvedWorkspace, MEMORY_DIR);
  
  // Ensure directory structure exists
  ensureDirectoryStructure(memoryDir);
  
  const config = loadConfig(memoryDir);
  
  // State
  const workingSets = new Map<string, WorkingSet>();
  const episodicMemory = new Map<string, EpisodicEntry[]>();
  const semanticIndex = loadSemanticIndex(memoryDir);
  const patterns = loadPatterns(memoryDir);
  
  // ===========================================================================
  // Helper: Ensure directory structure
  // ===========================================================================
  
  function ensureDirectoryStructure(baseDir: string): void {
    const dirs = [
      baseDir,
      path.join(baseDir, EPISODIC_DIR),
      path.join(baseDir, SEMANTIC_DIR),
      path.join(baseDir, "sessions"),
      path.join(baseDir, "patterns"),
      path.join(baseDir, "logs"),
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
  
  // ===========================================================================
  // Helper: Load/Save config
  // ===========================================================================
  
  function loadConfig(baseDir: string): CogneXusConfig {
    const configPath = path.join(baseDir, CONFIG_FILE);
    try {
      if (fs.existsSync(configPath)) {
        const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return { ...DEFAULT_CONFIG, ...loaded };
      }
    } catch (e) {
      api.runtime?.logger?.warn?.("Failed to load CogneXus config, using defaults");
    }
    return { ...DEFAULT_CONFIG };
  }
  
  function saveConfig(baseDir: string, cfg: CogneXusConfig): void {
    const configPath = path.join(baseDir, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
  }
  
  // ===========================================================================
  // Helper: Semantic index persistence
  // ===========================================================================
  
  function loadSemanticIndex(baseDir: string): SemanticMemoryIndex {
    const indexPath = path.join(baseDir, SEMANTIC_DIR, "index.json");
    try {
      if (fs.existsSync(indexPath)) {
        const data = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        return {
          chunks: new Map(Object.entries(data.chunks || {})),
          lastUpdated: data.lastUpdated || 0,
        };
      }
    } catch (e) {
      // Ignore
    }
    return { chunks: new Map(), lastUpdated: 0 };
  }
  
  function saveSemanticIndex(baseDir: string, index: SemanticMemoryIndex): void {
    const indexPath = path.join(baseDir, SEMANTIC_DIR, "index.json");
    const data = {
      chunks: Object.fromEntries(index.chunks),
      lastUpdated: index.lastUpdated,
    };
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));
  }
  
  // ===========================================================================
  // Helper: Patterns persistence
  // ===========================================================================
  
  function loadPatterns(baseDir: string): Map<string, unknown> {
    const patternsPath = path.join(baseDir, "patterns", "registry.json");
    try {
      if (fs.existsSync(patternsPath)) {
        const data = JSON.parse(fs.readFileSync(patternsPath, "utf-8"));
        return new Map(Object.entries(data));
      }
    } catch (e) {
      // Ignore
    }
    return new Map();
  }
  
  function savePatterns(baseDir: string, pats: Map<string, unknown>): void {
    const patternsPath = path.join(baseDir, "patterns", "registry.json");
    fs.writeFileSync(patternsPath, JSON.stringify(Object.fromEntries(pats), null, 2));
  }
  
  // ===========================================================================
  // Helper: Working set management
  // ===========================================================================
  
  function getOrCreateWorkingSet(sessionId: string): WorkingSet {
    if (!workingSets.has(sessionId)) {
      workingSets.set(sessionId, {
        chunks: new Map(),
        attentionWeights: new Map(),
        lastQueryTime: Date.now(),
      });
    }
    return workingSets.get(sessionId)!;
  }
  
  function addToWorkingSet(ws: WorkingSet, chunk: MemoryChunk, importance: number): void {
    // Evict lowest importance if at limit
    if (ws.chunks.size >= config.workingMemoryLimit) {
      let lowestId: string | null = null;
      let lowestScore = Infinity;
      
      for (const [id, ch] of ws.chunks) {
        const score = ws.attentionWeights.get(id) ?? ch.importance;
        if (score < lowestScore) {
          lowestScore = score;
          lowestId = id;
        }
      }
      
      if (lowestId && lowestScore < importance) {
        ws.chunks.delete(lowestId);
        ws.attentionWeights.delete(lowestId);
      }
    }
    
    ws.chunks.set(chunk.id, chunk);
    ws.attentionWeights.set(chunk.id, importance);
  }
  
  // ===========================================================================
  // Helper: Importance computation for retrieval
  // ===========================================================================
  
  function computeRetrievalImportance(
    chunk: MemoryChunk,
    queryEmbedding: number[],
    ws: WorkingSet
  ): number {
    // Semantic similarity to query
    const chunkEmbedding = simpleEmbedding(chunk.content);
    const semanticSim = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    // Attention weight (recency of access in current context)
    const attentionWeight = ws.attentionWeights.get(chunk.id) ?? chunk.importance;
    
    // Recency bonus
    const recencyMs = Date.now() - chunk.lastAccessed;
    const recencyBonus = Math.exp(-recencyMs / (1000 * 60 * 60)); // 1 hour half-life
    
    // Combined score
    return (
      0.4 * semanticSim +
      0.3 * attentionWeight +
      0.3 * chunk.importance
    ) * (1 + recencyBonus);
  }
  
  // ===========================================================================
  // Engine Info
  // ===========================================================================
  
  const engineInfo = {
    id: engineId,
    name: "CogneXus Advanced Memory",
    version: "0.1.0",
    ownsCompaction: true,
    description: "Three-tier memory hierarchy with importance-weighted attention",
  };
  
  // ===========================================================================
  // Register the context engine
  // ===========================================================================
  
  api.registerContextEngine(engineId, () => ({
    info: engineInfo,
    
    // =========================================================================
    // Ingest: Store incoming messages in WM
    // =========================================================================
    
    async ingest({ sessionId, message, isHeartbeat }): Promise<{ ingested: boolean; importance?: number }> {
      if (isHeartbeat) {
        return { ingested: false };
      }
      
      try {
        const ws = getOrCreateWorkingSet(sessionId);
        
        // Determine importance based on content analysis
        const emotional = analyzeEmotionalSalience(message.content ?? "");
        const semantic = (message.content?.length ?? 0) / 1000; // Rough richness measure
        
        // Create chunk
        const chunk: MemoryChunk = {
          id: generateId(),
          content: message.content ?? "",
          importance: 0.5, // Initial importance, will be updated
          accessCount: 1,
          lastAccessed: Date.now(),
          createdAt: Date.now(),
          sessionId,
          type: message.role === "tool" ? "tool_result" : "message",
          metadata: {
            role: message.role,
            compact: message.compact,
          },
        };
        
        // Compute initial importance
        const importance = computeImportanceScore(chunk, { semantic, emotional }, config);
        chunk.importance = importance;
        
        // Add to working set
        addToWorkingSet(ws, chunk, importance);
        
        // Persist working set
        const wsPath = path.join(memoryDir, WORKING_SET_FILE);
        const wsData = {
          sessionId,
          chunks: Array.from(ws.chunks.entries()),
          lastUpdated: Date.now(),
        };
        fs.writeFileSync(wsPath, JSON.stringify(wsData, null, 2));
        
        return { ingested: true, importance };
      } catch (error) {
        api.runtime?.logger?.error?.("CogneXus ingest failed", error);
        return { ingested: false };
      }
    },
    
    // =========================================================================
    // Assemble: Build context with attention-weighted retrieval
    // =========================================================================
    
    async assemble({ sessionId, messages, tokenBudget }): Promise<{
      messages: unknown[];
      estimatedTokens: number;
      systemPromptAddition?: string;
      workingSetStats?: {
        wmSize: number;
        emSize: number;
        smSize: number;
        topImportance: number;
      };
    }> {
      try {
        const ws = getOrCreateWorkingSet(sessionId);
        
        // Build query embedding from recent messages
        const recentContent = messages
          .slice(-5)
          .map(m => m.content ?? "")
          .join(" ");
        const queryEmbedding = simpleEmbedding(recentContent);
        ws.queryEmbedding = queryEmbedding;
        ws.lastQueryTime = Date.now();
        
        // Score all WM chunks by attention
        const scoredChunks: Array<{ chunk: MemoryChunk; score: number }> = [];
        
        for (const chunk of ws.chunks.values()) {
          // Update access tracking
          chunk.accessCount++;
          chunk.lastAccessed = Date.now();
          
          const score = computeRetrievalImportance(chunk, queryEmbedding, ws);
          ws.attentionWeights.set(chunk.id, score);
          scoredChunks.push({ chunk, score });
        }
        
        // Sort by score descending
        scoredChunks.sort((a, b) => b.score - a.score);
        
        // Select top-k for context
        const budget = tokenBudget ?? 80000;
        const selectedChunks: MemoryChunk[] = [];
        let totalTokens = 0;
        
        for (const { chunk } of scoredChunks) {
          const chunkTokens = Math.ceil((chunk.content.length + 200) / 4); // ~4 chars per token
          
          if (totalTokens + chunkTokens > budget * 0.3) {
            // Max 30% of budget for memory
            break;
          }
          
          selectedChunks.push(chunk);
          totalTokens += chunkTokens;
        }
        
        // Build assembled messages
        // Weave in relevant WM chunks as context
        let systemPromptAddition = "";
        
        if (selectedChunks.length > 0) {
          const memoryContext = selectedChunks
            .map((ch, i) => {
              const age = Math.round((Date.now() - ch.lastAccessed) / 60000);
              return `[Memory:${i + 1}] (${ch.type}, accessed ${age}m ago, importance: ${ch.importance.toFixed(2)})\n${ch.content}`;
            })
            .join("\n\n");
          
          systemPromptAddition = `\n\n## Relevant Context from Memory\n${memoryContext}\n\nUse this context to inform your response. High-importance items are most relevant.`;
        }
        
        // Calculate stats
        const emSize = episodicMemory.get(sessionId)?.length ?? 0;
        
        const stats = {
          wmSize: ws.chunks.size,
          emSize,
          smSize: semanticIndex.chunks.size,
          topImportance: scoredChunks[0]?.score ?? 0,
        };
        
        return {
          messages: messages as unknown[],
          estimatedTokens: totalTokens,
          systemPromptAddition,
          workingSetStats: stats,
        };
      } catch (error) {
        api.runtime?.logger?.error?.("CogneXus assemble failed", error);
        // Fallback to pass-through
        return {
          messages: messages as unknown[],
          estimatedTokens: 0,
        };
      }
    },
    
    // =========================================================================
    // Compact: Summarize with importance tracking
    // =========================================================================
    
    async compact({ sessionId, force }): Promise<{ ok: boolean; compacted: boolean }> {
      try {
        const ws = getOrCreateWorkingSet(sessionId);
        
        if (ws.chunks.size === 0) {
          return { ok: true, compacted: false };
        }
        
        // Identify chunks worth preserving (high importance)
        const preservedChunks: MemoryChunk[] = [];
        const consolidatedChunks: MemoryChunk[] = [];
        
        for (const chunk of ws.chunks.values()) {
          if (chunk.importance >= config.consolidationThreshold) {
            preservedChunks.push(chunk);
          } else {
            consolidatedChunks.push(chunk);
          }
        }
        
        // Create episodic memory entry for this session's context
        if (preservedChunks.length > 0) {
          const episodic: EpisodicEntry = {
            sessionId,
            summary: preservedChunks
              .slice(0, 10)
              .map(ch => ch.content.slice(0, 200))
              .join(" | "),
            importance: preservedChunks.reduce((s, ch) => s + ch.importance, 0) / preservedChunks.length,
            startTime: Math.min(...preservedChunks.map(ch => ch.createdAt)),
            endTime: Date.now(),
            chunkIds: preservedChunks.map(ch => ch.id),
            keyDecisions: preservedChunks.flatMap(ch => extractKeyDecisions(ch.content)),
            unresolvedQuestions: preservedChunks.flatMap(ch => extractQuestions(ch.content)),
          };
          
          // Store episodic entry
          const episodicPath = path.join(memoryDir, EPISODIC_DIR, `${sessionId}.json`);
          fs.writeFileSync(episodicPath, JSON.stringify(episodic, null, 2));
          
          // Add to episodic memory list
          const em = episodicMemory.get(sessionId) ?? [];
          em.unshift(episodic); // Most recent first
          
          // Trim to retention limit
          if (em.length > config.episodicRetention) {
            em.splice(config.episodicRetention);
          }
          episodicMemory.set(sessionId, em);
          
          // Promote high-importance chunks to semantic memory
          for (const chunk of preservedChunks) {
            const semanticChunk: SemanticChunk = {
              id: chunk.id,
              content: chunk.content,
              embedding: simpleEmbedding(chunk.content),
              importance: chunk.importance,
              source: "reflection",
              tags: extractTags(chunk.content),
              createdAt: chunk.createdAt,
              lastAccessed: chunk.lastAccessed,
            };
            semanticIndex.chunks.set(chunk.id, semanticChunk);
          }
          
          semanticIndex.lastUpdated = Date.now();
          saveSemanticIndex(memoryDir, semanticIndex);
        }
        
        // Clear working set (will be rebuilt on next assemble)
        ws.chunks.clear();
        ws.attentionWeights.clear();
        
        // Log evolution
        const evolutionEntry = {
          timestamp: new Date().toISOString(),
          sessionId,
          action: "compact",
          preserved: preservedChunks.length,
          consolidated: consolidatedChunks.length,
        };
        const evolutionPath = path.join(memoryDir, "logs", EVOLUTION_LOG);
        fs.appendFileSync(evolutionPath, JSON.stringify(evolutionEntry) + "\n");
        
        return { ok: true, compacted: preservedChunks.length > 0 };
      } catch (error) {
        api.runtime?.logger?.error?.("CogneXus compact failed", error);
        // Delegate to runtime on failure
        return await delegateCompactionToRuntime({ sessionId, force });
      }
    },
    
    // =========================================================================
    // Pattern Detection (for future use)
    // =========================================================================
    
    async detectPatterns(sessionId: string): Promise<unknown[]> {
      if (!config.enablePatternDetection) return [];
      
      try {
        const ws = getOrCreateWorkingSet(sessionId);
        const detectedPatterns: unknown[] = [];
        
        // Analyze content for common patterns
        const contentByType = new Map<string, string[]>();
        for (const chunk of ws.chunks.values()) {
          const type = chunk.type;
          if (!contentByType.has(type)) {
            contentByType.set(type, []);
          }
          contentByType.get(type)!.push(chunk.content);
        }
        
        // Detect sequential patterns (e.g., read then write)
        // This is a simplified version - full implementation would use
        // sequence mining algorithms
        for (const [type, contents] of contentByType) {
          if (contents.length >= 3) {
            // Look for repeated structures
            const hashes = contents.map(c => computeHash(c.slice(0, 50)));
            const unique = new Set(hashes);
            
            if (unique.size < contents.length * 0.5) {
              detectedPatterns.push({
                type: "repeated-structure",
                contentType: type,
                frequency: contents.length,
                confidence: 1 - unique.size / contents.length,
              });
            }
          }
        }
        
        // Store detected patterns
        for (const pattern of detectedPatterns) {
          const p = pattern as { type: string; confidence: number };
          if (p.confidence >= config.patternMinConfidence) {
            const key = `${p.type}-${sessionId}`;
            patterns.set(key, pattern);
          }
        }
        
        savePatterns(memoryDir, patterns);
        
        return detectedPatterns.filter(p => (p as { confidence: number }).confidence >= config.patternMinConfidence);
      } catch (error) {
        api.runtime?.logger?.error?.("Pattern detection failed", error);
        return [];
      }
    },
    
    // =========================================================================
    // Cleanup
    // =========================================================================
    
    dispose(): void {
      // Save any pending state
      try {
        const wsPath = path.join(memoryDir, WORKING_SET_FILE);
        for (const [sessionId, ws] of workingSets) {
          if (ws.chunks.size > 0) {
            const wsData = {
              sessionId,
              chunks: Array.from(ws.chunks.entries()),
              lastUpdated: Date.now(),
            };
            fs.writeFileSync(wsPath, JSON.stringify(wsData, null, 2));
          }
        }
        
        saveSemanticIndex(memoryDir, semanticIndex);
        savePatterns(memoryDir, patterns);
        
        api.runtime?.logger?.info?.("CogneXus engine disposed");
      } catch (error) {
        api.runtime?.logger?.error?.("Failed to dispose CogneXus engine", error);
      }
    },
  }));
  
  api.runtime?.logger?.info?.(`CogneXus context engine registered (${engineInfo.name} v${engineInfo.version})`);
}

// ============================================================================
// Helper: Extract tags from content
// ============================================================================

function extractTags(content: string): string[] {
  const tags = new Set<string>();
  
  // Extract markdown headers
  const headerMatches = content.match(/^#+\s+(.+)/gm);
  if (headerMatches) {
    for (const match of headerMatches) {
      const tag = match.replace(/^#+\s+/, "").toLowerCase().slice(0, 30);
      tags.add(tag);
    }
  }
  
  // Extract code blocks (language tags)
  const codeMatches = content.match(/```(\w+)/g);
  if (codeMatches) {
    for (const match of codeMatches) {
      tags.add(match.replace(/`/g, ""));
    }
  }
  
  // Extract @mentions
  const mentionMatches = content.match(/@(\w+)/g);
  if (mentionMatches) {
    for (const match of mentionMatches) {
      tags.add(match.replace(/@/, ""));
    }
  }
  
  return Array.from(tags).slice(0, 10);
}
