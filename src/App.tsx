import { useState } from "react";
import StegasaurHeader from "./components/StegasaurHeader";
import Landing from "./Landing";
import WorkZone from "./WorkZone";
import AboutStegasaur from "./AboutStegasaur";

function App() {
  const [imageUploaded, setImageUploaded] = useState<File>();

  return (
    <>
      <div className="content-area px-4 overflow-auto">
        <StegasaurHeader />

        {!imageUploaded ? (
          <Landing
            uploadedImageCallback={(image: File) => setImageUploaded(image)}
          />
        ) : (
          <WorkZone uploadedImage={imageUploaded} />
        )}
        <AboutStegasaur />
      </div>
      <footer className="w-full min-h-8 h-8 bg-black flex items-center justify-center font-mono text-sm">
        © {new Date().getFullYear()} Stegasaur. All rights reserved
      </footer>
    </>
  );
}

export default App;
