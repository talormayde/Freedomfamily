// lib/biometric-vault.ts
// Stores the Supabase refresh_token encrypted behind Face ID / Touch ID (WebAuthn + WebCrypto)

const VAULT_DB = 'ff_bio_vault';
const VAULT_KEY = 'refresh_token';
const CRED_NAME = 'freefam-passkey';

type VaultRecord = { cipher: ArrayBuffer; iv: Uint8Array; credId: ArrayBuffer };

function openStore(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(VAULT_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kvs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function put(key: string, value: any) {
  const db = await openStore();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('kvs', 'readwrite');
    tx.objectStore('kvs').put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function get<T>(key: string): Promise<T | undefined> {
  const db = await openStore();
  return await new Promise<T | undefined>((res, rej) => {
    const tx = db.transaction('kvs', 'readonly');
    const req = tx.objectStore('kvs').get(key);
    req.onsuccess = () => res(req.result as T | undefined);
    req.onerror = () => rej(req.error);
  });
}

export async function isBiometricAvailable() {
  if (!('PublicKeyCredential' in window)) return false;
  try {
    // Some browsers throw in private mode
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function setupBiometricVault(refreshToken: string) {
  if (!(await isBiometricAvailable())) return false;

  // 1) Create a platform authenticator credential (prompts Face ID / Touch ID).
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { id: window.location.hostname, name: 'Freefam' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: CRED_NAME,
        displayName: 'Freefam Passkey',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
    },
  })) as PublicKeyCredential | null;

  if (!cred) return false;
  const credId = cred.rawId;

  // 2) Prompt the user (Face ID / Touch ID) to get an assertion we’ll use as key material.
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credId, type: 'public-key' }],
      userVerification: 'required',
    },
  })) as PublicKeyCredential;

  const material = new Uint8Array(assertion.response.signature as ArrayBuffer);
  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

  // 3) Encrypt and store the refresh token.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(refreshToken),
  );

  const record: VaultRecord = { cipher, iv, credId };
  await put(VAULT_KEY, record);
  return true;
}

export async function unlockBiometricVault(): Promise<string | null> {
  const record = await get<VaultRecord>(VAULT_KEY);
  if (!record) return null;

  // Ask for biometric again to derive the same key.
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: record.credId, type: 'public-key' }],
      userVerification: 'required',
    },
  })) as PublicKeyCredential;

  const material = new Uint8Array(assertion.response.signature as ArrayBuffer);
  const keyBytes = await crypto.subtle.digest('SHA-256', material);
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);

  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, aesKey, record.cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export async function clearBiometricVault() {
  const db = await openStore();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('kvs', 'readwrite');
    tx.objectStore('kvs').delete(VAULT_KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
