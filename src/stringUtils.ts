export function utf8StringToBitArray(str: string) {
  const encoder = new TextEncoder(); // UTF-8 encoding
  const bytes = encoder.encode(str);
  const bits = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

export function asciiStringToBitArray(str: string) {
  const bits = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i); // ASCII char code (0-127)
    for (let j = 7; j >= 0; j--) {
      bits.push((code >> j) & 1); // Get each bit, MSB first
    }
  }
  return bits;
}

export function encodeStringInAlpha(
  pixels: Uint8ClampedArray,
  str: string,
  encoding: "utf-8" | "ascii"
) {
  // encrypting str (TODO: BETTER ENCRYPTION)
  str = btoa(str);
  // adds null-terminator necessary to know when to stop decoding
  str = str + "\0";
  let bits: number[];
  if (encoding === "utf-8") {
    bits = utf8StringToBitArray(str);
  } else if (encoding === "ascii") {
    bits = asciiStringToBitArray(str);
  } else {
    console.error("Invalid encoding provided:", encoding);
    return;
  }
  console.log("Bits to encode:", bits);
  for (let i = 0; i < bits.length; i++) {
    const alphaIndex = i * 4 + 3;
    if (alphaIndex >= pixels.length) break;

    // 0xFE is 254 in hexadecimal (which is 11111110 in binary)
    // perform bit AND operation clearing only LSB (least significant bit) and then perform OR operation setting LSB to whatever bits[i] is
    pixels[alphaIndex] = (pixels[alphaIndex] & 0xfe) | bits[i];
  }
  return pixels;
}

export function decodeStringFromAlpha(
  pixels: Uint8ClampedArray,
  encoding: "utf-8" | "ascii"
): string | undefined {
  const bits: number[] = [];
  let decryptedStr;

  // Extract bits from alpha LSB of all pixels
  const maxBits = Math.floor(pixels.length / 4) * 8;
  for (let i = 0; i < maxBits; i++) {
    const alphaIndex = i * 4 + 3;
    if (alphaIndex >= pixels.length) break;
    bits.push(pixels[alphaIndex] & 1);
  }

  console.log("Bits from alpha:", bits);

  // Group bits into bytes
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byteBits = bits.slice(i, i + 8);
    if (byteBits.length < 8) break; // incomplete byte at end
    const byte = byteBits.reduce((acc, bit) => (acc << 1) | bit, 0);
    if (byte === 0) break; // null terminator signals end of string
    bytes.push(byte);
  }

  console.log("Bytes from grouped bits:", bytes);

  if (encoding === "utf-8") {
    const decoder = new TextDecoder("utf-8");
    const decodedStr = decoder.decode(new Uint8Array(bytes));
    decryptedStr = atob(decodedStr); // TODO: decryption here
    return decryptedStr;
  } else if (encoding === "ascii") {
    const message = bytes.map((byte) => String.fromCharCode(byte)).join("");
    decryptedStr = atob(message); // TODO: decryption here
    return decryptedStr;
  }
  // Decode UTF-8 bytes to string
}
