import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign,
} from "node:crypto";

export type PushKeys = { p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

function b64url(input: Buffer | string): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromB64url(input: string): Buffer {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s + "=".repeat((4 - (s.length % 4)) % 4), "base64");
}

function hmac(key: Buffer, data: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  let out = Buffer.alloc(0);
  let t = Buffer.alloc(0);
  let counter = 1;
  while (out.length < length) {
    t = Buffer.from(hmac(prk, Buffer.concat([t, info, Buffer.from([counter])])));
    out = Buffer.concat([out, t]);
    counter += 1;
  }
  return out.subarray(0, length);
}

function vapidJWT(endpoint: string, publicKey: string, privateKey: string, subject: string): string {
  const pub = fromB64url(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("Invalid VAPID public key");
  const x = b64url(pub.subarray(1, 33));
  const y = b64url(pub.subarray(33, 65));
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x, y, d: privateKey, ext: true },
    format: "jwk",
  });
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64url(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  }));
  const input = Buffer.from(`${header}.${payload}`);
  const signature = sign("sha256", input, { key, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${b64url(signature)}`;
}

function encrypt(subscriptionKey: string, authSecret: string, payload: Buffer) {
  const uaPublic = fromB64url(subscriptionKey);
  const auth = fromB64url(authSecret);
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);

  const prkKey = hmac(auth, shared);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, serverPublic]);
  const ikm = hkdfExpand(prkKey, info, 32);

  const salt = randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0"), 12);

  const plain = Buffer.concat([payload, Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const header = Buffer.concat([salt, rs, Buffer.from([serverPublic.length]), serverPublic]);
  return Buffer.concat([header, encrypted]);
}

export async function sendWebPush(opts: {
  endpoint: string;
  keys: PushKeys;
  payload: PushPayload;
}) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) throw new Error("VAPID is not configured");

  const body = encrypt(opts.keys.p256dh, opts.keys.auth, Buffer.from(JSON.stringify(opts.payload)));
  const jwt = vapidJWT(opts.endpoint, publicKey, privateKey, subject);

  const response = await fetch(opts.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body,
  });

  return { ok: response.ok, status: response.status, text: await response.text().catch(() => "") };
}
