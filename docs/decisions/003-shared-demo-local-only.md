# ADR-003: Keep the shared demo local-only

## Status

Accepted

## Date

2026-09-21

## Context

A centrally hosted open-source frontend can read anything entered into its page. Even when Firebase data travels directly from the browser to a user-owned project, users would still need to trust the maintainer's current deployment with credentials and access tokens.

## Decision

The official `fishingwithbag.github.io` deployment runs only in IndexedDB local mode. It disables Firebase configuration, email and password controls, removes remembered cloud configuration, and directs cloud users to create a deployment they control. Independently hosted copies retain the Firebase runtime setup wizard. The current product does not accept Google API keys.

## Consequences

- Visitors cannot accidentally enter cloud credentials into the maintainer-hosted demo.
- Cloud mode requires a one-time self-hosting step.
- Open source review and user-controlled hosting align the deployed code and data trust boundary.
