export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  fileName = "canvas-image.png",
  mimeType = "image/png",
  quality = 1.0
) {
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    mimeType,
    quality
  );
}

// export function downloadImageUPNG(
//   pixelArray: ArrayBuffer,
//   width: number,
//   height: number,
//   fileName: string = "image.png"
// ) {
//   // pixelArray is Uint8ClampedArray RGBA data

//   // Encode raw pixel buffer to PNG binary using UPNG
//   const pngData = UPNG.encode([pixelArray], width, height, 0); // 0 = no compression

//   const blob = new Blob([pngData], { type: "image/png" });

//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = fileName;
//   a.click();
//   URL.revokeObjectURL(url);
// }

// export async function extractImageDataUPNG(file: File | Blob) {
//   return UPNG.toRGBA8(UPNG.decode(await file.arrayBuffer()))[0];
// }
