import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import {
  evaluateGovernance,
  policyLabels,
  renderGovernanceSummary,
} from "./lib/governance.mjs";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    args[key] = value;
    index += 1;
  }

  return args;
}

function setOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  return writeFile(outputPath, `${key}=${value}\n`, { flag: "a" });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input;

  if (!inputPath) {
    throw new Error("Missing --input path");
  }

  const raw = await readFile(inputPath, "utf8");
  const input = JSON.parse(raw);
  const evaluation = evaluateGovernance(input);
  const labels = policyLabels(evaluation);
  const summary = renderGovernanceSummary(evaluation);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, {
      flag: "a",
    });
  }

  await setOutput("lane", evaluation.lane);
  await setOutput("auto_approve", String(evaluation.autoApproveEligible));
  await setOutput("shared_contracts", String(evaluation.sharedContractChange));
  await setOutput("shared_scope", String(evaluation.sharedScopeChange));
  await setOutput("release_candidate", String(evaluation.releaseCandidate));
  await setOutput("blockers_count", String(evaluation.blockers.length));
  await setOutput("labels_json", JSON.stringify(labels));

  console.log(
    JSON.stringify(
      {
        evaluation,
        labels,
        summary,
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
