// import FadeComponent from "./Fade";
import ImageDropzone from "./components/Dropzone";

type LandingProps = {
  uploadedImageCallback: (image: File) => void;
};
function Landing({ uploadedImageCallback }: LandingProps) {
  // const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      uploadedImageCallback(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  return (
    <div className="landing-view-container mx-auto max-w-5xl flex flex-col items-center justify-between sm:pt-6">
      <div>
        <p className="font-pixilify text-base xs:text-xl sm:text-2xl 2xl:text-2xl font-semibold p-text-shadow text-center">
          Stegasaur allows users to hide, reveal, and modify information within
          images easily and securely. It combines powerful image manipulation
          tools with a simple interface for experimenting with digital secrecy.
        </p>
        <ImageDropzone
          onImageUpload={handleImageUpload}
          className="mt-10 text-2xl"
        />
      </div>

      <div className="max-w-7xl bg-white/10 text-black px-3 py-3 rounded flex items-center gap-4 mb-4 mt-8 xl:px-6 xl:gap-6">
        <div className="text-red-600 text-6xl p-text-shadow">!</div>
        <p className="font-pixilify text-white text-left p-text-shadow text-sm md:text-base xl:text-lg">
          Stegasaur is provided for educational and research purposes only. The
          creators of this tool assume no responsibility or liability for any
          misuse, illegal activity, or damages resulting from its use.
        </p>
      </div>
    </div>
  );
}

export default Landing;
