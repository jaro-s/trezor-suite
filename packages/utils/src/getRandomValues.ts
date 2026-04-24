import { getRandomValues as nodeGetRandomValues } from 'crypto';

const hasWindowCrypto = typeof window !== 'undefined' && typeof window.crypto !== 'undefined';

/**
 * Fill a TypedArray with cryptographically strong random values.
 *
 * Picks the browser's `window.crypto.getRandomValues` when available and
 * falls back to Node.js `crypto.getRandomValues` otherwise. No polyfill is
 * needed — webpack maps the `crypto` import to an empty module via the
 * `browser` field in `package.json`, and the runtime branch is resolved at
 * module load time.
 */
export const getRandomValues = <T extends ArrayBufferView<ArrayBuffer>>(array: T): T =>
    hasWindowCrypto ? window.crypto.getRandomValues(array) : nodeGetRandomValues(array);
