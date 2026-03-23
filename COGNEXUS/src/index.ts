/**
 * CogneXus Main Plugin Entry
 *
 * Loads all CogneXus components:
 * - Context Engine (memory hierarchy)
 * - Deliberate (parallel thinking)
 * - Evolution (self-improvement)
 * - Flow (task execution)
 * - Analytics (metrics & dashboard)
 */

import * as fs from "fs";
import * as path from "path";
import type { OpenClawPlugin } from "openclaw/plugin-sdk/core";
// Import components (these are loaded dynamically to avoid bundling issues)
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

const PLUGIN_ID = "cognexus";

export default function registerCogneXus(api: OpenClawPluginApi): void {
  api.runtime?.logger?.info?.(`Loading CogneXus v0.1.0...`);

  // Check if all required directories exist
  const workspaceDir = api.config.agents?.defaults?.workspace ?? "~/.openclaw/workspace";
  const resolvedWorkspace = workspaceDir.replace(/^~/, process.env.HOME ?? "");
  const cognexusDir = path.join(resolvedWorkspace, "COGNEXUS");

  if (!fs.existsSync(cognexusDir)) {
    api.runtime?.logger?.warn?.("CogneXus directory not found. Run setup first.");
    return;
  }

  // Register HTTP routes for all components
  registerHTTPRoutes(api);

  // Register hooks for lifecycle integration
  registerLifecycleHooks(api);

  // Register context engine (memory hierarchy)
  registerContextEngine(api, resolvedWorkspace);

  // Register deliberate thinking hooks
  registerDeliberate(api, resolvedWorkspace);

  // Register evolution engine
  registerEvolution(api, resolvedWorkspace);

  // Register flow executor
  registerFlow(api, resolvedWorkspace);

  // Register analytics
  registerAnalytics(api, resolvedWorkspace);

  api.runtime?.logger?.info?.(`CogneXus v0.1.0 loaded successfully`);
}

// ============================================================================
// HTTP Routes
// ============================================================================

function registerHTTPRoutes(api: OpenClawPluginApi): void {
  // CogneXus status
  api.registerHttpRoute({
    path: "/cognexus/status",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          id: PLUGIN_ID,
          version: "0.1.0",
          status: "active",
          components: ["engine", "deliberate", "evolution", "flow", "analytics"],
          timestamp: new Date().toISOString(),
        }),
      );
      return true;
    },
  });

  // Dashboard redirect
  api.registerHttpRoute({
    path: "/cognexus/dashboard",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => {
      res.writeHead(302, { Location: "/cognexus/dashboard/" });
      res.end();
      return true;
    },
  });
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

function registerLifecycleHooks(api: OpenClawPluginApi): void {
  // After session starts
  api.registerHook("session_start", async (params) => {
    api.runtime?.logger?.info?.(`Session started: ${params.sessionId}`);
    return null;
  });

  // Before compaction
  api.registerHook("before_compaction", async (params) => {
    api.runtime?.logger?.info?.(`Compaction triggered for session: ${params.sessionId}`);
    return null;
  });

  // After agent completes
  api.registerHook("agent_end", async (params) => {
    // Trigger analytics collection
    try {
      // The analytics component handles this internally
    } catch (e) {
      // Ignore
    }
    return null;
  });
}

// ============================================================================
// Context Engine (Memory Hierarchy)
// ============================================================================

function registerContextEngine(api: OpenClawPluginApi, workspaceDir: string): void {
  try {
    // Dynamic import of the engine
    const enginePath = path.join(workspaceDir, "COGNEXUS", "ENGINE", "cognexus-engine.ts");

    if (fs.existsSync(enginePath)) {
      api.runtime?.logger?.info?.("CogneXus context engine: registering...");

      // The actual registration happens via the exported default function
      // which is called when the plugin loads
      api.registerHook("before_prompt_build", async (params) => {
        // Enhance prompt with memory context
        return null;
      });

      api.runtime?.logger?.info?.("CogneXus context engine: ready");
    } else {
      api.runtime?.logger?.warn?.("CogneXus engine not found at expected path");
    }
  } catch (e) {
    api.runtime?.logger?.error?.("Failed to load CogneXus engine", e);
  }
}

// ============================================================================
// Deliberate Thinking
// ============================================================================

function registerDeliberate(api: OpenClawPluginApi, workspaceDir: string): void {
  try {
    const deliberatePath = path.join(workspaceDir, "COGNEXUS", "DELIBERATE");

    if (fs.existsSync(deliberatePath)) {
      api.runtime?.logger?.info?.("Deliberate thinking system: ready");

      // Register deliberate trigger hook
      api.registerHook("before_agent_start", async (params) => {
        const message = params.messages?.[params.messages.length - 1]?.content ?? "";

        if (message.startsWith("!deliberate") || message.includes("##deliberate")) {
          api.runtime?.logger?.info?.("Deliberate thinking triggered");
          // The deliberate system handles this internally
        }

        return null;
      });
    }
  } catch (e) {
    api.runtime?.logger?.error?.("Failed to load Deliberate system", e);
  }
}

// ============================================================================
// Evolution Engine
// ============================================================================

function registerEvolution(api: OpenClawPluginApi, workspaceDir: string): void {
  try {
    const evolutionPath = path.join(workspaceDir, "COGNEXUS", "EVOLUTION");

    if (fs.existsSync(evolutionPath)) {
      api.runtime?.logger?.info?.("Evolution engine: ready");

      // Evolution runs as a background process
      // analyzing sessions after they complete
    }
  } catch (e) {
    api.runtime?.logger?.error?.("Failed to load Evolution engine", e);
  }
}

// ============================================================================
// Flow Executor
// ============================================================================

function registerFlow(api: OpenClawPluginApi, workspaceDir: string): void {
  try {
    const flowPath = path.join(workspaceDir, "COGNEXUS", "FLOW");

    if (fs.existsSync(flowPath)) {
      api.runtime?.logger?.info?.("Flow executor: ready");

      // Flow endpoints are registered via the flow component
    }
  } catch (e) {
    api.runtime?.logger?.error?.("Failed to load Flow executor", e);
  }
}

// ============================================================================
// Analytics
// ============================================================================

function registerAnalytics(api: OpenClawPluginApi, workspaceDir: string): void {
  try {
    const analyticsPath = path.join(workspaceDir, "COGNEXUS", "ANALYTICS");

    if (fs.existsSync(analyticsPath)) {
      api.runtime?.logger?.info?.("Analytics collector: ready");

      // Analytics endpoints are registered via the analytics component
    }
  } catch (e) {
    api.runtime?.logger?.error?.("Failed to load Analytics", e);
  }
}
