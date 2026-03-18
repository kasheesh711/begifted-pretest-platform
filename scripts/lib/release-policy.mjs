import { execFileSync } from "node:child_process";

const RELEASE_PATH_PREFIXES = [
  "apps/",
  "packages/",
  "content/",
  "infra/",
  "package.json",
  "package-lock.json",
  "turbo.json",
  "tsconfig.base.json",
  "biome.json",
  ".nvmrc",
];

function matchesPrefix(file) {
  return RELEASE_PATH_PREFIXES.some(
    (prefix) => file === prefix || file.startsWith(prefix),
  );
}

export function selectReleaseFiles(changedFiles) {
  return changedFiles.filter((file) => matchesPrefix(file));
}

export function decideRelease(changedFiles, now = new Date()) {
  const releaseFiles = selectReleaseFiles(changedFiles);
  const shouldRelease = releaseFiles.length > 0;
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const tagName = `release-${timestamp}`;

  return {
    changedFiles,
    releaseFiles,
    shouldRelease,
    tagName,
    title: `Automated release ${tagName}`,
  };
}

export function changedFilesSinceRef(baseRef) {
  const raw = execFileSync(
    "git",
    ["diff", "--name-only", `${baseRef}...HEAD`],
    {
      encoding: "utf8",
    },
  );

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
