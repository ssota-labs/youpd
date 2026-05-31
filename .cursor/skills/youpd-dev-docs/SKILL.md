---
name: youpd-dev-docs
description: Write and maintain YouPD development documents (PRD, 설계안, ADR, 리서치, 가이드, 릴리즈 노트) in Notion as the long-term SSOT. Use whenever the user asks for PRD, 설계안, ADR, 개발 문서, Notion 문서화, product spec, architecture decision, design doc, release notes, or wants to create/update docs in the 유PD 개발 문서 database—even if they do not say "Notion" explicitly.
---

# YouPD Development Docs

Standard workflow for authoring and updating YouPD product and engineering documents in Notion.

## When to use

Use this skill when the user wants to:

- Create or update a **PRD**, **설계문서**, **ADR**, **리서치**, **가이드**, **스킬**, **제품 로드맵**, or **릴리즈 노트**
- Document a feature, architecture decision, or release in Notion
- Align repo notes with the canonical Notion record
- Find or revise an existing YouPD dev document before writing a new one

Do **not** use this skill for SSOT discovery, database ID mapping, or ontology setup—read `ssota-ontology-setup` first for that. For terminal/API operations, read `notion-cli`. For PRD content quality and schema, also read `prd` when drafting product requirements.

## Source of truth

- **Notion** is the long-term SSOT for YouPD development documents.
- The **repo** keeps only operationally necessary docs (e.g. `AGENTS.md`, runbooks, code-adjacent READMEs). Do not duplicate full PRDs or design specs in the repo unless the user explicitly asks.
- Always prefer updating an existing Notion page over creating a duplicate.
- Before version-scoped doc work (PRD, Tech Spec, Spec tied to a release), read `.cursor/skills/youpd-version-workflow/SKILL.md` and query the **development task database** for the active task, dependencies, and linked docs.

### Canonical references

