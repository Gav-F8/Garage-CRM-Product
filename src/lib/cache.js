/**
 * Small localStorage cache helpers for the customer list.
 *
 * Background: the customer list is cached per-business so customer dropdowns
 * (vehicle/project forms) don't re-read Firestore on every mount. Previously the
 * cache had no TTL and was only ever cleared on customer *create* — so editing
 * or deleting a customer left stale names in those dropdowns until a hard
 * refresh.
 *
 * This module centralises the cache so create, update, AND delete all invalidate
 * it, and adds a short TTL so the cache self-heals even if some future write
 * path forgets to invalidate.
 */

const CUSTOMERS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function customersCacheKey(businessId) {
  return `customers_${businessId}`;
}

/**
 * Read the cached customer list for a business.
 * Returns the array, or null when missing / expired / unparseable.
 * Tolerates the legacy format (a bare JSON array with no timestamp).
 */
export function readCustomersCache(businessId) {
  if (!businessId) return null;
  try {
    const raw = localStorage.getItem(customersCacheKey(businessId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Legacy format: a bare array with no fetchedAt. Treat as expired so it
    // gets rewritten in the new format on next fetch.
    if (Array.isArray(parsed)) return null;

    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - (parsed.fetchedAt || 0) > CUSTOMERS_TTL_MS) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

/** Write the customer list to cache with a fresh timestamp. Fails open. */
export function writeCustomersCache(businessId, data) {
  if (!businessId) return;
  try {
    localStorage.setItem(
      customersCacheKey(businessId),
      JSON.stringify({ data, fetchedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded / disabled storage — ignore; callers fall back to live data.
  }
}

/** Drop the cached customer list (call on every create/update/delete). */
export function invalidateCustomersCache(businessId) {
  if (!businessId) return;
  try {
    localStorage.removeItem(customersCacheKey(businessId));
  } catch {
    // Ignore — nothing we can do, and a stale entry will expire via TTL anyway.
  }
}

// ── NHTSA vehicle makes ────────────────────────────────────────────────────────
// GetAllMakes returns ~11,000 makes and barely ever changes. Cache it for a day
// so we don't re-download it on every mount of the vehicle create form.

const NHTSA_MAKES_KEY = "nhtsa_makes_cache";
const NHTSA_MAKES_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Read the cached makes array, or null if missing / expired / unparseable. */
export function readMakesCache() {
  try {
    const raw = localStorage.getItem(NHTSA_MAKES_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - (parsed.fetchedAt || 0) > NHTSA_MAKES_TTL_MS) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

/** Cache the makes array with a fresh timestamp. Fails open on quota errors. */
export function writeMakesCache(data) {
  try {
    localStorage.setItem(NHTSA_MAKES_KEY, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch {
    // Quota exceeded / disabled storage — ignore and keep using live data.
  }
}
