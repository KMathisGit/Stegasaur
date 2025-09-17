import { useRef } from "react";
import "./App.css";
import FadeComponent from "./Fade";

type LandingViewProps = {
  uploadImageCallback: (file: File) => void;
};
function LandingView({ uploadImageCallback }: LandingViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      uploadImageCallback(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleSelect(event.dataTransfer.files[0]);
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

  return (
    <FadeComponent show={true}>
      <div className="h-full flex flex-col items-center justify-between">
        <div>
          <h1 className="text-9xl text-center uppercase font-semibold tracking-wide mb-8 header-text-shadow">
            {"Stegasaur".split("").map((c) => (
              <span className="text-white transition-colors ease-linear hover:text-white/0">
                {c}
              </span>
            ))}
          </h1>
          <p className="text-2xl font-semibold p-text-shadow">
            Stegasaur is a web app that specializes in steganography, letting
            users hide, reveal, and modify information within images easily and
            securely. It combines powerful image manipulation tools with a
            simple interface for experimenting with digital secrecy.
          </p>

          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="frosted-glass hover h-52 mt-16 flex items-center justify-center cursor-pointer text-3xl"
          >
            <span>↓ Upload an Image ↓</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </div>
        <div className="bg-white/10 text-black px-6 py-3 rounded flex items-center gap-4">
          <div className="text-red-600 text-6xl p-text-shadow">!</div>
          <p className="text-white text-left p-text-shadow">
            Stegasaur is provided for educational and research purposes only.
            The creators of this tool assume no responsibility or liability for
            any misuse, illegal activity, or damages resulting from its use.
            Users are solely responsible for ensuring compliance with all
            applicable laws and regulations.
          </p>
        </div>
      </div>
    </FadeComponent>
  );
}

export default LandingView;
