import { generateRandomBytes } from "./bitByteUtils";
import { HEADER_BIT_STRUCUTRE } from "./encodingUtils";
import { logger } from "./logger";

const KEY_DERIVATION_ITERATIONS = 100000;

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

/** Secret string provided by the user in order to generate CryptoKey for encrypting or decrypting payload */
type Password = string;

/** UTF-8 string that is used as the data source to encrypt/decrypt */
type Payload = string | Uint8ClampedArray;

/**
 * Uses Browser SubtleCrypto API in order to encrypt provided UTF-8 payload
 * @returns UInt8ClampedArray of the encrypted payload
 */
async function encryptWithSubtleCrypto(
  payload: Payload,
  key: CryptoKey,
  initVector: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    const byteCapacityRequired =
      typeof payload === "string"
        ? Math.floor(getUtf8ByteLength(payload) / 16) * 16 + 16
        : payload.byteLength;

    logger(() => {
      console.log("Initialization Vector:", initVector);
      console.log("Payload:", payload);
      console.log("Byte capacity required for payload:", byteCapacityRequired);
    }, "debug");

    const encryptedPayload = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv: initVector },
      key,
      typeof payload === "string"
        ? textEncoder.encode(payload)
        : new Uint8ClampedArray(payload)
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
  salt: Uint8ClampedArray<ArrayBuffer>,
  payloadType: string
) {
  try {
    logger(() => {
      console.log("Decrypting:", encryptedArr, password, iv, salt);
    }, "debug");

    const key = await generateKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encryptedArr
    );
    if (payloadType === "message") {
      const originalText = new TextDecoder().decode(decrypted);
      return originalText;
    } else {
      return decrypted;
    }
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

/** This function return data to be encoded into an iamge. The data consists of meta data header as well as encrypted payload */
export async function generateEncryptedImageData(
  password: Password,
  payload: Payload,
  payloadType: string,
  payloadFileExt?: string
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

    const payloadHeader = generatePayloadHeader(
      encryptedPayload.byteLength,
      initVector,
      keySalt,
      payloadType,
      payloadFileExt
    );

    logger(() => {
      console.log("Payload header:", payloadHeader);
    }, "debug");

    const dataToEncode = new Uint8ClampedArray(
      Array.from(payloadHeader).concat(
        Array.from(new Uint8ClampedArray(encryptedPayload))
      )
    );

    logger(() => {
      console.log("data to encode:", dataToEncode);
    }, "debug");

    return dataToEncode;
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
  keySalt: Uint8ClampedArray<ArrayBuffer>,
  payloadType: string,
  payloadFileExt?: string
) {
  // generate length header based on encrypted payload size
  const lengthHeaderBytes = generateLengthHeader(encryptedPayLoadByteLength);

  const payloadTypeByte = [payloadType === "file" ? 1 : 0];

  const payloadFileExtBitLength =
    HEADER_BIT_STRUCUTRE.PAYLOAD_FILE_EXT_BIT_RANGE[1] -
    HEADER_BIT_STRUCUTRE.PAYLOAD_FILE_EXT_BIT_RANGE[0];

  const payloadFileExtBytes = new Uint8ClampedArray(
    payloadFileExtBitLength / 8
  );
  payloadFileExtBytes.fill(0);
  if (payloadFileExt) {
    // Write the extension char codes into the header
    for (
      let i = 0;
      i < payloadFileExt.length && i < payloadFileExtBytes.length;
      i++
    ) {
      payloadFileExtBytes[i] = payloadFileExt.charCodeAt(i);
    }
  }

  return new Uint8ClampedArray(
    lengthHeaderBytes.concat(
      Array.from(iv),
      Array.from(keySalt),
      payloadTypeByte,
      Array.from(payloadFileExtBytes)
    )
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
