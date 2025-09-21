import { logger } from "./logger";

const LEN_HEADER_BIT_LENGTH = 4 * 8;
const IV_HEADER_BITS = 16 * 8;
const SALT_HEADER_BIT_LENGTH = 16 * 8;
export const ENTIRE_HEADER_BIT_LENGTH =
  LEN_HEADER_BIT_LENGTH + IV_HEADER_BITS + SALT_HEADER_BIT_LENGTH;

const textEncoder = new TextEncoder();

export async function encryptWithSubtleCrypto(
  payload: string,
  password: string
) {
  try {
    const enc = textEncoder;
    const iv = generateRandom16ByteHeader();
    const keySalt = generateRandom16ByteHeader();
    const byteCapacityRequired =
      Math.floor(getUtf8ByteLength(payload) / 16) * 16 + 16;

    logger(() => {
      console.log("Initialization Vector:", iv);
      console.log("Key salt:", keySalt);
      console.log("Payload:", payload);
      console.log("Byte capacity required for payload:", byteCapacityRequired);
    }, "debug");

    const key = await generateKey(password, keySalt);

    if (key) {
      // Encrypt
      const encryptedPayload = await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv: iv },
        key,
        enc.encode(payload)
      );

      logger(() => {
        console.log("Encrypted payload:", encryptedPayload);
      }, "debug");

      // generate length header based on encrypted payload size
      const lengthHeaderBytes = generateLengthHeader(
        encryptedPayload.byteLength
      );

      // add length header before encrypted payload
      const encryptedPayloadWithHeaders = new Uint8ClampedArray(
        lengthHeaderBytes.concat(
          Array.from(iv),
          Array.from(keySalt),
          Array.from(new Uint8ClampedArray(encryptedPayload))
        )
      );
      logger(() => {
        console.log(
          "Encrypted payload with headers:",
          encryptedPayloadWithHeaders
        );
      }, "debug");

      return encryptedPayloadWithHeaders;
    }
  } catch (err) {
    logger(() => {
      console.error("Error encrypting:", err);
    }, "error");
  }
}

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
    if (key) {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv: iv },
        key,
        encryptedArr
      );
      const originalText = new TextDecoder().decode(decrypted);
      return originalText;
    }
  } catch (err) {
    logger(() => {
      console.error("Error decrypting:", err);
    }, "error");
  }
}

export async function generateKey(
  password: string,
  salt: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    // Derive a key from the password
    const enc = textEncoder;
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
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
  }
}

export function encodePayloadInAlpha(
  pixelBytes: Uint8ClampedArray<ArrayBuffer>,
  payload: Uint8ClampedArray<ArrayBuffer>
) {
  try {
    const bits = uint8ArrayToBits(payload);

    // encoding payload into LSB of each alpha byte
    for (let i = 0; i < bits.length; i++) {
      const alphaIndex = i * 4 + 3;
      if (alphaIndex >= pixelBytes.length) break;

      // 0xFE is 254 in hexadecimal (which is 11111110 in binary)
      // perform bit AND operation clearing only LSB (least significant bit) and then perform OR operation setting LSB to whatever bits[i] is
      pixelBytes[alphaIndex] = (pixelBytes[alphaIndex] & 0xfe) | bits[i];
    }

    // generate random bytes to store in LSB of remaining alpha bytes of image
    const fillerBytes = getLargeRandomValues(
      pixelBytes.length - bits.length / 8
    );
    const fillerBits = uint8ArrayToBits(fillerBytes);

    // randomly change value of 0 or 1 LSB of all remaining alpha bytes
    for (let i = bits.length; i < fillerBits.length; i++) {
      const alphaIndex = i * 4 + 3;
      if (alphaIndex >= pixelBytes.length) break;
      pixelBytes[alphaIndex] =
        (pixelBytes[alphaIndex] & 0xfe) | fillerBits[i - bits.length];
    }

    return pixelBytes;
  } catch (err) {
    console.error("Error encoding payload:", err);
  }
}

