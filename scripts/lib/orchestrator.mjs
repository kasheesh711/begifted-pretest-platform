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
    provider: "codex",
    agentName: "codex-content",
    role: "Content Pipeline Agent",
    area: "content",
    handoff: "docs/handoffs/codex-content.md",
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
};

const DEFAULT_EXECUTION_PROFILES = {
  codex: {
    economy: {
      model: "gpt-5.4-mini",
      effort: "low",
    },
    balanced: {
      model: "gpt-5.4-mini",
      effort: "medium",
    },
    deep: {
      model: "gpt-5.4",
      effort: "high",
    },
  },
  claude: {
    economy: {
      model: "sonnet",
      effort: "low",
    },
    balanced: {
      model: "sonnet",
      effort: "medium",
    },
    deep: {
      model: "opus",
      effort: "high",
    },
  },
};

const DEFAULT_ROLE_TIERS = {
  "PM/Spec Agent": "economy",
  "Frontend Agent": "balanced",
  "Content Pipeline Agent": "economy",
  "Platform Agent": "balanced",
  "Grading/Diagnostics Agent": "deep",
  "QA/Ops Agent": "balanced",
};

const DEEP_LABELS = new Set([
  "risk: high",
  "priority: p0",
  "priority: p1",
  "shared-contract",
  "shared-scope",
  "coordination-required",
  "security",
]);

const DEEP_TITLE_PATTERNS = [
  /\bauth\b/i,
  /\bmigration\b/i,
  /\brefactor\b/i,
  /\bcontract\b/i,
  /\bschema\b/i,
  /\bdiagnostic/i,
  /\bgrading\b/i,
  /\breport\b/i,
  /\borchestrat/i,
  /\breview-queue\b/i,
  /\bpersistence\b/i,
  /\bintegration\b/i,
];

const ECONOMY_TITLE_PATTERNS = [
  /\bshell\b/i,
  /\bstub\b/i,
  /\bseed\b/i,
  /\bscaffold\b/i,
  /\blanding\b/i,
  /\bcopy\b/i,
  /\bcontent\b/i,
  /\bqa\b/i,
  /\bdoc/i,
  /\bimport\b/i,
  /\bnormalize\b/i,
  /\bwire\b/i,
];

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function mergeExecutionProfiles(config = {}) {
  const configuredProfiles = config.routing?.profiles ?? {};
  const mergedProfiles = {};

  for (const provider of Object.keys(DEFAULT_EXECUTION_PROFILES)) {
    mergedProfiles[provider] = {};

    for (const tier of Object.keys(DEFAULT_EXECUTION_PROFILES[provider])) {
      mergedProfiles[provider][tier] = {
        ...DEFAULT_EXECUTION_PROFILES[provider][tier],
        ...(configuredProfiles[provider]?.[tier] ?? {}),
      };
    }
  }

  return mergedProfiles;
}

function mergeRoleTiers(config = {}) {
  return {
    ...DEFAULT_ROLE_TIERS,
    ...(config.routing?.roleTiers ?? {}),
  };
}

function providerLaunchArgs(provider, profile) {
  if (provider === "codex") {
    return [
      "-m",
      shellQuote(profile.model),
      "-c",
      shellQuote(`model_reasoning_effort="${profile.effort}"`),
    ].join(" ");
  }

  if (provider === "claude") {
    return [
      "--model",
      shellQuote(profile.model),
      "--effort",
      shellQuote(profile.effort),
    ].join(" ");
  }

  return "";
}

function selectExecutionTier(issue, assignment, roleTiers) {
  const labelNames = assignment.labelNames;
  const title = issue.title;

  if (labelNames.some((label) => DEEP_LABELS.has(label.toLowerCase()))) {
    return {
      tier: "deep",
      reason: "high-risk or shared-scope label",
    };
  }

  if (DEEP_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return {
      tier: "deep",
      reason: "complex title keywords",
    };
  }

  if (ECONOMY_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return {
      tier: "economy",
      reason: "narrow shell/seed/stub style task",
    };
  }

  return {
    tier: roleTiers[assignment.role] ?? "balanced",
    reason: `default ${assignment.role} routing`,
  };
}

export function resolveExecutionProfile(issue, assignment, config = {}) {
  const profiles = mergeExecutionProfiles(config);
  const roleTiers = mergeRoleTiers(config);
  const selectedTier = selectExecutionTier(issue, assignment, roleTiers);
  const providerProfiles = profiles[assignment.provider];

  if (!providerProfiles) {
    return {
      tier: selectedTier.tier,
      model: "",
      effort: "",
      reason: selectedTier.reason,
      launchArgs: "",
    };
  }

  const selectedProfile =
    providerProfiles[selectedTier.tier] ?? providerProfiles.balanced;

  return {
    tier: selectedTier.tier,
    model: selectedProfile.model,
    effort: selectedProfile.effort,
    reason: selectedTier.reason,
    launchArgs: providerLaunchArgs(assignment.provider, selectedProfile),
  };
}

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
    model: assignment.execution?.model ?? "",
    effort: assignment.execution?.effort ?? "",
    tier: assignment.execution?.tier ?? "",
    launch_args: assignment.execution?.launchArgs ?? "",
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
    routing: {
      profiles: mergeExecutionProfiles(config),
      roleTiers: mergeRoleTiers(config),
    },
  };
}
