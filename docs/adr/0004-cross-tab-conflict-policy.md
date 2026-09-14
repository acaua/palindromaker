# One stored document, with an explicit cross-tab conflict

Every tab shares a single stored document, so two tabs can diverge. On a `storage` event a tab the user has _not_ edited adopts the incoming document silently; a tab that _has_ been edited raises a conflict and stops saving until the user picks "theirs" or "mine". The asymmetry is deliberate — the untouched tab has nothing to lose, the edited tab does — and it is surprising enough to record, since "always ask" and "last write wins" are both plausible alternatives that were rejected.
