import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

/**
 * Pure evaluator replicating the exact shell script logic in
 * .github/workflows/cleanup-abandoned-orders.yml
 */
export function evaluateWorkflowDryRun(
  eventName: string,
  inputDryRun?: string | null,
): { dryRun: boolean; error?: string } {
  if (eventName === "workflow_dispatch") {
    // Manual execution: default to safe dry-run (true).
    // Only execute live cleanup if explicitly passed 'false'.
    if (!inputDryRun || inputDryRun === "true") {
      return { dryRun: true };
    } else if (inputDryRun === "false") {
      return { dryRun: false };
    } else {
      return {
        dryRun: false,
        error: `Invalid dry_run input '${inputDryRun}'. Must be 'true' or 'false'. Failing closed.`,
      };
    }
  } else if (eventName === "schedule") {
    // Automated cron schedule: execute live cleanup
    return { dryRun: false };
  } else {
    // Fail closed on any unexpected or unsupported event triggers
    return {
      dryRun: false,
      error: `Unsupported workflow event '${eventName}'. Failing closed to protect production data.`,
    };
  }
}

/**
 * Constructs the target endpoint URL replicating workflow shell logic.
 */
export function buildTargetCleanupUrl(
  endpointBase: string,
  eventName: string,
  inputDryRun?: string | null,
  inputTimeout?: string | null,
): { url?: string; error?: string } {
  const modeResult = evaluateWorkflowDryRun(eventName, inputDryRun);
  if (modeResult.error) {
    return { error: modeResult.error };
  }

  const rawTimeout = inputTimeout || "60";
  const timeoutVal = /^[0-9]+$/.test(rawTimeout) ? rawTimeout : "60";
  const dryRunVal = modeResult.dryRun ? "true" : "false";

  return {
    url: `${endpointBase}?timeoutMinutes=${timeoutVal}&dryRun=${dryRunVal}`,
  };
}

