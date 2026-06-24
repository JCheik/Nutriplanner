/**
 * Shared constants safe to import from both client and server code.
 * Keep this module free of server-only imports (e.g. firebase-admin) so it can
 * be bundled on the client without leaking the Admin SDK.
 */

/**
 * Superuser email that is always treated as an admin, even without the custom
 * `admin` claim. Must stay in sync with the value hardcoded in firestore.rules
 * (Firestore rules cannot import TypeScript).
 */
export const SUPERUSER_EMAIL = 'jonicheik@gmail.com';
