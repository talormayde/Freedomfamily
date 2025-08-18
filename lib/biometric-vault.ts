// lib/biometric-vault.ts
// WebAuthn-backed mini vault for a small secret (e.g., session token) protected by biometrics.

const VAULT_KEY = 'biometric.vault.v1';

type VaultBlob = {
  credId: string; // base64url
  iv: string;     // base64
  ct: string;     // base64
};

function b64urlToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
function bytesToB64url(bytes: ArrayBuffer): string {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function randomBytes(n: number): Uint8Array {
  const x = new Uint8Array(n);
  crypto.getRandomValues(x);
  return x;
}

export function isBiometricAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.PublicKeyCredential && navigator.credentials);
}

export async function createVault(secret: string): Promise<boolean> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available.');

  // 1) Create platform credential
  const challenge = randomBytes(32);
  const userHandle = randomBytes(16);
  const pubKey: PublicKeyCredentialCreationOptions = {
    // Use ArrayBuffer to satisfy BufferSource
    challenge: challenge.buffer,
    rp: { name: 'Freedom Family', id: window.location.hostname },
    user: {
      id: userHandle, // Uint8Array is fine here
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

  // 2) Get assertion to derive a key
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32).buffer, // ArrayBuffer again
    timeout: 60_000,
    rpId: window.location.hostname,
    allowCredentials: [{ id: cred.rawId, type: 'public-key' }],
    userVerification: 'required',
  };
  const assertion = (await navigator.credentials.get({ publicKey: getOpts })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Credential assertion failed.');

  const resp = assertion.response as AuthenticatorAssertionResponse;
  const material = new Uint8Array(resp.signature); // ArrayBuffer -> key material

  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  // 3) Encrypt secret
  const iv = randomBytes(12);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, strToBytes(secret));

  const blob: VaultBlob = { credId: credIdB64url, iv: bytesToB64(iv.buffer), ct: bytesToB64(ctBuf) };
  localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
  return true;
}

export async function unlockVault(): Promise<string> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available.');
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error('No vault set up on this device.');

  const blob = JSON.parse(raw) as VaultBlob;

  const allowId = b64urlToBytes(blob.credId);
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32).buffer,
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

  const ivBytes = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(blob.ct), c => c.charCodeAt(0));
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, ctBytes);

  return new TextDecoder().decode(ptBuf);
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
}
export function hasVault(): boolean {
  return !!localStorage.getItem(VAULT_KEY);
}

// ------- Aliases to match existing component imports -------
export const setupBiometricVault = createVault;
export const unlockBiometricVault = unlockVault;
export const clearBiometricVault = clearVault;
