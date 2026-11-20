/**
 * MindMark Firestore Security Rules Verification Spec
 * Maps each of the 12 Dirty Dozen adversarial vectors from security_spec.md
 * to the exact rule guard in firestore.rules.
 */

export const DIRTY_DOZEN_ASSERTIONS = [
  {
    id: 1,
    name: 'Unauthenticated Read on Venture',
    path: '/ventures/v1',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isSignedIn() requires request.auth != null',
  },
  {
    id: 2,
    name: 'Cross-Tenant PII Read on /users/{userId}',
    path: '/users/userA',
    auth: { uid: 'userB', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isOwner(userId) verifies request.auth.uid == userId',
  },
  {
    id: 3,
    name: 'User Directory List Scraping',
    path: '/users',
    auth: { uid: 'userA', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if false on /users/{userId}',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Venture Create',
    path: '/ventures/v1',
    payload: { isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidVenture enforces data.keys().hasOnly([...])',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Venture Create',
    path: '/ventures/v1',
    auth: { uid: 'userA', email_verified: true },
    payload: { ownerId: 'userB' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidVenture enforces data.ownerId == request.auth.uid',
  },
  {
    id: 6,
    name: 'Oversized / Malformed ID Poisoning',
    path: '/ventures/invalid id with spaces and $',
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId enforces <= 128 chars and ^[a-zA-Z0-9_\\-]+$',
  },
  {
    id: 7,
    name: 'Timestamp Forgery on Create',
    path: '/ventures/v1',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time',
  },
  {
    id: 8,
    name: 'Orphaned Cross-Tenant Response Write',
    path: '/ventures/v1_owned_by_A/responses/r1',
    auth: { uid: 'userB', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isVentureOwner(ventureId) verifies parent ownerId via get()',
  },
  {
    id: 9,
    name: 'Unverified Email Write',
    path: '/ventures/v1',
    auth: { uid: 'userA', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isSignedIn() requires request.auth.token.email_verified == true',
  },
  {
    id: 10,
    name: 'Owner Reassignment Update',
    path: '/ventures/v1',
    payload: { ownerId: 'userB' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().ownerId == existing().ownerId && affectedKeys().hasOnly([...])',
  },
  {
    id: 11,
    name: 'Terminal Archived Report Mutation',
    path: '/ventures/v1/reports/rep1',
    existingState: { status: 'archived' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "existing().status != 'archived' on report update",
  },
  {
    id: 12,
    name: 'Unfiltered Collection List Query',
    path: '/ventures',
    query: 'unfiltered collection(db, "ventures")',
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if isSignedIn() && existing().ownerId == request.auth.uid',
  },
] as const;