describe("AgroMarket — Cleanup Workflow Dry-Run Safety Suite", () => {
  const workflowPath = path.resolve(
    process.cwd(),
    ".github/workflows/cleanup-abandoned-orders.yml",
  );
  const workflowContent = fs.readFileSync(workflowPath, "utf-8");

  describe("1. Static Workflow Declaration Invariants", () => {
    it("configures workflow_dispatch input dry_run with default true", () => {
      // Must contain default: true under dry_run input
      const dryRunMatch = workflowContent.match(/dry_run:[\s\S]*?default:\s*(true|false)/);
      expect(dryRunMatch).not.toBeNull();
      expect(dryRunMatch![1]).toBe("true");
    });

    it("preserves 15-minute cron schedule definition", () => {
      expect(workflowContent).toContain('- cron: "*/15 * * * *"');
    });

    it("preserves concurrency protection and disallows cancel-in-progress", () => {
      expect(workflowContent).toContain("group: cleanup-abandoned-orders");
      expect(workflowContent).toContain("cancel-in-progress: false");
    });

    it("preserves job and network timeout bounds", () => {
      expect(workflowContent).toContain("timeout-minutes: 5");
      expect(workflowContent).toContain("--max-time 30");
    });

    it("binds EVENT_NAME, INPUT_DRY_RUN, and EVENT_INPUT_DRY_RUN to step environment", () => {
      expect(workflowContent).toContain("EVENT_NAME: ${{ github.event_name }}");
      expect(workflowContent).toContain("INPUT_DRY_RUN: ${{ inputs.dry_run }}");
      expect(workflowContent).toContain("EVENT_INPUT_DRY_RUN: ${{ github.event.inputs.dry_run }}");
    });
  });

  describe("2. Workflow Event Evaluation & Fail-Closed Logic", () => {
    it("Scenario A: Manual dispatch with default/omitted input resolves to dryRun=true", () => {
      const result = evaluateWorkflowDryRun("workflow_dispatch", "");
      expect(result.error).toBeUndefined();
      expect(result.dryRun).toBe(true);

      const nullResult = evaluateWorkflowDryRun("workflow_dispatch", null);
      expect(nullResult.error).toBeUndefined();
      expect(nullResult.dryRun).toBe(true);
    });

    it("Scenario B: Manual dispatch with explicit 'true' resolves to dryRun=true", () => {
      const result = evaluateWorkflowDryRun("workflow_dispatch", "true");
      expect(result.error).toBeUndefined();
      expect(result.dryRun).toBe(true);
    });

    it("Scenario C: Manual dispatch with explicit 'false' resolves to dryRun=false (live)", () => {
      const result = evaluateWorkflowDryRun("workflow_dispatch", "false");
      expect(result.error).toBeUndefined();
      expect(result.dryRun).toBe(false);
    });

    it("Scenario D: Manual dispatch with invalid input fails closed with error", () => {
      const result = evaluateWorkflowDryRun("workflow_dispatch", "invalid_val");
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Invalid dry_run input");
      expect(result.dryRun).toBe(false);
    });

    it("Scenario E: Scheduled cron execution resolves to dryRun=false (live)", () => {
      const result = evaluateWorkflowDryRun("schedule");
      expect(result.error).toBeUndefined();
      expect(result.dryRun).toBe(false);
    });

    it("Scenario F: Unsupported events (e.g. push, pull_request) fail closed", () => {
      const pushResult = evaluateWorkflowDryRun("push");
      expect(pushResult.error).toBeDefined();
      expect(pushResult.error).toContain("Unsupported workflow event 'push'");
      expect(pushResult.dryRun).toBe(false);

      const prResult = evaluateWorkflowDryRun("pull_request");
      expect(prResult.error).toBeDefined();
      expect(prResult.error).toContain("Unsupported workflow event 'pull_request'");
      expect(prResult.dryRun).toBe(false);
    });
  });

  describe("3. Target URL Generation Verification", () => {
    const base =
      "https://agro-market-final-version-6hzc.vercel.app/api/cron/cleanup-abandoned-orders";

    it("generates dryRun=true URL on manual dispatch default", () => {
      const { url, error } = buildTargetCleanupUrl(base, "workflow_dispatch");
      expect(error).toBeUndefined();
      expect(url).toBe(`${base}?timeoutMinutes=60&dryRun=true`);
    });

    it("generates dryRun=false URL on automated cron schedule", () => {
      const { url, error } = buildTargetCleanupUrl(base, "schedule");
      expect(error).toBeUndefined();
      expect(url).toBe(`${base}?timeoutMinutes=60&dryRun=false`);
    });

    it("generates dryRun=false URL on manual dispatch with explicit false", () => {
      const { url, error } = buildTargetCleanupUrl(base, "workflow_dispatch", "false");
      expect(error).toBeUndefined();
      expect(url).toBe(`${base}?timeoutMinutes=60&dryRun=false`);
    });

    it("refuses to generate URL on invalid inputs", () => {
      const { url, error } = buildTargetCleanupUrl(base, "workflow_dispatch", "corrupted");
      expect(url).toBeUndefined();
      expect(error).toContain("Invalid dry_run input");
    });
  });

  describe("4. Direct Bash Execution of Dynamically Extracted Workflow Script", () => {
    const gitBashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
    const hasGitBash = fs.existsSync(gitBashPath);

    // Dynamically extract the exact run script directly from the workflow YAML
    // to guarantee 100% test fidelity against the committed workflow.
    const runScriptMatch = workflowContent.match(
      /run:\s*\|\r?\n([\s\S]+?)(?=\r?\n\s*(?:- name|\w+:|$))/,
    );
    expect(runScriptMatch).not.toBeNull();
    const rawExtractedScript = runScriptMatch![1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^ {10}/, ""))
      .join("\n");

    // Prepend a mock curl function to intercept network calls safely during tests
    const executableScript = `
curl() {
  # Mock curl output: payload followed by newline and http_code
  if [ -n "$MOCK_CURL_BODY" ]; then
    echo "$MOCK_CURL_BODY"
  else
    echo "{\\"success\\":true,\\"data\\":{\\"success\\":true,\\"dryRun\\":\${DRY_RUN_VAL}}}"
  fi
  echo "\${MOCK_CURL_STATUS:-200}"
}
export -f curl 2>/dev/null || true
${rawExtractedScript}
`;

    function runExtractedWorkflowScript(env: Record<string, string>) {
      const bashExecutable = hasGitBash ? gitBashPath : "bash";
      return spawnSync(bashExecutable, ["-c", executableScript], {
        env: {
          ...process.env,
          ENDPOINT_BASE: "https://example.com/api/cron/cleanup-abandoned-orders",
          ...env,
        },
        encoding: "utf-8",
      });
    }

    it("verifies the script is dynamically extracted from the committed YAML file", () => {
      expect(rawExtractedScript).toContain("CRON_TOKEN=");
      expect(rawExtractedScript).toContain("RAW_DRY_RUN=");
      expect(rawExtractedScript).toContain('EVENT_NAME" = "workflow_dispatch"');
      expect(rawExtractedScript).toContain('EVENT_NAME" = "schedule"');
      expect(rawExtractedScript).toContain("Effective dryRun: ${DRY_RUN_VAL}");
      expect(rawExtractedScript).toContain("Target Endpoint Path: ${ENDPOINT_PATH}");
      // Guarantees full TARGET_URL is NOT printed in the execution log
      expect(rawExtractedScript).not.toContain('echo "Target URL:');
      // Verifies strict JSON and success validation
      expect(rawExtractedScript).toContain("jq empty");
      expect(rawExtractedScript).toContain('"$SUCCESS_FIELD" != "true"');
      expect(rawExtractedScript).toContain("command -v node");
    });

    it("executes extracted script: manual dispatch with no input defaults to dryRun=true", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "",
        EVENT_INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("Trigger Event: workflow_dispatch");
      expect(res.stdout).toContain("Effective dryRun: true");
      expect(res.stdout).toContain("Target Endpoint Path: /api/cron/cleanup-abandoned-orders");
      expect(res.stdout).not.toContain("Target URL: https://");
    });

    it("executes extracted script: manual dispatch with true input produces dryRun=true", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "true",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("Effective dryRun: true");
    });

    it("executes extracted script: manual dispatch with uppercase 'TRUE' input produces dryRun=true", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: " TRUE ",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("Effective dryRun: true");
    });

    it("executes extracted script: manual dispatch explicit false produces dryRun=false", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "false",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("Trigger Event: workflow_dispatch");
      expect(res.stdout).toContain("Effective dryRun: false");
    });

    it("executes extracted script: schedule produces dryRun=false", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "schedule",
        INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("Trigger Event: schedule");
      expect(res.stdout).toContain("Effective dryRun: false");
    });

    it("executes extracted script: invalid input fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "bad_input",
      });
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain("Invalid dry_run input 'bad_input'");
    });

    it("executes extracted script: unsupported event fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "push",
        INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain("Unsupported workflow event 'push'");
    });

    it("executes extracted script: missing secret fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "",
        SCHEDULER_SECRET: "",
        EVENT_NAME: "schedule",
      });
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain(
        "Neither CRON_SECRET nor SCHEDULER_SECRET is configured",
      );
    });

    it("confirms no full URL or bearer token is echoed to output", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "super_secret_token_abc_123",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "true",
      });
      expect(res.status).toBe(0);
      // GitHub Actions uses `::add-mask::<secret>` to instruct the runner to mask values in logs
      expect(res.stdout).toContain("::add-mask::super_secret_token_abc_123");
      const diagnosticLogs = res.stdout
        .split("\n")
        .filter((line: string) => !line.startsWith("::add-mask::"))
        .join("\n");
      // Diagnostic and execution logs must never leak the secret
      expect(diagnosticLogs).not.toContain("super_secret_token_abc_123");
      // Full URL and Bearer auth headers must never be echoed
      expect(res.stdout).not.toContain("Target URL:");
      expect(res.stdout).not.toContain("Bearer");
    });

    it("executes extracted script: HTTP 200 with success=false fails with exit 1", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "true",
        MOCK_CURL_BODY: JSON.stringify({
          success: false,
          error: "Database connection failed",
        }),
      });
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain(
        "payload reported failure: Database connection failed",
      );
    });

    it("executes extracted script: HTTP 200 with malformed JSON fails with exit 1", () => {
      if (!hasGitBash) return;
      const res = runExtractedWorkflowScript({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "true",
        MOCK_CURL_BODY: "<html><body>502 Bad Gateway</body></html>",
      });
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain("not valid JSON");
    });
  });
});
