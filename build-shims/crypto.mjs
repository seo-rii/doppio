function getCrypto() {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {};
  return globalObject.crypto || globalObject.msCrypto || null;
}

export function randomBytes(size) {
  const crypto = getCrypto();
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available.');
  }

  const bytes = Buffer.alloc(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export default {
  randomBytes
};
