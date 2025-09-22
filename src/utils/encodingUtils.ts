import {
  convertBitsToByteArr,
  convertBitsToDecimal,
  uint8ArrayToBits,
} from "./bitByteUtils";
import { getLargeRandomValues } from "./cryptoUtils";
import { logger } from "./logger";

const LEN_HEADER_BIT_LENGTH = 4 * 8;
const IV_HEADER_BITS = 16 * 8;
const SALT_HEADER_BIT_LENGTH = 16 * 8;
export const ENTIRE_HEADER_BIT_LENGTH =
  LEN_HEADER_BIT_LENGTH + IV_HEADER_BITS + SALT_HEADER_BIT_LENGTH;

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
    throw err;
  }
}

export async function decodeDataFromImage(
  pixels: Uint8ClampedArray<ArrayBuffer>
) {
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

    return {
      bytes,
      iv,
      salt,
    };
  } catch (err) {
    logger(() => {
      console.error("Error decoding payload:", err);
    }, "error");
    throw err;
  }
}
