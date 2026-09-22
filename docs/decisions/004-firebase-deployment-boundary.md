# ADR-004: Separate OpenSource Firebase deployment from maintainer production

## Status

Accepted

## Date

2026-09-22

## Context

Travel OS is public and local-first. The official public site runs IndexedDB only. Its Realtime Database Rules are a template for Emulator tests and independently hosted copies; they are not the Rules for the maintainer's private travel website or any other unrelated Firebase project.

Using `firebase projects:list`, account history, or the existence of a Realtime Database to infer a deployment target is unsafe because several unrelated applications can be managed by the same Firebase account.

## Decision

- This repository has no production Firebase project identity.
- Database deployment requires a local, ignored `.firebase-deploy-target.local.json` containing the self-hoster's own project ID.
- `firebase.json` runs `scripts/firebase-deploy-boundary.mjs guard` as a Database `predeploy` hook, so direct `firebase deploy` commands are checked too.
- The CLI project must exactly match the locally approved project.
- Maintainers may keep `.firebase-private-projects.local.json` with project IDs that must never be targeted from this repository. This file is ignored and is not published.
- The official `fishingwithbag.github.io/Travel-OS` site never deploys or connects to a maintainer production Firebase project.

## Consequences

Self-hosters configure once:

```bash
npm run firebase:rules:configure -- --project YOUR_PROJECT_ID
npm run firebase:rules:deploy
```

If no target is configured, the target differs, or a local denylist blocks it, deployment stops before Database Rules are released.
