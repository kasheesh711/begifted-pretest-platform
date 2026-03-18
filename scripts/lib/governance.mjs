const AREA_RULES = {
  frontend: ["apps/web/", "packages/ui/"],
  backend: ["apps/api/"],
  content: ["content/", "packages/content-tools/"],
  infra: [
    ".github/",
    "infra/",
    "scripts/",
    "package.json",
    "package-lock.json",
    "turbo.json",
    "tsconfig.base.json",
    "biome.json",
    ".nvmrc",
  ],
  docs: ["docs/", "AGENTS.md", "README.md"],
  data: ["packages/core/"],
};

const SHARED_CONTRACT_PREFIXES = [
  "packages/core/",
  "docs/API_CONTRACTS.md",
  "docs/DATA_MODEL.md",
  "docs/CONTENT_MODEL.md",
];

const RELEASE_PATH_PREFIXES = [
  "apps/",
  "packages/",
  "content/",
  "infra/",
  ".github/",
  "package.json",
  "package-lock.json",
  "turbo.json",
  "tsconfig.base.json",
  "biome.json",
  ".nvmrc",
];

function matchesPrefix(file, prefixes) {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

export function classifyFiles(changedFiles) {
  const normalized = changedFiles.filter(Boolean);
  const areas = new Set();

  for (const file of normalized) {
    for (const [area, prefixes] of Object.entries(AREA_RULES)) {
      if (matchesPrefix(file, prefixes)) {
        areas.add(area);
      }
    }
  }

  const ownerAreas = [...areas].filter((area) =>
    ["frontend", "backend", "content", "infra", "data"].includes(area),
  );

  return {
    changedFiles: normalized,
    areas: [...areas].sort(),
    ownerAreas: ownerAreas.sort(),
    sharedContractFiles: normalized.filter((file) =>
      matchesPrefix(file, SHARED_CONTRACT_PREFIXES),
    ),
    releaseRelevantFiles: normalized.filter((file) =>
      matchesPrefix(file, RELEASE_PATH_PREFIXES),
    ),
    docsTouched: normalized.some((file) =>
      matchesPrefix(file, ["docs/", "AGENTS.md", "README.md"]),
    ),
    decisionLogTouched: normalized.includes("docs/DECISIONS.md"),
  };
}

export function hasIssueLink(prBody) {
  return /#\d+/.test(prBody);
}

export function hasHandoffSection(prBody) {
  return /##\s+Handoff/i.test(prBody);
}

export function evaluateGovernance(input) {
  const { changedFiles, prBody = "" } = input;
  const classification = classifyFiles(changedFiles);
  const blockers = [];
  const sharedContractChange = classification.sharedContractFiles.length > 0;
  const sharedScopeChange =
    classification.ownerAreas.length > 1 || sharedContractChange;
  const releaseCandidate = classification.releaseRelevantFiles.length > 0;

  if (!hasIssueLink(prBody)) {
    blockers.push("PR body is missing a linked issue reference.");
  }

  if (!hasHandoffSection(prBody)) {
    blockers.push("PR body is missing the required Handoff section.");
  }

  if (
    (sharedContractChange || classification.areas.includes("infra")) &&
    !classification.decisionLogTouched
  ) {
    blockers.push(
      "Shared contract or infra changes require an update to docs/DECISIONS.md.",
    );
  }

  if (
    sharedContractChange &&
    !classification.changedFiles.some((file) =>
      [
        "docs/API_CONTRACTS.md",
        "docs/DATA_MODEL.md",
        "docs/CONTENT_MODEL.md",
      ].includes(file),
    )
  ) {
    blockers.push(
      "Shared contract changes require a matching update to API, data, or content contract documentation.",
    );
  }

  const lane =
    sharedScopeChange || classification.areas.includes("infra")
      ? "coordinated"
      : "fast";
  const autoApproveEligible = blockers.length === 0;

  return {
    ...classification,
    lane,
    sharedContractChange,
    sharedScopeChange,
    releaseCandidate,
    autoApproveEligible,
    blockers,
  };
}

export function policyLabels(evaluation) {
  const labels = new Set();

  labels.add(
    evaluation.lane === "fast" ? "policy: fast-lane" : "policy: coordinated",
  );

  if (evaluation.sharedContractChange) {
    labels.add("policy: shared-contracts");
  }

  if (evaluation.sharedScopeChange) {
    labels.add("policy: shared-scope");
  }

  if (evaluation.releaseCandidate) {
    labels.add("policy: release-candidate");
  }

  if (evaluation.blockers.length > 0) {
    labels.add("policy: blocked");
  }

  if (evaluation.autoApproveEligible) {
    labels.add("policy: auto-approve");
  }

  return [...labels].sort();
}

export function renderGovernanceSummary(evaluation) {
  const lines = [
    "## Governance Summary",
    "",
    `- Lane: \`${evaluation.lane}\``,
    `- Auto-approve eligible: \`${evaluation.autoApproveEligible}\``,
    `- Shared contracts touched: \`${evaluation.sharedContractChange}\``,
    `- Shared scope touched: \`${evaluation.sharedScopeChange}\``,
    `- Release candidate: \`${evaluation.releaseCandidate}\``,
    `- Areas: ${evaluation.areas.length > 0 ? evaluation.areas.map((area) => `\`${area}\``).join(", ") : "none"}`,
    "",
  ];

  if (evaluation.blockers.length > 0) {
    lines.push("### Blockers", "");
    for (const blocker of evaluation.blockers) {
      lines.push(`- ${blocker}`);
    }
    lines.push("");
  }

  if (evaluation.changedFiles.length > 0) {
    lines.push("### Files", "");
    for (const file of evaluation.changedFiles) {
      lines.push(`- \`${file}\``);
    }
  }

  return lines.join("\n");
}
