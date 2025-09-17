import { useEffect, useRef, useState } from "react";
import { decodeStringFromAlpha, encodeStringInAlpha } from "./stringUtils";

const PAYLOAD_TYPES = {
  message: { label: "Message", value: "Message" },
  file: { label: "File", value: "File" },
};

const PAYLOAD_TYPE_OPTIONS = [PAYLOAD_TYPES.message, PAYLOAD_TYPES.file];

type WorkZoneProps = {
  uploadedFile: File;
};

function WorkZone({ uploadedFile }: WorkZoneProps) {
  const [file, setFile] = useState<File>(uploadedFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payloadType, setPayloadType] = useState<string>("");
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [pixelData, setPixelData] = useState<ImageDataArray>();
  const [imgDimensions, setImgDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const sizeKB = uploadedFile.size / 1024;
  const sizeStr =
    sizeKB > 1024
      ? (sizeKB / 1024).toFixed(2) + " MB"
      : sizeKB.toFixed(2) + " KB";

  // on read image file and set imgSrc
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = function (e) {
      if (e.target?.result) {
        setImgSrc(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Sets state for dimensions after the img has finished loading
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.target as HTMLImageElement;
    setImgDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx?.drawImage(img, 0, 0);

    // Extract image pixel data
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData?.data; // Uint8ClampedArray with RGBA values
    setPixelData(pixels);
  }

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleSelect(event.target.files[0]);
    }
  };

  const handleSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setFile(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  function testManipulation() {
    if (!pixelData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newPixels = new Uint8ClampedArray(pixelData);
    for (let i = 1; i <= newPixels.length; i++) {
      if (i % 4 === 0) {
        newPixels[i - 1] = 255;
        continue;
      }
      if (newPixels[i - 1] === 0) {
        newPixels[i - 1] = Math.floor(Math.random() * 255);
      }
    }

    const newImageData = new ImageData(newPixels, canvas.width, canvas.height);
    ctx.putImageData(newImageData, 0, 0);

    // Export as Blob (recommended for larger images)
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modified-image.png"; // file name and extension
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  console.log("Pixels:", pixelData);

  if (pixelData) {
    const encodedPixels = encodeStringInAlpha(
      new Uint8ClampedArray(pixelData),
      "hello world",
      "ascii"
    );
    if (encodedPixels) {
      console.log("encoded pixels:", encodedPixels);
      const decodedString = decodeStringFromAlpha(encodedPixels, "ascii");
      console.log("decoded string:", decodedString);
    }
  }

  return (
    <div className="">
      <h1 className="text-5xl mb-4">Uploaded Image</h1>
      <div className="flex gap-8 py-6 mb-8">
        <img
          className="w-36 h-36"
          src={imgSrc}
          ref={imageRef}
          onLoad={handleImageLoad}
          width={128}
          height={128}
        />
        <canvas ref={canvasRef} className="hidden"></canvas>
        <div className="flex flex-col gap-0.5 text-lg">
          <p>File Name: {file.name}</p>
          <p>File Size: {sizeStr}</p>
          <p>
            Dimensions: {imgDimensions.width} x {imgDimensions.height}
          </p>
          <button className="mt-1" onClick={handleClick}>
            Change Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <h1 className="text-5xl mb-4">Payload</h1>
      <div className="flex flex-col max-w-xl gap-8 py-6 mb-8">
        <div>
          <label className="text-xl block mb-1" htmlFor="payloadType">
            Payload Type
          </label>
          <select
            className="w-full"
            id="payloadType"
            name="payloadType"
            value={payloadType}
            onChange={(e) => setPayloadType(e.target.value)}
          >
            <option value="">Select</option>
            {Object.values(PAYLOAD_TYPES).map((v) => (
              <option value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        {payloadType === PAYLOAD_TYPES.message.value && (
          <div>
            <label className="text-xl block mb-1" htmlFor="payloadMessage">
              Message
            </label>
            <textarea
              id="payloadMessage"
              name="payloadMessage"
              rows={4}
              className="w-full"
            ></textarea>
          </div>
        )}

        <button>Encrypt</button>
        <button onClick={testManipulation}>Test Manipulation</button>
      </div>
    </div>
  );
}

export default WorkZone;
