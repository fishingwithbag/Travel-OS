# ADR-002: Parse service configuration at runtime

## Status

Superseded by ADR-004

## Date

2026-09-19

## Context

People should connect their own Firebase and restricted Google Maps Browser Key without editing source code or rebuilding the site. Cloud synchronization is the primary self-host onboarding path.

## Decision

Provide an in-app cloud setup wizard. It accepts a Firebase Web config plus a Google Maps Browser Key, validates both, loads Maps JavaScript and Places to verify the Browser Key, and signs into the user's Firebase. Browser Keys are masked in the UI but are not treated as secrets; users are guided to apply Website/API restrictions and quota controls. Configuration is kept in memory unless the user explicitly selects “remember this device.”

## Consequences

- Switching projects requires unsubscribing, signing out, and clearing adapter caches.
- The Maps JavaScript／Places Browser Key remains visible to code and browser requests and therefore must use Website/API restrictions and quota controls.
- Routes／Geocoding／Weather Server Keys and service-account JSON are never accepted by the browser client.
