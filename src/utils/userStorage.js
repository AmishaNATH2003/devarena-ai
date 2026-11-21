
let activeUserId = null;

/**
 * Set the currently authenticated Supabase user.
 * Called by AuthGate when authentication changes.
 */
export function setStorageUserId(userId) {
  activeUserId =
    typeof userId === "string" && userId.trim()
      ? userId
      : null;
}

/**
 * Return a storage key unique to the signed-in user.
 *
 * Never fall back to a global key.
 */
export function userStorageKey(name) {
  if (!activeUserId) {
    throw new Error(
      "User-specific storage is unavailable. Please sign in."
    );
  }

  return `devarena:v2:${activeUserId}:${name}`;
}

/**
 * Read JSON from the current user's browser storage.
 */
export function readUserStorage(name, fallback) {
  if (!activeUserId) return fallback;

  try {
    const value = localStorage.getItem(
      userStorageKey(name)
    );

    return value === null
      ? fallback
      : JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Save JSON in the current user's browser storage.
 */
export function writeUserStorage(name, value) {
  const key = userStorageKey(name);

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

  return value;
}

/**
 * Delete only the signed-in user's selected local key.
 */
export function removeUserStorage(name) {
  localStorage.removeItem(userStorageKey(name));
}
