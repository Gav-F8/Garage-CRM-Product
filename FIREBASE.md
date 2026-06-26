# Firebase: auth claims, security rules, indexes & emulator

This project's authorization is driven by **Firebase Auth custom claims**, enforced
by **Firestore security rules**, and exercised by **emulator-based rule tests**.

## Roles via custom claims

A user's `role` (`"owner"` | `"mechanic"`) and `businessId` live on their Auth
token as custom claims. They are set **only** server-side by Cloud Functions —
the client never trusts a localStorage value.

| Trigger (functions/index.js) | When | Claim set |
| --- | --- | --- |
| `onBusinessCreated` | A `businesses/{id}` doc is created (owner signup) | `{ role: "owner", businessId }` on the business's `uid` |
| `onEmployeeWritten` | An `Employees/{uid}` doc is written (approve / role / status change / delete) | `{ role, businessId }` when `status === "active"`, otherwise claims are cleared |

The client (`src/context/AuthContext.jsx`) reads these via
`getIdTokenResult(user).claims`. After a role change to the *acting* user
(e.g. login), the client calls `getIdToken(user, true)` to refresh the token.

### Deploy the functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Backfill claims for pre-existing users (one-off)

The triggers only fire on new writes, so users created before deployment need a
one-time backfill:

```bash
cd functions
# Download a service-account key from Firebase console → Project settings →
# Service accounts → Generate new private key, then:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json   # PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\serviceAccount.json"
npm run backfill-claims
```

## Security rules & indexes

- `firestore.rules` — role/business-scoped access, keyed on `request.auth.token`.
- `firestore.indexes.json` — composite indexes for the app's compound queries
  (`Projects` customerId+isActive / vehicleId+isActive, `Vehicles` customerId+createdAt).
- `firebase.json` / `.firebaserc` — wire it all to the `classic-garage-mgmt` project.

### Deploy rules + indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### ⚠️ Migration order (do this once, in order)

The new rules require a valid `role`/`businessId` claim for all data access, so
rolling them out before claims exist would lock out current users. Deploy in this
order:

1. `firebase deploy --only functions` — install the claim triggers.
2. `npm run backfill-claims` (in `functions/`) — set claims for existing users.
3. Have users **log in again** (login force-refreshes the token), or wait up to
   1 hour for tokens to auto-refresh, so their session carries the new claims.
4. `firebase deploy --only firestore:rules,firestore:indexes` — enforce last.

## Emulator & rule tests

Java 11+ is required for the Firestore emulator. Dependencies
(`firebase-tools`, `@firebase/rules-unit-testing`) are in `devDependencies`.

Run the rule tests (starts the Firestore emulator, runs the tests, shuts it down):

```bash
npm run test:rules
```

That expands to:

```bash
firebase emulators:exec --only firestore --project garage-crm-rules-test \
  "node --test firestore-tests/rules.test.js"
```

To start the full emulator suite interactively (Auth + Firestore + Functions + UI):

```bash
firebase emulators:start
```

### What the rule tests cover (`firestore-tests/rules.test.js`)

- Owner can read/write their own business's data.
- Mechanic can create/edit time logs & notes (and edit only their **own**), but is
  **denied** writes to customers, vehicles, and employee records.
- Cross-`businessId` isolation: neither business can read/write the other's data.
- A **spoofed `role` field** in a document body grants nothing — only the auth
  token claim is trusted.
- A signed-in user with **no claims** is treated as a non-member.
