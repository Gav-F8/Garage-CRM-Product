/**
 * Firestore security-rules tests.
 *
 * Run against the Firestore emulator. The easiest way (auto start/stop) is:
 *
 *   npm run test:rules
 *
 * which expands to:
 *
 *   firebase emulators:exec --only firestore "node --test firestore-tests/"
 *
 * See README "Firestore rules & emulator" for the full command list.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test, { before, after } from "node:test";
import assert from "node:assert";

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "garage-crm-rules-test";

let testEnv;

// Context helpers — each mints an auth token with the given custom claims,
// exactly mirroring what the Cloud Functions set in production.
const ownerA = () => testEnv.authenticatedContext("ownerA", { role: "owner", businessId: "bizA" }).firestore();
const mechA = () => testEnv.authenticatedContext("mechA", { role: "mechanic", businessId: "bizA" }).firestore();
const mechA2 = () => testEnv.authenticatedContext("mechA2", { role: "mechanic", businessId: "bizA" }).firestore();
const ownerB = () => testEnv.authenticatedContext("ownerB", { role: "owner", businessId: "bizB" }).firestore();

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(__dirname, "..", "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // Seed baseline data with rules bypassed.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "businesses/bizA"), { uid: "ownerA", name: "Garage A" });
    await setDoc(doc(db, "businesses/bizB"), { uid: "ownerB", name: "Garage B" });

    await setDoc(doc(db, "businesses/bizA/Employees/ownerA"), { uid: "ownerA", role: "owner", status: "active", Name: "Owner A" });
    await setDoc(doc(db, "businesses/bizA/Employees/mechA"), { uid: "mechA", role: "mechanic", status: "active", Name: "Mech A" });

    await setDoc(doc(db, "businesses/bizA/Customers/c1"), { name: "Jane Customer" });
    await setDoc(doc(db, "businesses/bizA/Vehicles/v1"), { plate: "ABC123", customerId: "c1" });
    await setDoc(doc(db, "businesses/bizA/Projects/p1"), { title: "Brake job", customerId: "c1" });

    await setDoc(doc(db, "businesses/bizA/Projects/p1/TimeLogs/log1"), { Uid: "mechA", minutes: 30 });
    await setDoc(doc(db, "businesses/bizA/Projects/p1/Notes/note1"), { createdByUid: "mechA", text: "looks good" });

    // bizB data for cross-business isolation checks.
    await setDoc(doc(db, "businesses/bizB/Customers/cB"), { name: "Bob Other" });
  });
});

after(async () => {
  await testEnv?.cleanup();
});

// ── 1. Owner can read/write their business's data ───────────────────────────────
test("owner can read their business's customer", async () => {
  await assertSucceeds(getDoc(doc(ownerA(), "businesses/bizA/Customers/c1")));
});

test("owner can create a customer", async () => {
  await assertSucceeds(setDoc(doc(ownerA(), "businesses/bizA/Customers/c2"), { name: "New Customer" }));
});

test("owner can update a vehicle", async () => {
  await assertSucceeds(updateDoc(doc(ownerA(), "businesses/bizA/Vehicles/v1"), { plate: "ZZZ999" }));
});

test("owner can edit/delete any time log (incl. one created by a mechanic)", async () => {
  await assertSucceeds(updateDoc(doc(ownerA(), "businesses/bizA/Projects/p1/TimeLogs/log1"), { minutes: 45 }));
});

// ── 2. Mechanic: can write time logs/notes, denied on customer/vehicle/employee ──
test("mechanic can read customers in their business", async () => {
  await assertSucceeds(getDoc(doc(mechA(), "businesses/bizA/Customers/c1")));
});

test("mechanic can create a time log", async () => {
  await assertSucceeds(
    setDoc(doc(mechA(), "businesses/bizA/Projects/p1/TimeLogs/log2"), { Uid: "mechA", minutes: 15 }),
  );
});

test("mechanic can create a note", async () => {
  await assertSucceeds(
    setDoc(doc(mechA(), "businesses/bizA/Projects/p1/Notes/note2"), { createdByUid: "mechA", text: "ordered part" }),
  );
});

test("mechanic can edit their OWN time log", async () => {
  await assertSucceeds(updateDoc(doc(mechA(), "businesses/bizA/Projects/p1/TimeLogs/log1"), { minutes: 31 }));
});

test("mechanic CANNOT edit another user's time log", async () => {
  await assertFails(updateDoc(doc(mechA2(), "businesses/bizA/Projects/p1/TimeLogs/log1"), { minutes: 99 }));
});

test("mechanic CANNOT create a customer", async () => {
  await assertFails(setDoc(doc(mechA(), "businesses/bizA/Customers/c3"), { name: "Nope" }));
});

test("mechanic CANNOT update a customer", async () => {
  await assertFails(updateDoc(doc(mechA(), "businesses/bizA/Customers/c1"), { name: "Hacked" }));
});

test("mechanic CANNOT create/update a vehicle", async () => {
  await assertFails(setDoc(doc(mechA(), "businesses/bizA/Vehicles/v2"), { plate: "NEW" }));
  await assertFails(updateDoc(doc(mechA(), "businesses/bizA/Vehicles/v1"), { plate: "HACK" }));
});

test("mechanic CANNOT edit an employee record (e.g. approve/elevate)", async () => {
  await assertFails(updateDoc(doc(mechA(), "businesses/bizA/Employees/mechA"), { status: "active", role: "owner" }));
});

// ── 3. Cross-business isolation ─────────────────────────────────────────────────
test("owner of business B CANNOT read business A's customers", async () => {
  await assertFails(getDoc(doc(ownerB(), "businesses/bizA/Customers/c1")));
});

test("owner of business B CANNOT write business A's customers", async () => {
  await assertFails(setDoc(doc(ownerB(), "businesses/bizA/Customers/cX"), { name: "Intruder" }));
});

test("owner of business A CANNOT read business B's customers", async () => {
  await assertFails(getDoc(doc(ownerA(), "businesses/bizB/Customers/cB")));
});

// ── 4. A spoofed role on the document body grants nothing ───────────────────────
test("mechanic writing a customer with a spoofed role field is still denied", async () => {
  // Only the auth token claim matters; a role field in the body is ignored.
  await assertFails(
    setDoc(doc(mechA(), "businesses/bizA/Customers/spoof"), { name: "x", role: "owner" }),
  );
});

test("mechanic CANNOT self-elevate by writing role:owner onto their employee doc", async () => {
  await assertFails(
    updateDoc(doc(mechA(), "businesses/bizA/Employees/mechA"), { role: "owner" }),
  );
});

// ── Sanity: a signed-in user with NO claims is treated as a non-member ──────────
test("a user with no role/businessId claim cannot read business data", async () => {
  const nobody = testEnv.authenticatedContext("nobody", {}).firestore();
  await assertFails(getDoc(doc(nobody, "businesses/bizA/Customers/c1")));
});

// ── Signup bootstrap paths ──────────────────────────────────────────────────────
test("an UNauthenticated visitor can read the businesses list (signup picker)", async () => {
  const anon = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anon, "businesses/bizA")));
});

test("but an unauthenticated visitor still cannot read a business's customers", async () => {
  const anon = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, "businesses/bizA/Customers/c1")));
});

test("a signed-in user can create their OWN employee doc (signup), not someone else's", async () => {
  const newbie = testEnv.authenticatedContext("newbie", {}).firestore();
  await assertSucceeds(
    setDoc(doc(newbie, "businesses/bizA/Employees/newbie"), {
      uid: "newbie",
      role: "mechanic",
      status: "pendingApproval",
    }),
  );
  await assertFails(
    setDoc(doc(newbie, "businesses/bizA/Employees/someoneElse"), {
      uid: "someoneElse",
      role: "mechanic",
      status: "pendingApproval",
    }),
  );
});

test("a claimless user can read their OWN employee doc but not another employee's", async () => {
  // mechA's own doc exists; reading it without a role claim must still work so
  // Login/AuthContext can resolve business + status for not-yet-claimed users.
  const claimlessMechA = testEnv.authenticatedContext("mechA", {}).firestore();
  await assertSucceeds(getDoc(doc(claimlessMechA, "businesses/bizA/Employees/mechA")));
  await assertFails(getDoc(doc(claimlessMechA, "businesses/bizA/Employees/ownerA")));
});

test("a user can create the business they own, but not one owned by someone else", async () => {
  const founder = testEnv.authenticatedContext("founder", {}).firestore();
  await assertSucceeds(
    setDoc(doc(founder, "businesses/bizFounder"), { uid: "founder", name: "Founder Garage" }),
  );
  await assertFails(
    setDoc(doc(founder, "businesses/bizImposter"), { uid: "someoneElse", name: "Not Mine" }),
  );
});
