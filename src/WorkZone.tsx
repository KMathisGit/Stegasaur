import { useEffect, useRef, useState } from "react";
import UPNG from "upng-js";

function downloadImageUPNG(
  pixelArray: ArrayBuffer,
  width: number,
  height: number
) {
  // pixelArray is Uint8ClampedArray RGBA data

  // Encode raw pixel buffer to PNG binary using UPNG
  const pngData = UPNG.encode([pixelArray], width, height, 0); // 0 = no compression

  const blob = new Blob([pngData], { type: "image/png" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "image.png";
  a.click();
  URL.revokeObjectURL(url);
}

import {
  decodePayloadFromAlpha,
  encodePayloadInAlpha,
  encryptWithSubtleCrypto,
  ENTIRE_HEADER_BIT_LENGTH,
} from "./utils/cryptoUtils";
import FadeComponent from "./components/Fade";
import AppButton from "./components/Button";
import Tooltip from "./components/Tooltip";
import { downloadCanvasImage } from "./utils/fileUtils";

const PAYLOAD_TYPES = {
  message: { label: "Message", value: "Message" },
  file: { label: "File", value: "File" },
};

type WorkZoneProps = {
  uploadedImage: File;
};

const textEncoder = new TextEncoder();

function WorkZone({ uploadedImage: uploadedFile }: WorkZoneProps) {
  const [file, setFile] = useState<File>(uploadedFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payloadType, setPayloadType] = useState<string>("");
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [pixelData, setPixelData] = useState<Uint8ClampedArray>();
  const [password, setPassword] = useState<string>("");
  const [payload, setPayLoad] = useState<string>("");
  const [capacityRemaining, setCapacityRemaining] = useState<number>();
  const [operationMode, setOperationMode] = useState<string>();
  const [fileToInjectAsPayload, setFileToInjectAsPayload] = useState<File>();
  const [decodedPayload, setDecodedPayload] = useState<string>();

  const [imgDimensions, setImgDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const sizeKB = file.size / 1024;
  const sizeStr =
    sizeKB > 1024
      ? (sizeKB / 1024).toFixed(2) + " MB"
      : sizeKB.toFixed(2) + " KB";

  // on read image file and set imgSrc
  useEffect(() => {
    if (file) {
      // file.arrayBuffer().then((uint8arr) => {
      //   console.log("UPLOADED FILE UINT8ARRAY:", new Uint8Array(uint8arr));
      //   const img = UPNG.decode(uint8arr);
      //   // Get raw pixel data of first frame (RGBA)
      //   const pixels = new Uint8ClampedArray(UPNG.toRGBA8(img)[0]);
      //   console.log("UPNG FILE UINT8ARRAY:", pixels);
      //   // setPixelData(pixels);
      // });
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      if (e.target?.result) {
        setImgSrc(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    setCapacityRemaining(
      file.size -
        ENTIRE_HEADER_BIT_LENGTH / 8 -
        textEncoder.encode(payload).length
    );
  }, [payload, file]);

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
    // console.log("PIXEL DATA:", pixels);
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

  const handleFileToInjectAsPayloadChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFileToInjectAsPayload(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayLoad(e.target.value);
  };

  async function injectPayload() {
    if (pixelData) {
      console.log("wt");
      const encryptedPayload = await encryptWithSubtleCrypto(payload, password);

      if (encryptedPayload) {
        const injectedPixelData = encodePayloadInAlpha(
          new Uint8ClampedArray(pixelData!),
          encryptedPayload
        );

        if (injectedPixelData) {
          // using injectedPixelData draw new injected image into canvas for downloading
          const imageData = new ImageData(
            injectedPixelData,
            imgDimensions.width,
            imgDimensions.height
          );
          canvasRef.current!.getContext("2d")?.putImageData(imageData, 0, 0);

          downloadCanvasImage(
            canvasRef.current!,
            `${file.name.split(".")[0]}-modified.png`
          );

          console.log("INJECTED PIXEL DATA:", injectedPixelData);
          console.log(
            "IMMEDIATELY DECODING INJECTED PIXEL DATA:",
            await decodePayloadFromAlpha(injectedPixelData, password)
          );
          // downloadImageUPNG(
          //   injectedPixelData.buffer,
          //   imgDimensions.width,
          //   imgDimensions.height
          // );
        }
      }
    }
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // prevent page reload
    const formData = new FormData(event.currentTarget);
    // Process formData, validate, send API request, etc.
    console.log(Object.fromEntries(formData.entries()));
    console.log(operationMode, file);
    if (operationMode === "decrypt") {
      if (file) {
        const decryptedPayload = await decodePayloadFromAlpha(
          new Uint8ClampedArray(pixelData!),
          password
        );

        if (decryptedPayload) {
          setDecodedPayload(decryptedPayload);
          console.log(
            "Decrypted payload from injected payload:",
            decryptedPayload
          );
        }
      }
    } else {
      injectPayload();
    }
  };

  return (
    <FadeComponent show={true}>
      <div className="max-w-[528px] mx-auto">
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
        <form
          className="flex flex-col max-w-xl gap-4 py-4 mb-8"
          onSubmit={handleFormSubmit}
        >
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
              required
              minLength={12}
              maxLength={48}
            ></input>
          </div>
          <div>
            <label
              className="text-xl block mb-1 p-text-shadow"
              htmlFor="operationMode"
            >
              Operation Mode
            </label>
            <select
              className="w-full"
              id="operationMode"
              name="operationMode"
              value={operationMode}
              onChange={(e) => setOperationMode(e.target.value)}
              required
            >
              <option value="">Select</option>
              <option value="encrypt">Encrypt</option>
              <option value="decrypt">Decrypt</option>
            </select>
          </div>
          {operationMode === "encrypt" && (
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
                required
              >
                <option value="">Select</option>
                {Object.values(PAYLOAD_TYPES).map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {operationMode === "encrypt" &&
            payloadType === PAYLOAD_TYPES.message.value && (
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
                  onChange={handlePayloadChange}
                  required
                  minLength={1}
                ></textarea>
                <p className="text-right">
                  Remaining Capacity: {capacityRemaining} B
                </p>
              </div>
            )}
          {operationMode === "encrypt" &&
            payloadType === PAYLOAD_TYPES.file.value && (
              <div>
                <label
                  className="text-xl block mb-1 p-text-shadow"
                  htmlFor="imageToDecrypt"
                >
                  Upload File
                </label>
                <input
                  type="file"
                  onChange={handleFileToInjectAsPayloadChange}
                />
              </div>
            )}

          <AppButton type="submit">
            {operationMode === "encrypt" ? "Inject Payload" : "Decode Image"}
          </AppButton>
          {decodedPayload && (
            <div>
              <label
                className="text-xl block mb-1 p-text-shadow"
                htmlFor="decodedPayload"
              >
                Decoded Payload
              </label>
              <textarea
                id="decodedPayload"
                name="decodedPayload"
                rows={5}
                className="w-full"
                value={decodedPayload}
              ></textarea>
            </div>
          )}
        </form>
      </div>
    </FadeComponent>
  );
}

export default WorkZone;
