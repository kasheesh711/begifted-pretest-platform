import path from "node:path";

const ROLE_ASSIGNMENTS = {
  "agent: frontend": {
    provider: "claude",
    agentName: "claude-frontend",
    role: "Frontend Agent",
    area: "frontend",
    handoff: "docs/handoffs/claude-code-frontend.md",
  },
  "agent: content": {
    provider: "gemini",
    agentName: "gemini-content",
    role: "Content Pipeline Agent",
    area: "content",
    handoff: "docs/handoffs/gemini-antigravity-content.md",
  },
  "agent: platform": {
    provider: "codex",
    agentName: "codex-platform",
    role: "Platform Agent",
    area: "backend",
    handoff: "docs/handoffs/codex-platform.md",
  },
  "agent: grading": {
    provider: "codex",
    agentName: "codex-grading",
    role: "Grading/Diagnostics Agent",
    area: "data",
    handoff: "docs/handoffs/codex-platform.md",
  },
  "agent: qa-ops": {
    provider: "codex",
    agentName: "codex-qa-ops",
    role: "QA/Ops Agent",
    area: "infra",
    handoff: "docs/handoffs/codex-platform.md",
  },
  "agent: pm": {
    provider: "codex",
    agentName: "codex-pm",
    role: "PM/Spec Agent",
    area: "docs",
    handoff: "docs/handoffs/README.md",
  },
};

const PROVIDER_ENV_KEYS = {
  codex: "ORCH_CODEX_CMD",
  claude: "ORCH_CLAUDE_CMD",
  gemini: "ORCH_GEMINI_CMD",
};

export function slugifyIssueTitle(title) {
  return title
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function branchTypeFromLabels(labels) {
  if (labels.includes("type: bug")) {
    return "fix";
  }

  if (labels.includes("documentation")) {
    return "docs";
  }

  return "feat";
}

export function assignmentFromIssue(issue, repoRoot, workspaceRoot) {
  const labelNames = issue.labels.map((label) => label.name);
  const agentLabel = labelNames.find((label) => ROLE_ASSIGNMENTS[label]);

  if (!agentLabel) {
    return null;
  }

  const roleConfig = ROLE_ASSIGNMENTS[agentLabel];
  const slug = slugifyIssueTitle(issue.title);
  const branchType = branchTypeFromLabels(labelNames);
  const branch = `codex/${branchType}/${issue.number}-${slug}`;
  const worktree = path.join(
    workspaceRoot,
    "agents",
    `${roleConfig.agentName}-${issue.number}`,
  );

  return {
    issueNumber: issue.number,
    issueTitle: issue.title,
    issueUrl: issue.url,
    milestone: issue.milestone?.title ?? null,
    provider: roleConfig.provider,
    role: roleConfig.role,
    area: roleConfig.area,
    agentName: roleConfig.agentName,
    branchType,
    branch,
    slug,
    worktree,
    handoffPath: path.join(repoRoot, roleConfig.handoff),
    labelNames,
  };
}

export function loadCommandTemplates(config = {}, env = process.env) {
  const providers = config.providers ?? {};

  return {
    codex:
      providers.codex?.commandTemplate ?? env[PROVIDER_ENV_KEYS.codex] ?? null,
    claude:
      providers.claude?.commandTemplate ??
      env[PROVIDER_ENV_KEYS.claude] ??
      null,
    gemini:
      providers.gemini?.commandTemplate ??
      env[PROVIDER_ENV_KEYS.gemini] ??
      null,
  };
}

export function renderTemplate(template, context) {
  return template.replaceAll(/\{(\w+)\}/g, (_, key) =>
    key in context ? String(context[key]) : "",
  );
}

export function buildLaunchContext({ assignment, repo, repoRoot }) {
  return {
    issue: assignment.issueNumber,
    issue_title: assignment.issueTitle,
    issue_url: assignment.issueUrl,
    provider: assignment.provider,
    role: assignment.role,
    branch: assignment.branch,
    worktree: assignment.worktree,
    handoff: assignment.handoffPath,
    repo,
    repo_root: repoRoot,
    milestone: assignment.milestone ?? "",
  };
}

export function buildLaunchCommand({ assignment, templates, repo, repoRoot }) {
  const template = templates[assignment.provider];

  if (!template) {
    return null;
  }

  return renderTemplate(
    template,
    buildLaunchContext({ assignment, repo, repoRoot }),
  );
}

export function parseProjectUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);

  const isUserProject =
    parts.length === 4 &&
    (parts[0] === "users" || parts[0] === "orgs") &&
    parts[2] === "projects";
  const isLegacyProject = parts.length === 3 && parts[1] === "projects";

  if (!isUserProject && !isLegacyProject) {
    throw new Error(`Unsupported project URL: ${url}`);
  }

  const owner = isUserProject ? parts[1] : parts[0];
  const number = Number(isUserProject ? parts[3] : parts[2]);

  if (!owner || Number.isNaN(number)) {
    throw new Error(`Unsupported project URL: ${url}`);
  }

  return {
    owner,
    number,
    url,
  };
}

export function mergeConfigWithDefaults(config = {}, env = process.env) {
  return {
    maxIssues: Number(config.maxIssues ?? env.ORCH_MAX_ISSUES ?? 3),
    dryRun: false,
    launch: true,
    repo: config.repo ?? null,
    project: config.project ?? null,
    providers: loadCommandTemplates(config, env),
  };
}
