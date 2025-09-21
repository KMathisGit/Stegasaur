export function generateRandomBytes(num: number) {
  const byteArray = new Uint8ClampedArray(num);
  // crypto.getRandomValues() is much more secure than using math.random()
  window.crypto.getRandomValues(byteArray);
  return new Uint8ClampedArray(byteArray);
}

export function uint8ArrayToBits(uint8arr: Uint8ClampedArray<ArrayBuffer>) {
  const bits = [];
  for (let i = 0; i < uint8arr.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((uint8arr[i] >> j) & 1);
    }
  }
  return bits;
}

export function convertBitsToDecimal(bits: number[]) {
  let num = 0;
  for (let i = 0; i < bits.length; i++) {
    num = (num << 1) | bits[i];
  }
  return num;
}

export function convertBitsToByteArr(bits: number[]) {
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
