import { execFileSync } from "node:child_process";

function parseWorktrees(raw) {
  const sections = raw.trim().split("\n\n").filter(Boolean);
  return sections.map((section) => {
    const lines = section.split("\n");
    const record = {};

    for (const line of lines) {
      const [key, ...rest] = line.split(" ");
      record[key] = rest.join(" ");
    }

    return {
      worktree: record.worktree,
      branch: record.branch?.replace("refs/heads/", "") ?? "detached",
    };
  });
}

try {
  const raw = execFileSync("git", ["worktree", "list", "--porcelain"], {
    encoding: "utf8",
  });
  const rows = parseWorktrees(raw);
  console.table(rows);
} catch (error) {
  console.error("Unable to inspect git worktrees. Initialize git first.");
  process.exit(1);
}
