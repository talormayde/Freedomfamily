// lib/biometric-vault.ts
//
// Client-only "biometric vault" for PWA convenience.
// Exports the helpers your components expect:
//   - isBiometricAvailable()
//   - hasVault()
//   - setupBiometricVault(refreshToken)
//   - unlockBiometricVault()
//   - clearBiometricVault()

type VaultRecord = {
  credId: string; // base64url credential id
  iv: string;     // base64url
  ct: string;     // base64url
  v: number;      // schema version
};

const STORE_KEY = 'ff_biovault';
const VAULT_VERSION = 1;

/* ---------------- feature checks ---------------- */

export function isBiometricAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('PublicKeyCredential' in window)) return false;
  if (!window.isSecureContext) return false;
  if (!('credentials' in navigator)) return false;
  if (!('crypto' in window) || !('subtle' in crypto)) return false;
  return true;
}

/** Do we have a vault blob stored on this device? */
export function hasVault(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(STORE_KEY);
  } catch {
    return false;
  }
}

/* ---------------- base64url & buffers ---------------- */

function toB64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '==='.slice(b64.length % 4) : '';
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Cryptographically random **ArrayBuffer** (not SharedArrayBuffer). */
function randomArrayBuffer(len: number): ArrayBuffer {
  const buf = new ArrayBuffer(len);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

/** Derive an AES-GCM key from a credential ID (SHA-256). */
async function keyFromCredId(credIdB64Url: string): Promise<CryptoKey> {
  const idBytes = fromB64Url(credIdB64Url);
  const digest = await crypto.subtle.digest('SHA-256', idBytes);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/* ---------------- storage ---------------- */

function readVault(): VaultRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as VaultRecord;
    if (!rec?.credId) return null;
    return rec;
  } catch {
    return null;
  }
}

function writeVault(rec: VaultRecord) {
  localStorage.setItem(STORE_KEY, JSON.stringify(rec));
}

export function clearBiometricVault() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORE_KEY);
}

/* ---------------- setup (register + encrypt) ---------------- */

export async function setupBiometricVault(refreshToken: string): Promise<boolean> {
  if (!isBiometricAvailable()) {
    alert('Biometric unlock is not available on this device/browser.');
    return false;
  }

  const existing = readVault();
  let credIdB64Url: string | null = existing?.credId ?? null;

  if (!credIdB64Url) {
    // Register a platform authenticator (passkey)
    const challenge = randomArrayBuffer(32); // ArrayBuffer satisfies BufferSource
    const userHandle = new Uint8Array(16);
    crypto.getRandomValues(userHandle);

    const pubKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: 'Freedom Family', id: window.location.hostname },
      user: { id: userHandle, name: 'ff-user', displayName: 'Freedom Family User' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      attestation: 'none',
      timeout: 60_000,
    };

    const cred = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential | null;
    if (!cred) {
      alert('Biometric registration cancelled.');
      return false;
    }
    credIdB64Url = toB64Url(cred.rawId);
  }

  // Encrypt refresh token with AES-GCM derived from credId
  const key = await keyFromCredId(credIdB64Url);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const pt = new TextEncoder().encode(refreshToken);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);

  writeVault({ credId: credIdB64Url, iv: toB64Url(iv), ct: toB64Url(ctBuf), v: VAULT_VERSION });
  return true;
}

/* ---------------- unlock (assert + decrypt) ---------------- */

export async function unlockBiometricVault(): Promise<string | null> {
  if (!isBiometricAvailable()) return null;

  const rec = readVault();
  if (!rec) {
    alert('Quick Unlock is not set up on this device yet.');
    return null;
  }

  // Require a successful user verification for the stored credential
  const challenge = randomArrayBuffer(32);
  const allow: PublicKeyCredentialDescriptor[] = [
    { type: 'public-key', id: fromB64Url(rec.credId).buffer },
  ];

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: allow,
    userVerification: 'required',
    rpId: window.location.hostname,
    timeout: 60_000,
  };

  const assertion = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential | null;
  if (!assertion) return null; // user cancelled

  // Derive key & decrypt
  try {
    const key = await keyFromCredId(rec.credId);
    const iv = fromB64Url(rec.iv);
    const ct = fromB64Url(rec.ct);
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(ptBuf);
  } catch (e) {
    console.error('Vault decrypt failed:', e);
    alert('Could not unlock. Try re-enabling Quick Unlock.');
    return null;
  }
}
