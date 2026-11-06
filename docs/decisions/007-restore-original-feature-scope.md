# ADR-007: Restore the original feature scope

Status: Accepted for scope correction (2026-10-12). Supersedes ADR-006 as a product acceptance baseline.

Open sourcing means preserving the original travel workflows while removing personal data and service defaults. The user authorized removing weather, not removing Places, route calculations, rentals, favorites, or collaboration. Firebase must remain on Spark. A service's free quota and its billing prerequisites must be verified individually; neither implies permission to remove the corresponding feature.

The feature inventory in [FEATURE_PARITY_AUDIT.zh-TW.md](../FEATURE_PARITY_AUDIT.zh-TW.md) records missing implementations and evidence. Keyless navigation remains useful but does not satisfy in-app route calculation or Places search. No weather service will be restored. The previous implementation remains historical evidence, not proof that the complete original product has passed acceptance.

Restore independently testable workflows incrementally. Do not automatically change billing, reinstate a Blaze-dependent deployment, or import private source/data. Google setup conditions still need resolution before claiming a fully free end-to-end flow. Each PR must state remaining gaps rather than silently narrowing the product.
