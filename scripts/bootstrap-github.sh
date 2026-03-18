#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Authenticate gh first with: gh auth login"
  exit 1
fi

declare -a LABELS=(
  "type: feature|0e7490|Feature work"
  "type: bug|b42318|Bug fix work"
  "status: ready|2563eb|Ready to start"
  "status: blocked|d97706|Blocked work"
  "agent: pm|6d28d9|PM/Spec Agent"
  "agent: platform|0f766e|Platform Agent"
  "agent: frontend|1d4ed8|Frontend Agent"
  "agent: content|15803d|Content Pipeline Agent"
  "agent: grading|b45309|Grading and diagnostics agent"
  "agent: qa-ops|7c3aed|QA and ops agent"
)

for item in "${LABELS[@]}"; do
  IFS="|" read -r name color description <<<"${item}"
  gh label create "${name}" --color "${color}" --description "${description}" >/dev/null 2>&1 || \
    gh label edit "${name}" --color "${color}" --description "${description}" >/dev/null
done

cat <<'EOF'
GitHub bootstrap complete.

Manual follow-up:
1. Enable branch protection on main.
2. Create the GitHub Project fields listed in docs/OPS_RUNBOOK.md.
3. Set repository variable PROJECT_V2_URL to enable automatic project assignment.
4. Replace placeholder values in .github/CODEOWNERS and .github/ISSUE_TEMPLATE/config.yml.
EOF
