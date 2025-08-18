// lib/biometric-vault.ts
//
// Lightweight, client-only "biometric vault" for PWAs.
// - Stores a Supabase refresh token encrypted with AES-GCM.
// - Uses a platform passkey (WebAuthn) as a *gate* to unlock.
// - Derives the AES key from the stable WebAuthn credential ID.
// - Avoids Vercel/TS BufferSource pitfalls by using real ArrayBuffers.
//
// Exports:
//   - isBiometricAvailable()
//   - setupBiometricVault(refreshToken: string): Promise<boolean>
//   - unlockBiometricVault(): Promise<string | null>
//   - clearBiometricVault(): void
//
// Storage key: 'ff_biovault' in localStorage

type VaultRecord = {
  credId: string;     // base64url of PublicKeyCredential.id
  iv: string;         // base64url
  ct: string;         // base64url
  v: number;          // version
};

const STORE_KEY = 'ff_biovault';
const VAULT_VERSION = 1;

/* ---------------- environment/feature guards ---------------- */

export function isBiometricAvailable(): boolean {
  // Must be in a browser, secure context, with WebAuthn & WebCrypto available
  if (typeof window === 'undefined') return false;
  if (!('PublicKeyCredential' in window)) return false;
  if (!window.isSecureContext) return false;
  if (!('credentials' in navigator)) return false;
  if (!('crypto' in window) || !('subtle' in crypto)) return false;

  // Optional: only enable for platforms that have a user-verifying platform authenticator
  // We can't detect *presence*, but we can at least detect capability via isUserVerifyingPlatformAuthenticatorAvailable if present.
  const anyWin = window as any;
  if (typeof anyWin.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    // We return true optimistically; the actual boolean is async.
    return true;
  }
  return true;
}

/* ---------------- utils: base64url + buffers ---------------- */

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

/** Return a *real* ArrayBuffer (not SharedArrayBuffer) with cryptographically random bytes. */
function randomArrayBuffer(len: number): ArrayBuffer {
  const buf = new ArrayBuffer(len);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

/** Create a stable AES-GCM CryptoKey from a credential ID string. */
async function keyFromCredId(credIdB64Url: string): Promise<CryptoKey> {
  // Derive 32 bytes from SHA-256(credId)
  const idBytes = fromB64Url(credIdB64Url);
  const digest = await crypto.subtle.digest('SHA-256', idBytes);
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,                      // non-extractable
    ['encrypt', 'decrypt']
  );
}

/* ---------------- storage helpers ---------------- */

function readVault(): VaultRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultRecord;
    if (!parsed || typeof parsed.credId !== 'string') return null;
    return parsed;
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

/* ---------------- WebAuthn registration (setup) ---------------- */

export async function setupBiometricVault(refreshToken: string): Promise<boolean> {
  if (!isBiometricAvailable()) {
    alert('Biometric unlock is not available in this browser / context.');
    return false;
  }

  // If already set up, just overwrite with the new token (rotate).
  const existing = readVault();
  let credIdB64Url: string | null = existing?.credId ?? null;

  // If no credential yet, register a new platform passkey
  if (!credIdB64Url) {
    const challenge = randomArrayBuffer(32); // plain ArrayBuffer
    // Random user handle (16 bytes)
    const userHandle = new Uint8Array(16);
    crypto.getRandomValues(userHandle);

    const pubKey: PublicKeyCredentialCreationOptions = {
      challenge, // BufferSource (we provided ArrayBuffer)
      rp: {
        name: 'Freedom Family',
        id: window.location.hostname, // ensures passkey is bound to your domain
      },
      user: {
        id: userHandle,                       // BufferSource
        name: 'ff-user',                      // arbitrary label
        displayName: 'Freedom Family User',   // arbitrary label
      },
      pubKeyCredParams: [
        // Support common algs; -7 (ES256), -257 (RS256)
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // prefer device biometrics
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60_000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential | null;
    if (!credential) {
      alert('Biometric registration was cancelled.');
      return false;
    }

    // Save the stable credential ID (base64url)
    credIdB64Url = toB64Url(credential.rawId);
  }

  // Derive AES key from credId and encrypt the refresh token
  const key = await keyFromCredId(credIdB64Url);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const enc = new TextEncoder();
  const pt = enc.encode(refreshToken);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);

  writeVault({
    credId: credIdB64Url,
    iv: toB64Url(iv),
    ct: toB64Url(ctBuf),
    v: VAULT_VERSION,
  });

  return true;
}

/* ---------------- WebAuthn assertion (unlock) ---------------- */

export async function unlockBiometricVault(): Promise<string | null> {
  if (!isBiometricAvailable()) return null;

  const rec = readVault();
  if (!rec) {
    alert('Quick Unlock is not set up on this device yet.');
    return null;
  }

  // Require a successful biometric assertion *for this credential ID*
  const challenge = randomArrayBuffer(32);
  const allow: PublicKeyCredentialDescriptor[] = [
    {
      type: 'public-key',
      id: fromB64Url(rec.credId).buffer, // BufferSource (ArrayBuffer)
      // transports optional
    },
  ];

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: allow,
    userVerification: 'required',
    timeout: 60_000,
    rpId: window.location.hostname,
  };

  const assertion = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential | null;
  if (!assertion) {
    // User cancelled prompt
    return null;
  }

  // If we reached here, the platform verified biometrics/UV for the stored credential.
  // Now derive AES key from credId and decrypt the token.
  const key = await keyFromCredId(rec.credId);
  const iv = fromB64Url(rec.iv);
  const ct = fromB64Url(rec.ct);

  try {
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const dec = new TextDecoder();
    return dec.decode(ptBuf);
  } catch (e) {
    console.error('Vault decrypt failed:', e);
    alert('Could not unlock vault (data corrupted or key mismatch). Try re-enabling Quick Unlock.');
    return null;
  }
}
