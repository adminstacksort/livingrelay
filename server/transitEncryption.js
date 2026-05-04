import { constants, generateKeyPairSync, privateDecrypt, randomUUID } from "node:crypto";

const encryptedFieldsKey = "_encryptedFields";
const transitKeyId = `transit-${randomUUID()}`;
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "der" }
});

const publicKeyResponse = Object.freeze({
  alg: "RSA-OAEP-256",
  keyId: transitKeyId,
  publicKey: Buffer.from(publicKey).toString("base64")
});

export function getTransitPublicKey() {
  return publicKeyResponse;
}

export function decryptTransitFields(body, allowedFields = []) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const encryptedFields = body[encryptedFieldsKey];
  if (!encryptedFields) return body;
  if (typeof encryptedFields !== "object" || Array.isArray(encryptedFields)) {
    const error = new Error("Invalid encrypted field payload.");
    error.statusCode = 400;
    throw error;
  }

  const allowed = new Set(allowedFields);
  for (const [field, envelope] of Object.entries(encryptedFields)) {
    if (!allowed.has(field)) {
      const error = new Error(`Encrypted field is not accepted here: ${field}`);
      error.statusCode = 400;
      throw error;
    }
    body[field] = decryptFieldEnvelope(envelope);
  }
  delete body[encryptedFieldsKey];
  return body;
}

function decryptFieldEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || envelope.alg !== "RSA-OAEP-256" || envelope.keyId !== transitKeyId) {
    const error = new Error("Invalid encrypted field envelope.");
    error.statusCode = 400;
    throw error;
  }
  try {
    const decrypted = privateDecrypt({
      key: privateKey,
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING
    }, Buffer.from(String(envelope.ciphertext || ""), "base64"));
    return decrypted.toString("utf8");
  } catch {
    const error = new Error("Could not decrypt encrypted field.");
    error.statusCode = 400;
    throw error;
  }
}
