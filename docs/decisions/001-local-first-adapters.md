# ADR-001: Cloud-sync product flow with a local storage fallback

## Status

Accepted

## Date

2026-09-19

## Context

Travel OS must make cross-device and multi-user cloud synchronization the primary self-hosted experience while still working without an account for the maintainer-hosted demo, offline use, and fallback scenarios. The public repository cannot contain the author's project configuration or trip data.

## Decision

Keep the application as a static Vite site using native ES modules. Domain services depend on a storage interface. IndexedDB remains the safe startup/fallback adapter, but independently hosted copies open the cloud onboarding wizard on first use and treat user-owned Firebase as the intended persistent collaboration mode. Firebase Authentication provides stable identities for cloud mode.

## Consequences

- The public demo and offline fallback continue to work without network services.
- Self-host onboarding leads with cloud synchronization instead of presenting Firebase as an afterthought.
- Runtime configuration is device-local and never compiled into the public build.
- Firebase rules and membership checks remain mandatory because Web configuration is public connection metadata, not authorization.
