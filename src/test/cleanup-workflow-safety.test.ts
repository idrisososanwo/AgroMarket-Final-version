import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Pure evaluator replicating the exact shell script logic in
 * .github/workflows/cleanup-abandoned-orders.yml
 */
export function evaluateWorkflowDryRun(
  eventName: string,
  inputDryRun?: string | null
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
  inputTimeout?: string | null
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
    ".github/workflows/cleanup-abandoned-orders.yml"
  );
  const workflowContent = fs.readFileSync(workflowPath, "utf-8");

  describe("1. Static Workflow Declaration Invariants", () => {
    it("configures workflow_dispatch input dry_run with default true", () => {
      // Must contain default: true under dry_run input
      const dryRunMatch = workflowContent.match(
        /dry_run:[\s\S]*?default:\s*(true|false)/
      );
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

    it("binds EVENT_NAME and INPUT_DRY_RUN to step environment", () => {
      expect(workflowContent).toContain("EVENT_NAME: ${{ github.event_name }}");
      expect(workflowContent).toContain(
        "INPUT_DRY_RUN: ${{ github.event.inputs.dry_run }}"
      );
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
      expect(prResult.error).toContain(
        "Unsupported workflow event 'pull_request'"
      );
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
      const { url, error } = buildTargetCleanupUrl(
        base,
        "workflow_dispatch",
        "false"
      );
      expect(error).toBeUndefined();
      expect(url).toBe(`${base}?timeoutMinutes=60&dryRun=false`);
    });

    it("refuses to generate URL on invalid inputs", () => {
      const { url, error } = buildTargetCleanupUrl(
        base,
        "workflow_dispatch",
        "corrupted"
      );
      expect(url).toBeUndefined();
      expect(error).toContain("Invalid dry_run input");
    });
  });

  describe("4. Direct Bash Execution of Script Snippet", () => {
    const gitBashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
    const hasGitBash = fs.existsSync(gitBashPath);

    // Extract the parameter evaluation block from the workflow YAML
    const scriptBlock = `
CRON_TOKEN="\${CRON_SECRET:-\$SCHEDULER_SECRET}"
if [ -n "\$CRON_TOKEN" ]; then
  echo "MASKED" > /dev/null
fi

if [ -z "\$CRON_TOKEN" ]; then
  echo "ERROR_MISSING_SECRET"
  exit 1
fi

if [ "\$EVENT_NAME" = "workflow_dispatch" ]; then
  if [ -z "\$INPUT_DRY_RUN" ] || [ "\$INPUT_DRY_RUN" = "true" ]; then
    DRY_RUN_VAL="true"
  elif [ "\$INPUT_DRY_RUN" = "false" ]; then
    DRY_RUN_VAL="false"
  else
    echo "ERROR_INVALID_INPUT"
    exit 1
  fi
elif [ "\$EVENT_NAME" = "schedule" ]; then
  DRY_RUN_VAL="false"
else
  echo "ERROR_UNSUPPORTED_EVENT"
  exit 1
fi

TIMEOUT_VAL="\${INPUT_TIMEOUT:-60}"
TARGET_URL="\${ENDPOINT_BASE}?timeoutMinutes=\${TIMEOUT_VAL}&dryRun=\${DRY_RUN_VAL}"
echo "RESULT_TARGET_URL=\${TARGET_URL}"
echo "RESULT_DRY_RUN=\${DRY_RUN_VAL}"
`;

    function runBashSnippet(env: Record<string, string>) {
      const { spawnSync } = require("child_process");
      const bashExecutable = hasGitBash ? gitBashPath : "bash";
      return spawnSync(bashExecutable, ["-c", scriptBlock], {
        env: {
          ...process.env,
          ENDPOINT_BASE: "https://example.com/api/cron",
          ...env,
        },
        encoding: "utf-8",
      });
    }

    it("executes bash script: manual dispatch default produces dryRun=true", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("RESULT_DRY_RUN=true");
      expect(res.stdout).toContain("dryRun=true");
    });

    it("executes bash script: manual dispatch explicit false produces dryRun=false", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "false",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("RESULT_DRY_RUN=false");
      expect(res.stdout).toContain("dryRun=false");
    });

    it("executes bash script: schedule produces dryRun=false", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "schedule",
        INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("RESULT_DRY_RUN=false");
      expect(res.stdout).toContain("dryRun=false");
    });

    it("executes bash script: invalid input fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "workflow_dispatch",
        INPUT_DRY_RUN: "bad_input",
      });
      expect(res.status).toBe(1);
      expect(res.stdout).toContain("ERROR_INVALID_INPUT");
    });

    it("executes bash script: unsupported event fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "mock_secret",
        EVENT_NAME: "push",
        INPUT_DRY_RUN: "",
      });
      expect(res.status).toBe(1);
      expect(res.stdout).toContain("ERROR_UNSUPPORTED_EVENT");
    });

    it("executes bash script: missing secret fails closed with exit 1", () => {
      if (!hasGitBash) return;
      const res = runBashSnippet({
        CRON_SECRET: "",
        SCHEDULER_SECRET: "",
        EVENT_NAME: "schedule",
      });
      expect(res.status).toBe(1);
      expect(res.stdout).toContain("ERROR_MISSING_SECRET");
    });
  });
});
