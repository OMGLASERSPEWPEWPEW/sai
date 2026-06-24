import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PushSubscription {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export async function sendPushToUser(
  db: SupabaseClient,
  recipientId: string,
  payload: PushPayload,
): Promise<void> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[push] VAPID keys not configured, skipping");
    return;
  }

  const { data: subscriptions } = await db
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("user_id", recipientId);

  if (!subscriptions || subscriptions.length === 0) return;

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  for (const sub of subscriptions as PushSubscription[]) {
    sendEncryptedPush(sub, payloadBytes, vapidPublicKey, vapidPrivateKey)
      .catch((err) => {
        console.warn(`[push] Failed for ${sub.endpoint.slice(0, 50)}:`, err.message);
        if (err.status === 410 || err.status === 404) {
          db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).then(() => {});
        }
      });
  }
}

async function sendEncryptedPush(
  sub: PushSubscription,
  payload: Uint8Array,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string,
): Promise<void> {
  const subscriberPubBytes = base64urlToBytes(sub.keys_p256dh);
  const subscriberAuthBytes = base64urlToBytes(sub.keys_auth);

  const subscriberPubKey = await crypto.subtle.importKey(
    "raw", subscriberPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false, [],
  );

  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveBits"],
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey },
    ephemeralKeyPair.privateKey,
    256,
  );

  const ephemeralPubBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const authInfo = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    subscriberPubBytes,
    ephemeralPubBytes,
  );

  const prkKey = await crypto.subtle.importKey(
    "raw", new Uint8Array(sharedSecret),
    { name: "HKDF" }, false, ["deriveBits"],
  );

  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: subscriberAuthBytes, info: authInfo },
    prkKey, 256,
  );

  const ikmKey = await crypto.subtle.importKey(
    "raw", new Uint8Array(ikm),
    { name: "HKDF" }, false, ["deriveBits"],
  );

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: aes128gcm\0") },
    ikmKey, 128,
  );

  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: nonce\0") },
    ikmKey, 96,
  );

  const padded = concatBytes(payload, new Uint8Array([2]));

  const cek = await crypto.subtle.importKey(
    "raw", new Uint8Array(cekBits),
    { name: "AES-GCM" }, false, ["encrypt"],
  );

  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
    cek, padded,
  ));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  const body = concatBytes(
    salt,
    rs,
    new Uint8Array([ephemeralPubBytes.length]),
    ephemeralPubBytes,
    encrypted,
  );

  const vapidJwt = await createVapidJwt(
    sub.endpoint, vapidPublicKeyB64, vapidPrivateKeyB64,
  );

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${vapidJwt}, k=${vapidPublicKeyB64}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "3600",
    },
    body,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err = new Error(`Push ${res.status}: ${errBody.slice(0, 200)}`);
    (err as unknown as { status: number }).status = res.status;
    throw err;
  }
}

async function createVapidJwt(
  endpoint: string,
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = bytesToBase64url(new TextEncoder().encode(
    JSON.stringify({ typ: "JWT", alg: "ES256" }),
  ));

  const payload = bytesToBase64url(new TextEncoder().encode(
    JSON.stringify({ aud: audience, exp: now + 3600, sub: "mailto:noreply@mindshare.app" }),
  ));

  const unsignedToken = `${header}.${payload}`;

  const privateKeyBytes = base64urlToBytes(privateKeyB64);
  const publicKeyBytes = base64urlToBytes(publicKeyB64);
  const x = bytesToBase64url(publicKeyBytes.slice(1, 33));
  const y = bytesToBase64url(publicKeyBytes.slice(33, 65));
  const d = bytesToBase64url(privateKeyBytes);

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"],
  );

  const signatureBytes = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  ));

  return `${unsignedToken}.${bytesToBase64url(signatureBytes)}`;
}

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToBase64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
