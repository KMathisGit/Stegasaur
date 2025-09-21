import { generateRandomBytes } from "./bitByteUtils";
import { logger } from "./logger";

const KEY_DERIVATION_ITERATIONS = 100000;

const textEncoder = new TextEncoder();

/** Secret string provided by the user in order to generate CryptoKey for encrypting or decrypting payload */
type Password = string;

/** UTF-8 string that is used as the data source to encrypt/decrypt */
type Payload = string;

/**
 * Uses Browser SubtleCrypto API in order to encrypt provided payload
 * @returns UInt8ClampedArray of the encrypted payload
 */
async function encryptWithSubtleCrypto(
  payload: Payload,
  key: CryptoKey,
  initVector: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    const byteCapacityRequired =
      Math.floor(getUtf8ByteLength(payload) / 16) * 16 + 16;

    logger(() => {
      console.log("Initialization Vector:", initVector);
      console.log("Payload:", payload);
      console.log("Byte capacity required for payload:", byteCapacityRequired);
    }, "debug");

    const encryptedPayload = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv: initVector },
      key,
      textEncoder.encode(payload)
    );

    logger(() => {
      console.log("Encrypted payload:", encryptedPayload);
    }, "debug");

    return encryptedPayload;
  } catch (err) {
    logger(() => {
      console.error("Error encrypting:", err);
    }, "error");
    throw err;
  }
}

/**
 * Uses Browser SubtleCrypto API in order to decrypt provided payload
 * @returns UTF-8 string of decrypted data
 */
export async function decryptWithSubtleCrypto(
  encryptedArr: ArrayBuffer,
  password: string,
  iv: Uint8ClampedArray<ArrayBuffer>,
  salt: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    logger(() => {
      console.log("Decrypting:", encryptedArr, password, iv);
    }, "debug");

    const key = await generateKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encryptedArr
    );
    const originalText = new TextDecoder().decode(decrypted);
    return originalText;
  } catch (err) {
    logger(() => {
      console.error("Error decrypting:", err);
    }, "error");
    throw err;
  }
}

/**
 *
 * @param password Secret provided by the user at time of encrypting or decrypting
 * @param salt 16 Byte UInt8Clamped Arraybuffer that was randomly generated
 * @returns CryptoKey to use in order to encrypt/decrypt data w/ Crypto.Subtle API
 */
async function generateKey(
  password: string,
  keySalt: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: keySalt,
        iterations: KEY_DERIVATION_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-CBC", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    return key;
  } catch (err) {
    logger(() => {
      console.error("Error generating key:", err);
    }, "error");
    throw err;
  }
}

/** This function generates encrypted data to be encoded into an image */
export async function generateEncryptedImageData(
  password: Password,
  payload: Payload
) {
  try {
    const initVector = generateRandomBytes(16);
    const keySalt = generateRandomBytes(16);
    const key = await generateKey(password, keySalt);
    const encryptedPayload = await encryptWithSubtleCrypto(
      payload,
      key,
      initVector
    );

    const encryptedPayloadHeader = generatePayloadHeader(
      encryptedPayload.byteLength,
      initVector,
      keySalt
    );

    logger(() => {
      console.log("encrypted payload header V2:", encryptedPayloadHeader);
    }, "debug");

    const encryptedData = new Uint8ClampedArray(
      Array.from(encryptedPayloadHeader).concat(
        Array.from(new Uint8ClampedArray(encryptedPayload))
      )
    );

    logger(() => {
      console.log("encrypted payload with headers V2:", encryptedData);
    }, "debug");

    return encryptedData;
  } catch (err) {
    console.error("Error injecting payload:", err);
    throw "err";
  }
}

/**
 * @summary window.crypto.getRandomValues only allows generating 65,536 bytes at a time. This function serves to chunk the requested amount and re-stich the resulting bytes together.
 * @param totalBytes
 * @returns
 */
export function getLargeRandomValues(totalBytes: number) {
  const maxBytes = 65536;
  const result = new Uint8ClampedArray(totalBytes);
  let offset = 0;

  while (totalBytes > 0) {
    const chunkSize = Math.min(totalBytes, maxBytes);
    const chunk = new Uint8ClampedArray(chunkSize);
    window.crypto.getRandomValues(chunk);
    result.set(chunk, offset);
    offset += chunkSize;
    totalBytes -= chunkSize;
  }

  return result;
}

/** Generates header filled with meta data stored at beginning of data */
function generatePayloadHeader(
  encryptedPayLoadByteLength: number,
  iv: Uint8ClampedArray<ArrayBuffer>,
  keySalt: Uint8ClampedArray<ArrayBuffer>
) {
  // generate length header based on encrypted payload size
  const lengthHeaderBytes = generateLengthHeader(encryptedPayLoadByteLength);

  return new Uint8ClampedArray(
    lengthHeaderBytes.concat(Array.from(iv), Array.from(keySalt))
  );
}

function generateLengthHeader(payloadLength: number) {
  return [
    (payloadLength >> 24) & 0xff,
    (payloadLength >> 16) & 0xff,
    (payloadLength >> 8) & 0xff,
    payloadLength & 0xff,
  ];
}

function getUtf8ByteLength(str: string) {
  return textEncoder.encode(str).length;
}
