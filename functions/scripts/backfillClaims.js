/**
 * One-off admin backfill — set role/businessId custom claims for users that
 * already existed before the Cloud Functions triggers were deployed.
 *
 * The triggers (functions/index.js) only fire on *new* writes, so existing
 * owners and approved mechanics will not have claims until this runs once.
 *
 * Usage:
 *   1. Download a service-account key from the Firebase console
 *      (Project settings → Service accounts → Generate new private key).
 *   2. Point GOOGLE_APPLICATION_CREDENTIALS at it, then run:
 *
 *        cd functions
 *        export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json   # PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="..."
 *        node scripts/backfillClaims.js
 *
 * It walks every business and every Employees doc, mirroring the same logic the
 * onEmployeeWritten / onBusinessCreated triggers use. Safe to re-run (idempotent).
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });

const db = getFirestore();
const auth = getAuth();

async function setClaims(uid, role, businessId) {
  try {
    const user = await auth.getUser(uid);
    const existing = user.customClaims || {};
    if (existing.role === role && existing.businessId === businessId) {
      console.log(`= ${uid} already { role: ${role}, businessId: ${businessId} }`);
      return;
    }
    await auth.setCustomUserClaims(uid, { ...existing, role, businessId });
    console.log(`✓ ${uid} → { role: ${role}, businessId: ${businessId} }`);
  } catch (err) {
    console.warn(`! skipped ${uid}: ${err.message}`);
  }
}

async function main() {
  const businesses = await db.collection("businesses").get();
  console.log(`Found ${businesses.size} businesses`);

  for (const biz of businesses.docs) {
    const bizId = biz.id;
    const bizData = biz.data();

    // The business creator is the owner.
    if (bizData.uid) {
      await setClaims(bizData.uid, "owner", bizId);
    }

    // Each active employee gets a claim matching its role.
    const employees = await db.collection("businesses").doc(bizId).collection("Employees").get();
    for (const emp of employees.docs) {
      const data = emp.data();
      if (data.status !== "active") continue;
      const role = data.role === "owner" ? "owner" : "mechanic";
      await setClaims(emp.id, role, bizId);
    }
  }

  console.log("Backfill complete.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
