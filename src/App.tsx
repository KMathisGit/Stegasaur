import { useEffect, useRef, useState, type MouseEvent } from "react";
import "./App.css";
import LandingView from "./Landing";
import WorkZone from "./WorkZone";

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM_LEVEL);
  // const [imagePos, setImagePos] = useState<{ x: number; y: number }>({
  //   x: 0,
  //   y: 0,
  // });

  // useEffect(() => {
  //   const canvas = canvasRef.current;
  //   const ctx = canvasRef.current?.getContext("2d");

  //   if (uploadedImage && canvas) {
  //     const img = new window.Image();
  //     img.onload = () => {
  //       if (ctx && canvas) {
  //         canvas.width = 800;
  //         canvas.height = 800;
  //         ctx.clearRect(0, 0, canvas.width, canvas.height);
  //         ctx.drawImage(
  //           img,
  //           imagePos.x,
  //           imagePos.y,
  //           canvas.width * (100 / zoomLevel),
  //           canvas.height * (100 / zoomLevel)
  //         );
  //       }
  //     };
  //     img.src = uploadedImage;
  //   }
  // }, [uploadedImage, zoomLevel, imagePos]);

  function uploadImageCallback(result: File) {
    setUploadedFile(result);
  }

  if (!uploadedFile) {
    return <LandingView uploadImageCallback={uploadImageCallback} />;
  }

  return <WorkZone uploadedFile={uploadedFile} />;
}

export default App;

// Handle mouse move to update hovered pixel
// const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
//   const rect = canvasRef.current?.getBoundingClientRect();
//   if (hoveredPixel) {
//     canvasRef.current
//       ?.getContext("2d")
//       ?.clearRect(hoveredPixel.x * scale, hoveredPixel.y * scale, scale, scale);
//   }
//   if (rect) {
//     const x = Math.floor((e.clientX - rect.left) / scale);
//     const y = Math.floor((e.clientY - rect.top) / scale);
//     setHoveredPixel({ x, y });
//   }
// };
