import { useEffect, useRef, useState } from "react";

import {
  decodePayloadFromAlpha,
  encodePayloadInAlpha,
  encryptWithSubtleCrypto,
} from "./cryptoUtils";
import FadeComponent from "./Fade";
import AppButton from "./components/Button";
import Tooltip from "./components/Tooltip";

const PAYLOAD_TYPES = {
  message: { label: "Message", value: "Message" },
  file: { label: "File", value: "File" },
};

type WorkZoneProps = {
  uploadedImage: File;
};

function WorkZone({ uploadedImage: uploadedFile }: WorkZoneProps) {
  const [file, setFile] = useState<File>(uploadedFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payloadType, setPayloadType] = useState<string>("");
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [pixelData, setPixelData] = useState<ImageDataArray>();
  const [password, setPassword] = useState<string>("");
  const [payload, setPayLoad] = useState<string>("");
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

  async function injectPayload() {
    if (pixelData) {
      const encryptedPayload = await encryptWithSubtleCrypto(payload, password);

      console.log("Encrypted payload", encryptedPayload);
      console.log("Original pixel data:", pixelData);

      const injectedPixelData = encodePayloadInAlpha(
        new Uint8ClampedArray(pixelData!),
        encryptedPayload
      );
      console.log("Pixel data after injecting payload:", injectedPixelData);

      const decryptedPayload = await decodePayloadFromAlpha(
        injectedPixelData,
        password
      );
      console.log("Decrypted payload from injected payload:", decryptedPayload);
    }
  }

  return (
    <FadeComponent show={true}>
      <div className="max-w-7xl">
        <h2 className="header-text-shadow">Uploaded Image</h2>
        <div className="flex gap-8 py-4">
          <div className="w-36 h-36 overflow-hidden">
            <img
              className="w-full h-full object-contain"
              src={imgSrc}
              ref={imageRef}
              onLoad={handleImageLoad}
            />
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="flex flex-col gap-2">
            {/* <p className="text-ellipsis max-w-">File Name: {file.name}</p>
            <p>File Size: {sizeStr}</p>
            <p>
              Dimensions: {imgDimensions.width} x {imgDimensions.height}
            </p> */}
            <div>
              <p className="text-sm">File Name</p>
              <p className="text-lg leading-5 truncate max-w-[280px]">
                {file.name}
              </p>
            </div>
            <div>
              <p className="text-sm">File Size</p>
              <p className="text-lg  leading-5">{sizeStr}</p>
            </div>
            <div>
              <p className="text-sm">Dimensions</p>
              <p className="text-lg  leading-5">
                {imgDimensions.width} x {imgDimensions.height}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </div>
        <AppButton className="w-full mb-6" onClick={handleClick}>
          Change Image
        </AppButton>
        <h2 className="header-text-shadow">Configuration</h2>
        <div className="flex flex-col max-w-xl gap-4 py-4 mb-8">
          <div>
            <Tooltip text="Used to securely lock and unlock hidden messages within files. Only those who know the key can access the concealed information.">
              <label
                className="text-xl mb-1 p-text-shadow"
                htmlFor="encryptionKey"
              >
                Secret Key
              </label>
            </Tooltip>
            <input
              type="text"
              id="encryptionKey"
              name="encryptionKey"
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={16}
              maxLength={32}
            ></input>
          </div>
          <div>
            <label
              className="text-xl block mb-1 p-text-shadow"
              htmlFor="payloadType"
            >
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
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          {payloadType === PAYLOAD_TYPES.message.value && (
            <div>
              <label
                className="text-xl block mb-1 p-text-shadow"
                htmlFor="payloadMessage"
              >
                Message
              </label>
              <textarea
                id="payloadMessage"
                name="payloadMessage"
                rows={4}
                className="w-full"
                value={payload}
                onChange={(e) => setPayLoad(e.target.value)}
              ></textarea>
            </div>
          )}

          <AppButton onClick={injectPayload}>Inject Payload</AppButton>
        </div>
      </div>
    </FadeComponent>
  );
}

export default WorkZone;
