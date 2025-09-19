import { useState } from "react";
import "./App.css";
import LandingView from "./Landing";
import WorkZone from "./WorkZone";

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();

  function uploadImageCallback(result: File) {
    setUploadedFile(result);
  }

  if (!uploadedFile) {
    return <LandingView uploadImageCallback={uploadImageCallback} />;
  }

  return <WorkZone uploadedFile={uploadedFile} />;
}

export default App;
