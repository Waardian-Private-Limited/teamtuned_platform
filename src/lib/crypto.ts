import { API_BASE_URL } from '@/config/env';

let cachedPem: string | null = null;

async function fetchServerPublicKeyPem(): Promise<string> {
  if (cachedPem) return cachedPem;
  const res = await fetch(`${API_BASE_URL}/auth/public-key`, { credentials: 'include' });
  const data = await res.json();
  cachedPem = data.publicKey as string;
  return cachedPem!;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;
}

async function importSpkiPem(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

export async function encryptPassword(password: string): Promise<string> {
  const pem = await fetchServerPublicKeyPem();
  const key = await importSpkiPem(pem);
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data);
  const bytes = new Uint8Array(cipher);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}