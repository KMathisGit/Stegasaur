import { useEffect, useRef, useState } from "react";

import FadeComponent from "./components/Fade";
import AppButton from "./components/Button";
import Tooltip from "./components/Tooltip";
import {
  decodeDataFromImage,
  encodePayloadInAlpha,
  TOTAL_HEADER_BIT_LENGTH,
} from "./utils/encodingUtils";
import {
  decryptWithSubtleCrypto,
  generateEncryptedImageData,
  textEncoder,
  type Payload,
} from "./utils/cryptoUtils";
import { downloadArrayBuffer, downloadCanvasImage } from "./utils/fileUtils";

const PAYLOAD_TYPES = {
  message: { label: "Message", value: "message" },
  file: { label: "File", value: "file" },
};

type WorkZoneProps = {
  uploadedImage: File;
};

function WorkZone({ uploadedImage: uploadedFile }: WorkZoneProps) {
  const [file, setFile] = useState<File>(uploadedFile);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [capacityRemaining, setCapacityRemaining] = useState<number>();
  const [pixelData, setPixelData] = useState<Uint8ClampedArray>();
  const [secretKey, setSecretKey] = useState<string>("");
  const [operationMode, setOperationMode] = useState<string>();
  const [payloadType, setPayloadType] = useState<string>();
  const [messageToInject, setMessageToInject] = useState<string>("");
  const [fileToInject, setFileToInject] = useState<File>();
  const [fileToInjectData, setFileToInjectData] =
    useState<Uint8ClampedArray<ArrayBuffer>>();
  const [decodedPayload, setDecodedPayload] = useState<string>();

  const [imgDimensions, setImgDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  useEffect(() => {
    const reader = new FileReader();
    function updateImgSrc() {
      reader.onload = function (e) {
        if (e.target?.result) {
          setImgSrc(e.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }

    updateImgSrc();
    setDecodedPayload("");
    setOperationMode("");
    setMessageToInject("");
  }, [file]);

  useEffect(() => {
    if (pixelData) {
      setCapacityRemaining(
        Math.floor(
          pixelData?.byteLength / 4 -
            TOTAL_HEADER_BIT_LENGTH -
            textEncoder.encode(messageToInject).length * 8
        ) /
          8 -
          16
      );
    }
  }, [messageToInject, pixelData]);

  useEffect(() => {
    setMessageToInject("");
  }, [payloadType]);

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
    if (imageData) setPixelData(imageData.data);
  }

  const bytesToReadableSizeStr = (numBytes: number) => {
    if (numBytes < 1024) {
      return numBytes + " B";
    }

    const sizeKB = numBytes / 1024;
    if (sizeKB > 1024) {
      return (sizeKB / 1024).toFixed(2) + " MB";
    } else {
      return sizeKB.toFixed(2) + " KB";
    }
  };

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
    const reader = new FileReader();
    const file = event.target.files?.[0];
    if (file && capacityRemaining) {
      if (file.size > capacityRemaining) {
        alert(
          `File is too large to store.\nImage capacity: ${bytesToReadableSizeStr(
            capacityRemaining
          )}`
        );
        event.currentTarget.value = "";
      } else {
        setFileToInject(file); // TODO: may not need this state at all
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          // uint8Array now contains raw file data bytes
          const uint8Array = new Uint8ClampedArray(arrayBuffer);
          setFileToInjectData(uint8Array);
        };

        reader.readAsArrayBuffer(file);
      }
    } else {
      alert("Please upload an image file.");
    }
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageToInject(e.target.value);
  };

  async function injectPayload(payload: Payload) {
    if (pixelData && payloadType) {
      const encryptedPayload = await generateEncryptedImageData(
        secretKey,
        payload,
        payloadType,
        fileToInject?.name.split(".")[1]
      );

      const injectedPixelData = encodePayloadInAlpha(
        new Uint8ClampedArray(pixelData),
        encryptedPayload
      );

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          const canvasImageData = ctx.createImageData(
            imgDimensions.width,
            imgDimensions.height
          );

          canvasImageData.data.set(injectedPixelData);
          ctx?.putImageData(canvasImageData, 0, 0);
          downloadCanvasImage(
            canvasRef.current,
            `${file.name.split(".")[0]}-modified.png`
          );
        }
      }
    }
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // prevent page reload
    try {
      if (operationMode === "retrieve") {
        const { bytes, iv, salt, payloadType, payloadFileExt } =
          await decodeDataFromImage(new Uint8ClampedArray(pixelData!));

        const decryptedPayload = await decryptWithSubtleCrypto(
          new Uint8ClampedArray(bytes).buffer,
          secretKey,
          iv,
          salt,
          payloadType
        );

        if (payloadType === "message" && typeof decryptedPayload === "string") {
          setDecodedPayload(decryptedPayload);
        } else if (
          payloadType === "file" &&
          typeof decryptedPayload === "object"
        ) {
          downloadArrayBuffer(decryptedPayload, payloadFileExt);
        }
      } else {
        if (payloadType === "message" && pixelData) {
          injectPayload(messageToInject);
        } else {
          if (fileToInjectData) {
            injectPayload(fileToInjectData);
          }
        }
      }
    } catch (err) {
      console.error(err);
      if (operationMode === "retrieve") {
        alert(
          "Error retrieving payload from image. Are you sure this image contains a payload from Stegasaur?"
        );
      } else {
        alert("Error storing payload in image, please try again.");
      }
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
              <p className="text-lg  leading-5">
                {bytesToReadableSizeStr(file.size)}
              </p>
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
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
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
              Operation
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
              <option value="store">Store Payload</option>
              <option value="retrieve">Retrieve Payload</option>
            </select>
          </div>
          {operationMode === "store" && (
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
          {operationMode === "store" &&
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
                  value={messageToInject}
                  onChange={handlePayloadChange}
                  required
                  minLength={1}
                ></textarea>
                {capacityRemaining !== undefined && (
                  <p className="text-right">
                    Remaining Capacity:{" "}
                    {bytesToReadableSizeStr(capacityRemaining)}
                  </p>
                )}
              </div>
            )}
          {operationMode === "store" &&
            payloadType === PAYLOAD_TYPES.file.value && (
              <div>
                <label
                  className="text-xl block mb-1 p-text-shadow"
                  htmlFor="imageToDecrypt"
                >
                  Upload File{" "}
                  <span className="text-xs md:text-sm">
                    (capacity: {bytesToReadableSizeStr(capacityRemaining!)})
                  </span>
                </label>
                <input
                  className="w-full"
                  type="file"
                  onChange={handleFileToInjectAsPayloadChange}
                  required
                />
                {fileToInject && (
                  <div>
                    <p>File name: {fileToInject.name}</p>
                    <p>
                      File size: {bytesToReadableSizeStr(fileToInject.size)}
                    </p>
                  </div>
                )}
              </div>
            )}

          <div className="">
            <AppButton className="w-full" type="submit">
              {operationMode === "store" ? "Store Payload" : "Retrieve Payload"}
            </AppButton>
            {operationMode === "store" && (
              <p className="mt-2  text-gray-200 font-semibold text-sm text-center">
                This will download a .png image containing the encrypted payload
              </p>
            )}
            {operationMode === "retrieve" && (
              <p className="mt-2  text-gray-200 font-semibold text-sm text-center">
                If a file was stored in image, it will trigger a download, else
                it will display decrypted message below
              </p>
            )}
          </div>
          {decodedPayload && operationMode === "retrieve" && (
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
                readOnly
              ></textarea>
            </div>
          )}
        </form>
      </div>
    </FadeComponent>
  );
}

export default WorkZone;
