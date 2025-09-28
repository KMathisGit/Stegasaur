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

export function downloadArrayBuffer(arrayBuffer: ArrayBuffer, fileExt: string) {
  // Create a Blob from the ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });

  // Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element and trigger download
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `payload.${fileExt}`;
  document.body.appendChild(a);
  a.click();

  // Clean up the DOM and revoke the object URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
