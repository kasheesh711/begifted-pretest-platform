#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <agent-name> <issue-id> <slug> [branch-type]"
  exit 1
fi

AGENT_NAME="$1"
ISSUE_ID="$2"
SLUG="$3"
BRANCH_TYPE="${4:-feat}"
BRANCH_NAME="codex/${BRANCH_TYPE}/${ISSUE_ID}-${SLUG}"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$(cd "${REPO_ROOT}/.." && pwd)/workspace}"
AGENT_DIR="${WORKSPACE_ROOT}/agents/${AGENT_NAME}-${ISSUE_ID}"

mkdir -p "${WORKSPACE_ROOT}/agents"

if git -C "${REPO_ROOT}" rev-parse --verify "${BRANCH_NAME}" >/dev/null 2>&1; then
  git -C "${REPO_ROOT}" worktree add "${AGENT_DIR}" "${BRANCH_NAME}"
else
  git -C "${REPO_ROOT}" worktree add -b "${BRANCH_NAME}" "${AGENT_DIR}"
fi

echo "Created worktree at ${AGENT_DIR}"
echo "Branch: ${BRANCH_NAME}"
