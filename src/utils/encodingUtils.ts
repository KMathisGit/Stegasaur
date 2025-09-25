import {
  convertBitsToByteArr,
  convertBitsToDecimal,
  uint8ArrayToBits,
} from "./bitByteUtils";
import { getLargeRandomValues } from "./cryptoUtils";
import { logger } from "./logger";

export const HEADER_BIT_STRUCUTRE = {
  PAYLOAD_LEN_BIT_RANGE: [0, 32],
  IV_BIT_RANGE: [32, 160],
  SALT_BIT_RANGE: [160, 288],
  PAYLOAD_TYPE_BIT_RANGE: [288, 296],
  PAYLOAD_FILE_EXT_BIT_RANGE: [296, 360],
};

export const TOTAL_HEADER_BIT_LENGTH = Object.values(
  HEADER_BIT_STRUCUTRE
).reduce((acc, cur) => acc + cur[1] - cur[0], 0);

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

    // randomly change LSB value to 0 or 1 of all remaining alpha bytes
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
    const headerBits = imageAlphaBits.slice(0, TOTAL_HEADER_BIT_LENGTH);
    const payloadLenBits = headerBits.slice(
      HEADER_BIT_STRUCUTRE.PAYLOAD_LEN_BIT_RANGE[0],
      HEADER_BIT_STRUCUTRE.PAYLOAD_LEN_BIT_RANGE[1]
    );
    const ivBits = headerBits.slice(
      HEADER_BIT_STRUCUTRE.IV_BIT_RANGE[0],
      HEADER_BIT_STRUCUTRE.IV_BIT_RANGE[1]
    );
    const saltBits = headerBits.slice(
      HEADER_BIT_STRUCUTRE.SALT_BIT_RANGE[0],
      HEADER_BIT_STRUCUTRE.SALT_BIT_RANGE[1]
    );
    const payloadTypeBits = headerBits.slice(
      HEADER_BIT_STRUCUTRE.PAYLOAD_TYPE_BIT_RANGE[0],
      HEADER_BIT_STRUCUTRE.PAYLOAD_TYPE_BIT_RANGE[1]
    );
    const payloadFileExtBits = headerBits.slice(
      HEADER_BIT_STRUCUTRE.PAYLOAD_FILE_EXT_BIT_RANGE[0],
      HEADER_BIT_STRUCUTRE.PAYLOAD_FILE_EXT_BIT_RANGE[1]
    );
    const payloadLength = convertBitsToDecimal(payloadLenBits);
    const iv = convertBitsToByteArr(ivBits);
    const salt = convertBitsToByteArr(saltBits);
    const payloadType =
      convertBitsToDecimal(payloadTypeBits) === 1 ? "file" : "message";
    const payloadFileExt = String.fromCharCode(
      ...convertBitsToByteArr(payloadFileExtBits).filter((e) => e !== 0)
    );

    logger(() => {
      console.log("Payload length:", payloadLength);
      console.log("IV:", iv);
      console.log("Salt:", salt);
      console.log("Payload type:", payloadType);
      console.log("Payload file ext:", payloadFileExt);
    }, "debug");

    // Group bits into bytes (skipping header)
    const bytes: number[] = [];
    for (
      let i = TOTAL_HEADER_BIT_LENGTH;
      i < TOTAL_HEADER_BIT_LENGTH + payloadLength * 8;
      i += 8
    ) {
      const byteBits = imageAlphaBits.slice(i, i + 8);
      if (byteBits.length < 8) break; // incomplete byte at end
      const byte = byteBits.reduce((acc, bit) => (acc << 1) | bit, 0);
      bytes.push(byte);
    }

    logger(() => {
      console.log("Payload bits grouped into bytes for decrypting:", bytes);
    }, "debug");

    return {
      bytes,
      iv,
      salt,
      payloadType,
      payloadFileExt,
    };
  } catch (err) {
    logger(() => {
      console.error("Error decoding payload:", err);
    }, "error");
    throw err;
  }
}
