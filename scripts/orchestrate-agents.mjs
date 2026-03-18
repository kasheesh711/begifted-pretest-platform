import { execFileSync, spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  assignmentFromIssue,
  buildLaunchCommand,
  mergeConfigWithDefaults,
  parseProjectUrl,
  resolveExecutionProfile,
} from "./lib/orchestrator.mjs";

const STATUS_FIELD = "Status";
const COMMENT_MARKER = "<!-- orchestrator-assignment -->";
const PROJECT_AGENT_OWNER_OPTIONS = {
  "PM/Spec Agent": "PM",
  "Platform Agent": "Platform",
  "Frontend Agent": "Frontend",
  "Content Pipeline Agent": "Content",
  "Grading/Diagnostics Agent": "Grading",
  "QA/Ops Agent": "QA",
};

function run(command, args, { cwd, allowFailure = false } = {}) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    throw error;
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    launch: true,
    maxIssues: null,
    issue: null,
    relaunch: false,
    repo: null,
    projectOwner: null,
    projectNumber: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--no-launch") {
      options.launch = false;
      continue;
    }

    if (token === "--relaunch") {
      options.relaunch = true;
      continue;
    }

    if (token === "--max") {
      options.maxIssues = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--issue") {
      options.issue = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--repo") {
      options.repo = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--project-owner") {
      options.projectOwner = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--project-number") {
      options.projectNumber = Number(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function fileExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(target, fallback) {
  if (!(await fileExists(target))) {
    return fallback;
  }

  const raw = await readFile(target, "utf8");
  return JSON.parse(raw);
}

function repoRoot() {
  return run("git", ["rev-parse", "--show-toplevel"]);
}

function inferRepoName() {
  return run("gh", [
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]);
}

function inferProject(repo) {
  const output = run("gh", ["variable", "list", "--repo", repo], {
    allowFailure: true,
  });

  const line = output
    .split("\n")
    .find((entry) => entry.startsWith("PROJECT_V2_URL\t"));

  if (!line) {
    return null;
  }

  const url = line.split("\t")[1];
  return parseProjectUrl(url);
}

function listReadyIssues(repo) {
  const raw = run("gh", [
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--json",
    "number,title,labels,url,milestone",
  ]);
  const issues = JSON.parse(raw);

  return issues.filter((issue) =>
    issue.labels.some((label) => label.name === "status: ready"),
  );
}

function getIssue(repo, issueNumber) {
  const raw = run("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repo,
    "--json",
    "number,title,labels,url,milestone,state",
  ]);

  return JSON.parse(raw);
}

function listProjectFields(project) {
  const raw = run("gh", [
    "project",
    "field-list",
    String(project.number),
    "--owner",
    project.owner,
    "--format",
    "json",
  ]);
  return JSON.parse(raw).fields;
}

function listProjectItems(project) {
  const raw = run("gh", [
    "project",
    "item-list",
    String(project.number),
    "--owner",
    project.owner,
    "--format",
    "json",
  ]);
  return JSON.parse(raw).items;
}

function optionIdByName(field, name) {
  return field?.options?.find((option) => option.name === name)?.id ?? null;
}

function itemIdForIssue(items, issueNumber) {
  return items.find((item) => item.content?.number === issueNumber)?.id ?? null;
}

function ensureWorktree(repoRootPath, assignment, dryRun) {
  if (dryRun) {
    return { created: false };
  }

  if (
    run("git", ["worktree", "list"], { cwd: repoRootPath }).includes(
      assignment.worktree,
    )
  ) {
    return { created: false };
  }

  run(
    "bash",
    [
      "scripts/new-agent-worktree.sh",
      assignment.agentName,
      String(assignment.issueNumber),
      assignment.slug,
      assignment.branchType,
    ],
    { cwd: repoRootPath },
  );

  return { created: true };
}

function launchProvider(command, assignment, dryRun, logsDir) {
  if (!command) {
    return {
      launched: false,
      reason: "No command template configured for provider.",
      command: null,
    };
  }

  if (dryRun) {
    return {
      launched: false,
      reason: "Dry run.",
      command,
    };
  }

  const logPath = path.join(
    logsDir,
    `${assignment.issueNumber}-${assignment.provider}.log`,
  );
  const logFile = openSync(logPath, "a");
  const child = spawn(command, {
    cwd: assignment.worktree,
    shell: true,
    detached: true,
    stdio: ["ignore", logFile, logFile],
  });

  child.unref();

  return {
    launched: true,
    reason: null,
    command,
    pid: child.pid,
    logPath,
  };
}

function upsertIssueComment(repo, issueNumber, body, dryRun) {
  if (dryRun) {
    return;
  }

  const raw = run("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repo,
    "--json",
    "comments",
  ]);
  const comments = JSON.parse(raw).comments;
  const existing = comments.find((comment) =>
    comment.body.includes(COMMENT_MARKER),
  );

  if (existing) {
    run("gh", [
      "api",
      "graphql",
      "-f",
      "query=mutation($id:ID!, $body:String!) { updateIssueComment(input:{id:$id, body:$body}) { issueComment { id } } }",
      "-f",
      `id=${existing.id}`,
      "-f",
      `body=${body}`,
    ]);
    return;
  }

  run("gh", [
    "issue",
    "comment",
    String(issueNumber),
    "--repo",
    repo,
    "--body",
    body,
  ]);
}

