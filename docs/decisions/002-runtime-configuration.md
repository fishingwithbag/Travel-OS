# ADR-002: Parse service configuration at runtime

## Status

Accepted

## Date

2026-09-19

## Context

People should connect their own Firebase without editing source code or rebuilding the site. The current product only opens keyless Google Maps search URLs; it has no Maps JavaScript or Places consumer.

## Decision

Provide an in-app Firebase setup wizard. It accepts either a JSON object or the object body copied from Firebase Console, extracts an allowlist of known fields, rejects administrative credentials, and never evaluates pasted JavaScript. Configuration is kept in memory unless the user explicitly selects “remember this device.” Do not accept a Google API key until a shipped feature actually consumes it.

## Consequences

- Switching projects requires unsubscribing, signing out, and clearing adapter caches.
- A future Maps JavaScript／Places integration may accept a Browser Key, which remains visible to code running on the page and therefore must use referrer/API restrictions.
- Routes／Geocoding／Weather Server Keys and service-account JSON are never accepted by the browser client.
