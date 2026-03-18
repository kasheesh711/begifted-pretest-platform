# Decisions

## ADR-001: Single monorepo

- Status: accepted
- Decision: keep application code, tooling, docs, and content operations in one repository
- Rationale: reduces cross-repo coordination overhead for parallel agents

## ADR-002: GitHub as delivery system of record

- Status: accepted
- Decision: use GitHub Issues, Projects, PRs, and Actions as the operational backbone
- Rationale: provides a unified queue, approval flow, and visible progress surface

## ADR-003: Git worktrees for agent isolation

- Status: accepted
- Decision: each agent works in a dedicated worktree and short-lived branch
- Rationale: prevents filesystem conflicts and keeps branch ownership explicit

## ADR-004: Hybrid grading

- Status: accepted
- Decision: deterministic auto-grading for objective items, review-required handling for subjective items
- Rationale: protects grading quality while still reducing manual effort

## ADR-005: Code-owned reporting template

- Status: accepted
- Decision: rebuild the report template in code instead of editing the static PDF directly
- Rationale: enables variable insertion, auditability, and version-controlled design changes

## ADR-006: Multi-provider agent support

- Status: accepted
- Decision: support Codex and Claude Code under one shared workflow
- Rationale: keeps parallel implementation capacity while reducing provider-specific operational complexity

## ADR-007: Policy-driven merge and release automation

- Status: accepted
- Decision: use machine-evaluated governance rules to auto-approve eligible PRs, detect shared-contract and shared-scope changes, and create releases from `main`
- Rationale: removes manual orchestration bottlenecks while keeping risky changes explicit and auditable

## ADR-008: Shared grading shell contracts

- Status: accepted
- Decision: keep the grading seed and review-resolution payload shapes in `packages/core`, while the API shell uses in-memory storage until persistence and job orchestration land
- Rationale: allows route consumers to integrate against one shared contract source without prematurely introducing database or workflow infrastructure