| Role | Link / ID |
|------|-----------|
| Development task database (query before work) | [개발 태스크 DB](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513) |
| Documentation operating system (templates, hierarchy) | [프로덕트 오너 \| 문서화 운영체계](https://www.notion.so/paxhumana/368346dac45680789ff6c9859bfa2191) |
| Target database | [유PD 개발 문서](https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38) |
| Data source | `collection://b2a346da-c456-8251-a5c9-876afa9c62ef` |

### Database properties

Use the **actual property names** from the database schema:

| Property | Type | Usage |
|----------|------|-------|
| `제목` | title | Document title |
| `태그` | multi_select | Document type and topic |

**Allowed tags:** `PRD`, `설계`, `ADR`, `스킬`, `리서치`, `가이드`, `에이전트`, `제품 로드맵`, `릴리즈 노트`

### Available DB templates

| Template | Use for |
|----------|---------|
| `신제품 스펙 문서(PRD)` | New product/feature PRDs |
| `신기술 스펙 문서` | Technical spec / design for new tech |
| `새로운 브레인스토밍` | Early ideation before PRD |

## Document flow

Place each document in the correct layer. Do not collapse layers into one page.

```
프로젝트 개요 → 제품 로드맵 → PRD → 설계문서 → ADR
```

| Layer | Tag | Purpose |
|-------|-----|---------|
| Project overview | (context page, not always in DB) | Why the project exists, scope, stakeholders |
| Roadmap | `제품 로드맵` | What ships when; milestones and priorities |
| PRD | `PRD` | What to build, for whom, success criteria, scope |
| Design / spec | `설계` | How to build it: architecture, APIs, data model, UX flows |
| ADR | `ADR` | Single decision: context, options, choice, consequences |
| Research | `리서치` | Investigation before PRD or design |
| Guide | `가이드` | How-to for team or agents |
| Release | `릴리즈 노트` | What changed in a release |

An ADR records **one decision**. A design doc covers **implementation**. A PRD covers **product intent**. Keep them separate and link related pages.

### ADR numbering

ADR numbers are a global decision-record sequence, not product version numbers.

- Before creating or renaming an ADR, search the **유PD 개발 문서** data source for existing `ADR` pages and inspect titles that match `ADR-NNN`.
- Determine the highest existing ADR number and use the next number for a new ADR.
- Do **not** infer the ADR number from a product version. For example, `v0.13` must not automatically become `ADR-013`.
- If the user provides the current ADR number, still verify it against Notion when possible. If verification is unavailable, state that the number is user-provided.
- Preserve an existing ADR's assigned number during maintenance unless the user asks to correct a numbering error. If correcting, update both the page title and any body references/related links that mention the old number.

## Creation workflow

### 1. Load context

1. Fetch the **문서화 운영체계** page for template structure and naming conventions.
2. Fetch or query the **유PD 개발 문서** database (`collection://b2a346da-c456-8251-a5c9-876afa9c62ef`).
3. Search for an existing page on the same topic. If one exists, switch to the maintenance workflow.
4. For ADRs, search existing ADR pages and compute the next global `ADR-NNN` number before drafting.

### 2. Classify the document

| User intent | Tag | Template |
|-------------|-----|----------|
| Product/feature requirements | `PRD` | `신제품 스펙 문서(PRD)` |
| System/API/architecture design | `설계` | `신기술 스펙 문서` if applicable; else follow 운영체계 sub-templates |
| Architecture decision | `ADR` | No DB template—use 운영체계 ADR structure in body |
| Investigation / spike | `리서치` | Optional: `새로운 브레인스토밍` for early stage |
| Agent/skill documentation | `스킬` or `에이전트` | Follow guide structure in 운영체계 |
| Release summary | `릴리즈 노트` | Follow release template in 운영체계 |

When unsure, ask one clarifying question: *Is this product intent (PRD), implementation plan (설계), or a single decision (ADR)?*

### 3. Draft in Notion

- Set `제목` to a clear, searchable title (include feature/version when relevant, e.g. `v0.13 MCP Workflow Tools PRD`).
- Set `태그` to all applicable tags (at minimum the document type).
- **PRD:** Create from `신제품 스펙 문서(PRD)` when possible. For content quality, follow `prd` skill sections (problem, scope, non-goals, success metrics, requirements).
- **설계:** Use `신기술 스펙 문서` when it fits; otherwise mirror the design sections from 운영체계 (context, goals, architecture, data model, API surface, rollout, open questions).
- **ADR:** Use a fixed structure:
  - ADR number and title (`ADR-NNN ...`) based on the global ADR sequence
  - Status (proposed / accepted / superseded)
  - Context
  - Decision
  - Consequences (positive, negative, neutral)
  - Related links (PRD, design, code paths)
- Include **code paths**, **API routes**, and **package names** when the doc reflects implemented or planned code.
- Link upstream (PRD, roadmap) and downstream (design, ADRs) pages.

### 4. Validate before finishing

- Title and tags match document type.
- No duplicate page for the same topic/version.
- ADR numbers were verified from existing Notion ADR pages and are not derived from product version numbers.
- Decisions and open questions are explicit.
- Implementation details match the current codebase when documenting shipped work.

## Maintenance workflow

When updating an existing document:

1. **Fetch the current page**—never overwrite from memory.
2. Identify what changed: product scope, architecture, implementation, or status.
3. Update the relevant sections only; add a brief **changelog** or **revision note** at the top or bottom when the change is significant.
4. If a decision changed, update the ADR status or create a new ADR that supersedes the old one (do not silently rewrite accepted decisions).
5. Keep **code paths**, **verification results**, and **decision rationale** in sync with the repo to reduce doc–code drift.

### Doc–code alignment checklist

- [ ] Referenced routes, packages, and env vars exist in the repo
- [ ] ADR status reflects current implementation
- [ ] PRD non-goals and out-of-scope items still hold
- [ ] Open questions are still open; resolved items are moved or struck

## Output expectations

After creating or updating a document, report briefly:

1. **Notion URL** of the page
2. **Tags** applied (`제목`, `태그`)
3. **Template or structure** used (e.g. `신제품 스펙 문서(PRD)`, custom ADR)
4. **Standards referenced** (운영체계 page, related PRD/design links)
5. **Remaining TODOs** (open questions, sections to fill, follow-up docs needed)

Example:

```
Created: [v0.13 MCP Workflow PRD](https://www.notion.so/...)
Tags: PRD
Template: 신제품 스펙 문서(PRD)
Based on: 문서화 운영체계, existing v0.12 REST MCP notes
TODO: Add success metrics after stakeholder review; link ADR for tool naming
```

## Related skills

| Skill | When |
|-------|------|
| `youpd-version-workflow` | Select/plan version tasks from the development task database before doc or code work |
| `ssota-ontology-setup` | Discover or update Notion SSOT mapping, DB IDs, anchors |
| `notion-cli` | CLI/API operations (`ntn api`, data source queries) |
| `prd` | PRD content structure and quality bar |
| `create-skill` | Documenting a new agent skill in Notion/repo |
