# MindMark Security Specification (Phase 0)

## Data Invariants
1. **User Profile Isolation**: `/users/{userId}` contains PII (`email`). Only the authenticated user with `request.auth.uid == userId` and `email_verified == true` may read, create, or update their profile. `list` queries on `/users` are strictly denied.
2. **Venture Ownership**: Every `/ventures/{ventureId}` document must have `ownerId == request.auth.uid`. Updates cannot reassign `ownerId` or alter `createdAt`.
3. **Subcollection Master Gate**: Every document in `/ventures/{ventureId}/responses`, `/reports`, and `/activityLogs` must verify parent venture ownership via `get()` on single-document operations (`get`, `create`, `update`, `delete`), and enforce `resource.data.ownerId == request.auth.uid` on `list` queries without invoking `get()` in `allow list`.
4. **Temporal & Key Strictness**: All `create` operations require `createdAt == request.time` and exact key sets (`hasAll` + `hasOnly`). All `update` operations validate via `isValid[Entity]` and allowlist mutated keys via `affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**: Once an `InsightReport` reaches `status == 'archived'`, no client updates are permitted.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read**: Read `/ventures/v1` with `auth == null`.
2. **Cross-Tenant PII Read**: Authenticated as `userB`, read `/users/userA`.
3. **User List Scraping**: Authenticated as `userA`, `list` `/users`.
4. **Shadow Field Injection on Venture Create**: Create `/ventures/v1` with extra key `isAdmin: true`.
5. **Identity Spoofing on Venture Create**: Create `/ventures/v1` with `ownerId: 'userB'` while signed in as `userA`.
6. **Oversized ID Poisoning**: Create `/ventures/{150-char-invalid-id}` or ID containing `$` / spaces.
7. **Timestamp Forgery**: Create `/ventures/v1` with client-supplied past `createdAt` instead of `request.time`.
8. **Orphaned Response Write**: Authenticated as `userB`, create `/ventures/v1/responses/r1` where `v1` is owned by `userA`.
9. **Unverified Email Write**: Authenticated with `email_verified == false`, create `/ventures/v1`.
10. **Owner Reassignment Update**: Update `/ventures/v1` changing `ownerId` to `userB`.
11. **Terminal Report Mutation**: Update `/ventures/v1/reports/rep1` when existing `status == 'archived'`.
12. **Unfiltered Collection List**: `list` `/ventures` without `where('ownerId', '==', uid)`.
