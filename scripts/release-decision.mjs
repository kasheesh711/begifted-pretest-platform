import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import process from "node:process";

import { changedFilesSinceRef, decideRelease } from "./lib/release-policy.mjs";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function setOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return Promise.resolve();
  }

  return writeFile(outputPath, `${key}=${value}\n`, { flag: "a" });
}

async function main() {
  let baseRef = "";

  try {
    baseRef = git(["describe", "--tags", "--abbrev=0"]);
  } catch {
    baseRef = git(["rev-list", "--max-parents=0", "HEAD"]);
  }

  const changedFiles = changedFilesSinceRef(baseRef);
  const decision = decideRelease(changedFiles);
  const notes = [
    `Base ref: \`${baseRef}\``,
    "",
    `Release eligible: \`${decision.shouldRelease}\``,
    "",
    "### Release-relevant files",
    "",
    ...decision.releaseFiles.map((file) => `- \`${file}\``),
  ].join("\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `${notes}\n`, {
      flag: "a",
    });
  }

  await setOutput("should_release", String(decision.shouldRelease));
  await setOutput("tag_name", decision.tagName);
  await setOutput("release_title", decision.title);
  await setOutput("release_notes_path", "tmp/release-notes.md");

  await writeFile("tmp/release-notes.md", notes);

  console.log(
    JSON.stringify(
      {
        baseRef,
        ...decision,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
