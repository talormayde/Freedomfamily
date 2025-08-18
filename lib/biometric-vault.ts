// lib/biometric-vault.ts
// Tiny “vault” that lets a user protect a small secret (e.g., refresh token)
// behind platform biometrics using WebAuthn (passkeys / Touch ID / Face ID).
// We derive a symmetric key from the WebAuthn assertion "signature" and use it
// to AES-GCM encrypt/decrypt the stored secret in localStorage.

const VAULT_KEY = 'biometric.vault.v1'; // where we store the encrypted blob

type VaultBlob = {
  credId: string;   // base64url of PublicKeyCredential.id
  iv: string;       // base64 of AES-GCM IV
  ct: string;       // base64 of ciphertext
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

/**
 * Register a platform credential and store an encrypted secret in localStorage.
 * @param secret the plaintext to protect (e.g., a refresh token)
 */
export async function createVault(secret: string): Promise<void> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available on this device.');

  // 1) Create a platform credential
  const challenge = randomBytes(32);
  const userHandle = randomBytes(16);
  const pubKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: 'Freedom Family', id: window.location.hostname },
    user: {
      id: userHandle,
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
  if (!cred) throw new Error('Credential creation was cancelled or failed.');
  const credIdB64url = bytesToB64url(cred.rawId);

  // 2) Immediately perform an assertion to get a stable “material” for key derivation
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32),
    timeout: 60_000,
    rpId: window.location.hostname,
    allowCredentials: [{ id: cred.rawId, type: 'public-key' }],
    userVerification: 'required',
  };
  const assertion = (await navigator.credentials.get({ publicKey: getOpts })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Credential assertion failed.');

  // *** Type narrowing fix here ***
  const resp = assertion.response as AuthenticatorAssertionResponse;
  // resp.signature is an ArrayBuffer
  const material = new Uint8Array(resp.signature);

  // Derive AES key from the signature (hash to 256-bit)
  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  // 3) Encrypt the secret
  const iv = randomBytes(12);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, strToBytes(secret));

  const blob: VaultBlob = {
    credId: credIdB64url,
    iv: bytesToB64(iv),
    ct: bytesToB64(ctBuf),
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
}

/**
 * Unlock the vault by asking for a biometric assertion and decrypting.
 * @returns the decrypted plaintext secret
 */
export async function unlockVault(): Promise<string> {
  if (!isBiometricAvailable()) throw new Error('Biometric/WebAuthn not available.');
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error('No vault is set up on this device.');

  const blob = JSON.parse(raw) as VaultBlob;

  const allowId = b64urlToBytes(blob.credId);
  const getOpts: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32),
    timeout: 60_000,
    rpId: window.location.hostname,
    allowCredentials: [{ id: allowId, type: 'public-key' }],
    userVerification: 'required',
  };
  const assertion = (await navigator.credentials.get({ publicKey: getOpts })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Biometric assertion failed.');

  // *** Type narrowing fix here ***
  const resp = assertion.response as AuthenticatorAssertionResponse;
  const material = new Uint8Array(resp.signature);

  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0)) },
    aesKey,
    Uint8Array.from(atob(blob.ct), c => c.charCodeAt(0))
  );

  return new TextDecoder().decode(ptBuf);
}

/** Remove the stored vault (user will need to set it up again). */
export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
}

/** Quick check for UI toggles. */
export function hasVault(): boolean {
  return !!localStorage.getItem(VAULT_KEY);
}
