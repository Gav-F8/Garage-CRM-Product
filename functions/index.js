/**
 * Cloud Functions — Firebase Auth custom claims for role-based access.
 *
 * These functions are the single source of truth for a user's `role`
 * ("owner" | "mechanic") and their `businessId`. The claims they set are:
 *   - trusted by `firestore.rules` (request.auth.token.role / .businessId)
 *   - read on the client by `src/context/AuthContext.jsx`
 *     (getIdTokenResult(user).claims)
 *
 * Why triggers (not callables): claims must only ever be written by trusted
 * server code. A client can never be allowed to set its own role — otherwise a
 * mechanic could promote themselves to owner. By deriving the claim from the
 * Firestore documents an owner controls (the business doc, and the Employees
 * subcollection an owner approves), the privilege boundary stays on the server.
 *
 * Triggers:
 *   1. onBusinessCreated     — owner signup: businesses/{bizId} created
 *                              → claim { role: "owner", businessId } for biz.uid
 *   2. onEmployeeWritten     — employee approve/role/status change:
 *                              businesses/{bizId}/Employees/{uid} written
 *                              → claim reflects the employee's current role,
 *                                 or is cleared when they are no longer active.
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

/**
 * Set (or clear) the role/businessId custom claims on a user, but only when
 * they actually changed — avoids needless token-revocation churn.
 *
 * @param {string} uid          Firebase Auth UID (Employees doc id == uid).
 * @param {string|null} role    "owner" | "mechanic" | null (null clears access)
 * @param {string|null} businessId
 */
async function syncClaims(uid, role, businessId) {
  if (!uid) {
    logger.warn("syncClaims called without uid; skipping");
    return;
  }

  const auth = getAuth();

  let existing = {};
  try {
    const userRecord = await auth.getUser(uid);
    existing = userRecord.customClaims || {};
  } catch (err) {
    // User may not exist yet (e.g. doc written before the Auth user). Log and bail.
    logger.error(`syncClaims: could not load user ${uid}`, err);
    return;
  }

  const desiredRole = role || null;
  const desiredBusinessId = businessId || null;

  if (existing.role === desiredRole && existing.businessId === desiredBusinessId) {
    logger.debug(`syncClaims: claims already up to date for ${uid}`);
    return;
  }

  // Preserve any unrelated claims an admin may have set.
  const nextClaims = { ...existing, role: desiredRole, businessId: desiredBusinessId };
  if (desiredRole === null) delete nextClaims.role;
  if (desiredBusinessId === null) delete nextClaims.businessId;

  await auth.setCustomUserClaims(uid, nextClaims);
  logger.info(
    `syncClaims: set { role: ${desiredRole}, businessId: ${desiredBusinessId} } on ${uid}`
  );
}

/**
 * Owner signup — when a business document is created, the creator (data.uid)
 * becomes the owner of that business.
 */
export const onBusinessCreated = onDocumentCreated("businesses/{bizId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data() || {};
  const bizId = event.params.bizId;

  if (!data.uid) {
    logger.warn(`onBusinessCreated: business ${bizId} has no uid; cannot set owner claim`);
    return;
  }

  await syncClaims(data.uid, "owner", bizId);
});

/**
 * Employee lifecycle — covers approval, role edits, suspension, rejection,
 * and removal of an employee. The Employees doc id is the user's uid.
 *
 * Claim rules:
 *   - status "active"  → claim role = doc.role ("owner" | "mechanic")
 *   - any other status → claim cleared (no role/businessId), so an unapproved,
 *     suspended, rejected, or deleted employee loses all access at the token
 *     level on their next token refresh.
 */
export const onEmployeeWritten = onDocumentWritten(
  "businesses/{bizId}/Employees/{uid}",
  async (event) => {
    const bizId = event.params.bizId;
    const uid = event.params.uid;
    const after = event.data?.after?.data();

    // Deleted, or not active → strip access.
    if (!after || after.status !== "active") {
      await syncClaims(uid, null, null);
      return;
    }

    const role = after.role === "owner" ? "owner" : "mechanic";
    await syncClaims(uid, role, bizId);
  }
);
