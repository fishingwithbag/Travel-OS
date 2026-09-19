# ADR-001: Local-first storage with optional Firebase

## Status

Accepted

## Date

2026-09-19

## Context

Travel OS must work without an account while also supporting collaboration through a Firebase project supplied by the user. The public repository cannot contain the author's project configuration or trip data.

## Decision

Keep the application as a static Vite site using native ES modules. Domain services depend on a storage interface. IndexedDB is the default adapter; Firebase Realtime Database is loaded only after the user supplies and validates a Firebase Web configuration. Firebase Authentication provides stable identities for cloud mode.

## Consequences

- The core planner works without network services.
- Cloud mode can be replaced or disabled without rewriting the UI.
- Runtime configuration is device-local and never compiled into the public build.
- Firebase rules and membership checks remain mandatory because Web configuration is public connection metadata, not authorization.
