export const _iv = new Uint8Array([
  124, 254, 48, 86, 21, 193, 247, 84, 53, 76, 238, 117, 134, 195, 116, 75,
]);

export async function encryptWithSubtleCrypto(
  text: string,
  password: string,
  iv: Uint8Array<ArrayBuffer> = _iv
) {
  const enc = new TextEncoder();
  const key = await generateKey(password);

  // Encrypt

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv },
    key,
    enc.encode(text)
  );
  console.log("encrypted:", encrypted, password, iv);

  // generate length header based on encrypted payload size
  const lengthHeaderBytes = generateLengthHeader(encrypted.byteLength);
  // add length header before encrypted payload
  return new Uint8Array(
    lengthHeaderBytes.concat(Array.from(new Uint8Array(encrypted)))
  );
}

export async function decryptWithSubtleCrypto(
  encryptedArr: ArrayBuffer,
  password: string,
  iv: Uint8Array<ArrayBuffer> = _iv
) {
  try {
    console.log("decrypting:", encryptedArr, password, iv);
    const key = await generateKey(password);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encryptedArr
    );
    const originalText = new TextDecoder().decode(decrypted);

    return originalText;
  } catch (err) {
    console.log("Error decrypting:", err);
  }
}

export async function generateKey(password: string) {
  // Derive a key from the password
  const enc = new TextEncoder();
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
      salt: new Uint8Array(16), // A unique salt is crucial for security
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

export function encodePayloadInAlpha(
  pixels: Uint8ClampedArray,
  payload: Uint8Array<ArrayBuffer>
) {
  // add length header
  const lengthHeader = generateLengthHeader(payload.length);
  payload = new Uint8Array(lengthHeader.concat(Array.from(payload)));

  function uint8ArrayToBits(uint8arr: Uint8Array<ArrayBuffer>) {
    const bits = [];
    for (let i = 0; i < uint8arr.length; i++) {
      for (let j = 7; j >= 0; j--) {
        bits.push((uint8arr[i] >> j) & 1);
      }
    }
    return bits;
  }

  const bits = uint8ArrayToBits(payload);

  for (let i = 0; i < bits.length; i++) {
    const alphaIndex = i * 4 + 3;
    if (alphaIndex >= pixels.length) break;

    // 0xFE is 254 in hexadecimal (which is 11111110 in binary)
    // perform bit AND operation clearing only LSB (least significant bit) and then perform OR operation setting LSB to whatever bits[i] is
    pixels[alphaIndex] = (pixels[alphaIndex] & 0xfe) | bits[i];
  }
  return pixels;
}

export async function decodePayloadFromAlpha(
  pixels: Uint8ClampedArray,
  password: string
): Promise<string | undefined> {
  const bits: number[] = [];

  // Extract bits from alpha LSB of all pixels
  const maxBits = Math.floor(pixels.length / 4) * 8;
  for (let i = 0; i < maxBits; i++) {
    const alphaIndex = i * 4 + 3;
    if (alphaIndex >= pixels.length) break;
    bits.push(pixels[alphaIndex] & 1);
  }
  console.log("Bits from alpha", bits);
  const lengthHeader = extractLengthHeader(bits);
  console.log("Extracted length header from bits:", lengthHeader);

  // Group bits into bytes
  const bytes: number[] = [];
  for (let i = 32; i < 32 + lengthHeader * 8; i += 8) {
    const byteBits = bits.slice(i, i + 8);
    if (byteBits.length < 8) break; // incomplete byte at end
    const byte = byteBits.reduce((acc, bit) => (acc << 1) | bit, 0);
    bytes.push(byte);
  }

  console.log("Grouped bits into bytes for decoding:", bytes);

  // TODO: FIGURE OUT WHY I NEED TO SLICE(4) - I believe it is due to length header but the length header should have already been accounted for in the above for loop starting at 32 (4 bytes in)... wtf?
  return await decryptWithSubtleCrypto(
    new Uint8Array(bytes.slice(4)).buffer,
    password
  );
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

// Extract first 32 bits and convert back to number
function extractLengthHeader(bits: number[], start = 0) {
  let num = 0;
  for (let i = 0; i < 32; i++) {
    num = (num << 1) | bits[start + i];
  }
  return num;
}
