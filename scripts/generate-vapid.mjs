import { generateKeyPairSync } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const rawPublic = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pub.x.replace(/-/g, "+").replace(/_/g, "/") + "==", "base64"),
  Buffer.from(pub.y.replace(/-/g, "+").replace(/_/g, "/") + "==", "base64"),
]);

console.log("VAPID_PUBLIC_KEY=" + b64url(rawPublic));
console.log("VAPID_PRIVATE_KEY=" + priv.d);
console.log("VAPID_SUBJECT=mailto:you@example.com");
