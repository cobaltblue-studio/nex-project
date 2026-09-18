# NEX AGENT INSTRUCTIONS

This document defines how the Replit Agent must work on the NEX project.

## Core Rule

The agent must always maintain consistency between:

- frontend
- backend
- database
- UI flow

Do not implement partial fixes.

## Development Method

When modifying the project:

1. Read the existing system structure.
2. Ensure frontend and backend fields match.
3. Ensure database schema matches UI requirements.
4. Avoid temporary fixes.
5. Refactor code when necessary.

## Platform Concept

NEX is an AI Music Battle & Ranking Platform.

## Creative System Read Order

Before any UI, brand, character, card, deck, or motion work, read:

1. `../../00_ADMIN/CBSU_MASTER_DESIGN_SYSTEM/AI_READ_FIRST_v1.0_APPROVED.md`
2. `../../00_ADMIN/CBSU_MASTER_DESIGN_SYSTEM/CBSU-MDS-001_MASTER_DESIGN_SYSTEM_v1.0_APPROVED.md`
3. `../../00_ADMIN/CBSU_MASTER_DESIGN_SYSTEM/PROJECTS/NEX_NEXI_SPEC_v1.0_APPROVED.md`
4. `NEX_MASTER_SPEC.md`, current code tokens, and the latest approved NEXI asset/LOCK
5. `../../00_ADMIN/CBSU_MASTER_DESIGN_SYSTEM/QA_CHECKLIST_v1.0_APPROVED.md`

Do not treat files in `Versions` or `old record` as currently approved without evidence.
