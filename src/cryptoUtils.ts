const LEN_HEADER_BIT_LENGTH = 4 * 8;
const IV_HEADER_BITS = 16 * 8;
const SALT_HEADER_BIT_LENGTH = 16 * 8;
const ENTIRE_HEADER_BIT_LENGTH =
  LEN_HEADER_BIT_LENGTH + IV_HEADER_BITS + SALT_HEADER_BIT_LENGTH;

export async function encryptWithSubtleCrypto(text: string, password: string) {
  const enc = new TextEncoder();
  const iv = generateRandom16ByteHeader();
  const keySalt = generateRandom16ByteHeader();

  console.log("IV:", iv);
  console.log("key salt:", keySalt);

  const key = await generateKey(password, keySalt);

  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv },
    key,
    enc.encode(text)
  );

  console.log("encrypted:", encrypted, password, iv);

  // generate length header based on encrypted payload size
  const lengthHeaderBytes = generateLengthHeader(encrypted.byteLength);

  // generate length header based on encrypted payload size
  // const ivHeaderBytes = generateIvHeader();

  // add length header before encrypted payload
  const encryptedPayloadWithHeaders = new Uint8Array(
    lengthHeaderBytes.concat(
      Array.from(iv),
      Array.from(keySalt),
      Array.from(new Uint8Array(encrypted))
    )
  );
  console.log(
    "Encrypted payload (with meta data headers):",
    encryptedPayloadWithHeaders
  );
  return encryptedPayloadWithHeaders;
}

export async function decryptWithSubtleCrypto(
  encryptedArr: ArrayBuffer,
  password: string,
  iv: Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>
) {
  console.log("DECRYPTING WITH IV:", iv);
  try {
    console.log("decrypting:", encryptedArr, password, iv);
    const key = await generateKey(password, salt);
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

export async function generateKey(password: string, salt: Uint8Array) {
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
      salt: new Uint8Array(salt),
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
  console.log("Payload to encode:", payload);

  const bits = uint8ArrayToBits(payload);

  console.log("Payload to encode converted to bits:", bits);

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
  const imageAlphaBits: number[] = [];

  // Extract bits from alpha LSB of all pixels
  const numAlphaBits = Math.floor(pixels.length / 4) * 8;
  for (let i = 0; i < numAlphaBits; i++) {
    const alphaIndex = i * 4 + 3;
    if (alphaIndex >= pixels.length) break;
    imageAlphaBits.push(pixels[alphaIndex] & 1);
  }
  console.log("Bits from alpha", imageAlphaBits);
  const headerBits = imageAlphaBits.slice(0, ENTIRE_HEADER_BIT_LENGTH);
  const lengthHeaderBits = headerBits.slice(0, 32);
  const ivHeaderBits = headerBits.slice(32, 160);
  const saltHeaderBits = headerBits.slice(160, 288);
  console.log(ivHeaderBits);

  const payloadLength = convertBitsToDecimal(lengthHeaderBits);
  const iv = convertBitsToByteArr(ivHeaderBits);
  const salt = convertBitsToByteArr(saltHeaderBits);

  // const payloadLength = convertBitsToDecimal(headerBits.slice(0,LEN_HEADER_BIT_LENGTH));
  // const payloadLength = extractLengthHeader(imageAlphaBits);
  // const ivHeader = extractIvHeaderAsBytes(imageAlphaBits);
  console.log("Extracted length header from bits:", payloadLength);
  console.log("IV extracted from header:", iv);
  console.log("salt extracted from header:", salt);
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

  console.log("Grouped bits into bytes for decoding:", bytes);

  return await decryptWithSubtleCrypto(
    new Uint8Array(bytes).buffer,
    password,
    iv,
    salt
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

// export function generateRandom16ByteHeader() {
//   const nums = new Array(16)
//     .fill(null)
//     .map((e) => Math.round(Math.random() * 255));
//   return new Uint8Array(nums);
// }

function generateRandom16ByteHeader() {
  const byteArray = new Uint8Array(16);
  // crypto.getRandomValues() is much more secure than using math.random()
  window.crypto.getRandomValues(byteArray);
  return new Uint8Array(byteArray);
}

function uint8ArrayToBits(uint8arr: Uint8Array<ArrayBuffer>) {
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
  return new Uint8Array(byteArr);
}
