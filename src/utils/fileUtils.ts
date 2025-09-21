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