function removeReadyLabel(repo, issueNumber, dryRun) {
  if (dryRun) {
    return;
  }

  run(
    "gh",
    [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      repo,
      "--remove-label",
      "status: ready",
    ],
    { allowFailure: true },
  );
}

function ensureProjectItem(project, issueUrl, issueNumber) {
  const existingItems = listProjectItems(project);
  const existingId = itemIdForIssue(existingItems, issueNumber);

  if (existingId) {
    return {
      projectId: run("gh", [
        "project",
        "list",
        "--owner",
        project.owner,
        "--format",
        "json",
        "--jq",
        `.projects[] | select(.number==${project.number}) | .id`,
      ]),
      itemId: existingId,
      items: existingItems,
    };
  }

  run("gh", [
    "project",
    "item-add",
    String(project.number),
    "--owner",
    project.owner,
    "--url",
    issueUrl,
  ]);

  return {
    projectId: run("gh", [
      "project",
      "list",
      "--owner",
      project.owner,
      "--format",
      "json",
      "--jq",
      `.projects[] | select(.number==${project.number}) | .id`,
    ]),
    itemId: itemIdForIssue(listProjectItems(project), issueNumber),
    items: listProjectItems(project),
  };
}

function setProjectField({
  projectId,
  itemId,
  fieldId,
  optionId,
  text,
  dryRun,
}) {
  if (dryRun || !itemId || !fieldId) {
    return;
  }

  const args = [
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    projectId,
    "--field-id",
    fieldId,
  ];

  if (optionId) {
    args.push("--single-select-option-id", optionId);
  } else if (text !== undefined) {
    args.push("--text", text);
  } else {
    return;
  }

  run("gh", args);
}

