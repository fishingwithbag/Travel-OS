# ADR-004: Keep Maps navigation keyless

## Status

Accepted

## Date

2026-09-26

## Context

Travel OS currently opens external Google Maps URLs. It does not render an in-app map or call Places. Requiring a billed Google Cloud project and Browser Key during Firebase onboarding blocks users without enabling a feature.

## Decision

Step 3 explains keyless external navigation. The wizard accepts only the user's Firebase Web config and sign-in credentials, then tests an authenticated write, read, and delete within that user's diagnostic path. Remembered settings contain only the public Firebase config; authentication uses in-memory persistence. An older remembered Maps key is discarded.

## Consequences

- Cloud setup does not require Maps billing or a Browser Key.
- In-app Maps or Places features will need their own scoped key, restrictions, and capability checks if implemented later.
- Server-side API secrets remain outside the browser.
