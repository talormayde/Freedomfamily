// lib/biometric-vault.ts
// WebAuthn-backed mini vault for a small secret (e.g., refresh token) protected by biometrics.

const VAULT_KEY = 'biometric.vault.v1';

type VaultBlob = {
  credId: string; // base64url
  iv: string;     // base64
  ct: string;     // base64
};

/* ---------------- helpers ---------------- */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
function bytesToB64url(buf: ArrayBuffer): string {
  return bytesToB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return b64ToBytes(b64);
}
function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function randomBytes(n: number): Uint8Array {
  const x = new Uint8Array(n);
  crypto.getRandomValues(x);
  return x;
}
/** Some TS environments treat Uint8Array< ArrayBufferLike > as not a BufferSource.
 *  Returning a **real ArrayBuffer** avoids the compile error on Vercel. */
function newChallenge(): ArrayBuffer {
  return randomBytes(32).buffer.slice(0); // force a plain ArrayBuffer
}

/* ---------------- tiny API ---------------- */

export function isBiometricAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.PublicKeyCredential && navigator.credentials);
}
export function hasVault(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(VAULT_KEY);
}
export function clearVault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VAULT_KEY);
}

/** Create the vault and store an encrypted secret; returns true on success. */
export async function createVault(secret: string): Promise<boolean> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available.');

  // 1) Create a **platform** credential
  const userHandle = randomBytes(16);

  const pubKey: PublicKeyCredentialCreationOptions = {
    challenge: newChallenge(), // ArrayBuffer ✅ BufferSource
    rp: { name: 'Freedom Family', id: window.location.hostname },
    user: {
      id: userHandle,          // Uint8Array is fine here
      name: 'vault-user',
      displayName: 'Vault User',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
    timeout: 60_000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  };

  const cred = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Credential creation cancelled.');
  const credIdB64url = bytesToB64url(cred.rawId);

  // 2) Immediately assert to derive a key from signature material
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: newChallenge(), // ArrayBuffer ✅
    timeout: 60_000,
    rpId: window.location.hostname,
    allowCredentials: [{ id: cred.rawId, type: 'public-key' }],
    userVerification: 'required',
  };
  const assertion = (await navigator.credentials.get({ publicKey: getOpts })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Credential assertion failed.');
  const resp = assertion.response as AuthenticatorAssertionResponse;

  // Derive AES key from the signature bytes
  const material = new Uint8Array(resp.signature); // ArrayBuffer -> bytes
  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  // 3) Encrypt and store
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, strToBytes(secret));

  const blob: VaultBlob = { credId: credIdB64url, iv: bytesToB64(iv.buffer), ct: bytesToB64(ct) };
  localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
  return true;
}

/** Unlock the vault and return the decrypted secret. */
export async function unlockVault(): Promise<string> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available.');
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error('No vault set up on this device.');

  const blob = JSON.parse(raw) as VaultBlob;

  const allowId = b64urlToBytes(blob.credId);
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: newChallenge(), // ArrayBuffer ✅
    timeout: 60_000,
    rpId: window.location.hostname,
    allowCredentials: [{ id: allowId, type: 'public-key' }],
    userVerification: 'required',
  };
  const assertion = (await navigator.credentials.get({ publicKey: getOpts })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Biometric assertion failed.');
  const resp = assertion.response as AuthenticatorAssertionResponse;

  const material = new Uint8Array(resp.signature);
  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  const ivBytes = b64ToBytes(blob.iv);
  const ctBytes = b64ToBytes(blob.ct);
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, ctBytes);

  return new TextDecoder().decode(ptBuf);
}

/* ------- names your components already import ------- */
export const setupBiometricVault = createVault;
export const unlockBiometricVault = unlockVault;
export const clearBiometricVault = clearVault;