export async function decodePayloadFromAlpha(
  pixels: Uint8ClampedArray<ArrayBuffer>,
  password: string
): Promise<string | undefined> {
  try {
    const imageAlphaBits: number[] = [];

    // Extract bits from alpha LSB of all pixels
    const numAlphaBits = Math.floor(pixels.length / 4) * 8;
    for (let i = 0; i < numAlphaBits; i++) {
      const alphaIndex = i * 4 + 3;
      if (alphaIndex >= pixels.length) break;
      imageAlphaBits.push(pixels[alphaIndex] & 1);
    }
    // console.log("Bits from alpha", imageAlphaBits);
    const headerBits = imageAlphaBits.slice(0, ENTIRE_HEADER_BIT_LENGTH);
    const lengthHeaderBits = headerBits.slice(0, 32);
    const ivHeaderBits = headerBits.slice(32, 160);
    const saltHeaderBits = headerBits.slice(160, 288);
    const payloadLength = convertBitsToDecimal(lengthHeaderBits);
    const iv = convertBitsToByteArr(ivHeaderBits);
    const salt = convertBitsToByteArr(saltHeaderBits);

    logger(() => {
      console.log("Extracted length header from bits:", payloadLength);
      console.log("IV extracted from header:", iv);
      console.log("salt extracted from header:", salt);
    }, "debug");

    // Group bits into bytes (skipping length header which is first 36 bytes or 288 bits)
    const bytes: number[] = [];
    for (
      let i = ENTIRE_HEADER_BIT_LENGTH;
      i < ENTIRE_HEADER_BIT_LENGTH + payloadLength * 8;
      i += 8
    ) {
      const byteBits = imageAlphaBits.slice(i, i + 8);
      if (byteBits.length < 8) break; // incomplete byte at end
      const byte = byteBits.reduce((acc, bit) => (acc << 1) | bit, 0);
      bytes.push(byte);
    }

    logger(() => {
      console.log("Grouped bits into bytes for decoding:", bytes);
    }, "debug");

    return await decryptWithSubtleCrypto(
      new Uint8ClampedArray(bytes).buffer,
      password,
      iv,
      salt
    );
  } catch (err) {
    logger(() => {
      console.error("Error decoding payload:", err);
    }, "error");
  }
}

//Convert payload length to a fixed-size header.
// 4-byte (32-bit) unsigned integer - which allows for payloads up to 4GB lol
// Represent this as an array of 4 bytes in big-endian format.
function generateLengthHeader(payloadLength: number) {
  return [
    (payloadLength >> 24) & 0xff,
    (payloadLength >> 16) & 0xff,
    (payloadLength >> 8) & 0xff,
    payloadLength & 0xff,
  ];
}

// export function generateRandom16ByteHeader() {
//   const nums = new Array(16)
//     .fill(null)
//     .map((e) => Math.round(Math.random() * 255));
//   return new Uint8Array(nums);
// }

function generateRandom16ByteHeader() {
  const byteArray = new Uint8ClampedArray(16);
  // crypto.getRandomValues() is much more secure than using math.random()
  window.crypto.getRandomValues(byteArray);
  return new Uint8ClampedArray(byteArray);
}

function uint8ArrayToBits(uint8arr: Uint8ClampedArray<ArrayBuffer>) {
  const bits = [];
  for (let i = 0; i < uint8arr.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((uint8arr[i] >> j) & 1);
    }
  }
  return bits;
}

function convertBitsToDecimal(bits: number[]) {
  let num = 0;
  for (let i = 0; i < bits.length; i++) {
    num = (num << 1) | bits[i];
  }
  return num;
}

function convertBitsToByteArr(bits: number[]) {
  const byteArr = [];
  for (let i = 0; i < bits.length / 8; i++) {
    let curByteDecimalVal = 0;
    for (let j = 0; j < 8; j++) {
      curByteDecimalVal = (curByteDecimalVal << 1) | bits[i * 8 + j];
    }
    byteArr.push(curByteDecimalVal);
  }
  return new Uint8ClampedArray(byteArr);
}

/**
 * @summary window.crypto.getRandomValues only allows generating 65,536 bytes at a time. This function serves to chunk the requested amount and re-stich the resulting bytes together.
 * @param totalBytes
 * @returns
 */
function getLargeRandomValues(totalBytes: number) {
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

/**
 *
 * @param secretKey
 * @param maxLength image alpha bit length - (headerLength + payloadLength)
 * @returns
 */
async function deriveRandomStartIndex(secretKey: string, maxLength: number) {
  // Encode the secret key as Uint8Array
  const encoder = textEncoder;
  const data = encoder.encode(secretKey);

  // Use subtle crypto to hash the secret key with SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert the first 4 bytes of the hash to an unsigned 32-bit integer
  const view = new DataView(hashBuffer);
  const hashInt = view.getUint32(0, false); // big-endian

  // Reduce modulo maxLength to get a valid index within bounds
  const startIndex = hashInt % maxLength;

  return startIndex;
}

function getUtf8ByteLength(str: string) {
  return textEncoder.encode(str).length;
}
