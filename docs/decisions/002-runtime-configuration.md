# ADR-002: Parse service configuration at runtime

## Status

Accepted

## Date

2026-09-19

## Context

People should connect their own Firebase and optional Google Maps browser key without editing source code or rebuilding the site.

## Decision

Provide an in-app setup wizard. It accepts either a JSON object or the object body copied from Firebase Console, extracts an allowlist of known fields, rejects administrative credentials, and never evaluates pasted JavaScript. Configuration is kept in memory unless the user explicitly selects “remember this device.”

## Consequences

- Switching projects requires unsubscribing, signing out, and clearing adapter caches.
- Browser keys remain visible to code running on the page and must use referrer/API restrictions.
- Server-only keys and service-account JSON are never accepted.