function syncProjectMetadata({ project, assignment, dryRun }) {
  if (!project) {
    return;
  }

  const fields = listProjectFields(project);
  const projectItem = ensureProjectItem(
    project,
    assignment.issueUrl,
    assignment.issueNumber,
  );

  const statusField = fields.find((field) => field.name === STATUS_FIELD);
  const inProgressOption = optionIdByName(statusField, "In Progress");
  const agentOwnerField = fields.find((field) => field.name === "Agent Owner");
  const areaField = fields.find((field) => field.name === "Area");
  const worktreeField = fields.find((field) => field.name === "Worktree");
  const milestoneField = fields.find(
    (field) => field.name === "Target Milestone",
  );

  setProjectField({
    projectId: projectItem.projectId,
    itemId: projectItem.itemId,
    fieldId: statusField?.id,
    optionId: inProgressOption,
    dryRun,
  });
  setProjectField({
    projectId: projectItem.projectId,
    itemId: projectItem.itemId,
    fieldId: agentOwnerField?.id,
    optionId: optionIdByName(
      agentOwnerField,
      PROJECT_AGENT_OWNER_OPTIONS[assignment.role],
    ),
    dryRun,
  });
  setProjectField({
    projectId: projectItem.projectId,
    itemId: projectItem.itemId,
    fieldId: areaField?.id,
    optionId: optionIdByName(areaField, assignment.area),
    dryRun,
  });
  setProjectField({
    projectId: projectItem.projectId,
    itemId: projectItem.itemId,
    fieldId: worktreeField?.id,
    text: assignment.worktree,
    dryRun,
  });
  setProjectField({
    projectId: projectItem.projectId,
    itemId: projectItem.itemId,
    fieldId: milestoneField?.id,
    text: assignment.milestone ?? "",
    dryRun,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const currentRepoRoot = repoRoot();
  const configPath = path.join(currentRepoRoot, "orchestrator.config.json");
  const config = await loadJson(configPath, {});
  const resolved = mergeConfigWithDefaults(config);
  const repo = options.repo ?? resolved.repo ?? inferRepoName();
  const workspaceRoot =
    process.env.WORKSPACE_ROOT ??
    path.join(path.dirname(currentRepoRoot), "workspace");
  const project =
    options.projectOwner && options.projectNumber
      ? { owner: options.projectOwner, number: options.projectNumber }
      : (resolved.project ?? inferProject(repo));
  const commandTemplates = resolved.providers;
  const tmpDir = path.join(currentRepoRoot, "tmp");
  const statePath = path.join(tmpDir, "orchestrator-state.json");
  const logsDir = path.join(tmpDir, "orchestrator-logs");
  const runsDir = path.join(tmpDir, "orchestrator-runs");
  const lockPath = path.join(tmpDir, "orchestrator.lock");

  await mkdir(tmpDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });
  await writeFile(lockPath, String(process.pid), { flag: "wx" });

  try {
    const state = await loadJson(statePath, { launches: {} });

    const issues = options.issue
      ? [getIssue(repo, options.issue)].filter((issue) =>
          options.relaunch
            ? issue.state === "OPEN"
            : issue.labels.some((label) => label.name === "status: ready"),
        )
      : listReadyIssues(repo).slice(0, options.maxIssues ?? resolved.maxIssues);

    const results = [];

    for (const issue of issues) {
      const assignment = assignmentFromIssue(
        issue,
        currentRepoRoot,
        workspaceRoot,
      );

      if (!assignment) {
        continue;
      }

      assignment.execution = resolveExecutionProfile(
        issue,
        assignment,
        resolved,
      );

      const existingLaunch = state.launches[String(issue.number)];
      const worktreeResult = ensureWorktree(
        currentRepoRoot,
        assignment,
        options.dryRun,
      );

      syncProjectMetadata({
        project,
        assignment,
        dryRun: options.dryRun,
      });

      let launchResult;

      if (existingLaunch && !options.relaunch) {
        launchResult = {
          launched: false,
          reason: "Existing launch record found; skipping.",
          command: existingLaunch.command ?? null,
          pid: existingLaunch.pid ?? null,
          logPath: existingLaunch.logPath ?? null,
        };
      } else if (!options.launch) {
        launchResult = {
          launched: false,
          reason: "Launch disabled by flag.",
          command: buildLaunchCommand({
            assignment,
            templates: commandTemplates,
            repo,
            repoRoot: currentRepoRoot,
          }),
        };
      } else {
        const command = buildLaunchCommand({
          assignment,
          templates: commandTemplates,
          repo,
          repoRoot: currentRepoRoot,
        });
        launchResult = launchProvider(
          command,
          assignment,
          options.dryRun,
          logsDir,
        );
      }

      const commentBody = [
        COMMENT_MARKER,
        "## Orchestrator Assignment",
        "",
        `- Provider: \`${assignment.provider}\``,
        `- Role: \`${assignment.role}\``,
        `- Branch: \`${assignment.branch}\``,
        `- Worktree: \`${assignment.worktree}\``,
        `- Tier: \`${assignment.execution.tier}\``,
        `- Model: \`${assignment.execution.model}\``,
        `- Effort: \`${assignment.execution.effort}\``,
        `- Routing reason: ${assignment.execution.reason}`,
        `- Handoff: \`${path.relative(currentRepoRoot, assignment.handoffPath)}\``,
        `- Launch status: \`${launchResult.launched ? "launched" : "prepared"}\``,
        `- Launch reason: ${launchResult.reason ?? "started"}`,
        launchResult.command ? `- Command: \`${launchResult.command}\`` : null,
      ]
        .filter(Boolean)
        .join("\n");

      upsertIssueComment(repo, issue.number, commentBody, options.dryRun);

      if (launchResult.launched) {
        removeReadyLabel(repo, issue.number, options.dryRun);
        state.launches[String(issue.number)] = {
          provider: assignment.provider,
          branch: assignment.branch,
          worktree: assignment.worktree,
          handoffPath: assignment.handoffPath,
          execution: assignment.execution,
          launchedAt: new Date().toISOString(),
          command: launchResult.command,
          pid: launchResult.pid ?? null,
          logPath: launchResult.logPath ?? null,
        };
      }

      results.push({
        issue: issue.number,
        title: issue.title,
        provider: assignment.provider,
        tier: assignment.execution.tier,
        model: assignment.execution.model,
        effort: assignment.execution.effort,
        branch: assignment.branch,
        worktree: assignment.worktree,
        createdWorktree: worktreeResult.created,
        launched: launchResult.launched,
        reason: launchResult.reason,
      });
    }

    if (!options.dryRun) {
      await writeFile(statePath, JSON.stringify(state, null, 2));
    }

    const runLog = {
      ranAt: new Date().toISOString(),
      repo,
      project,
      options,
      results,
    };
    const runPath = path.join(
      runsDir,
      `${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );

    await writeFile(runPath, JSON.stringify(runLog, null, 2));

    console.table(results);
    console.log(`Run log: ${runPath}`);
  } finally {
    await unlink(lockPath).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
