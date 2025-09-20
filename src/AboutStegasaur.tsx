import { useState } from "react";

function AboutStegasaur() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleModal = () => setIsOpen(!isOpen);

  return (
    <>
      {/* About Button */}
      <button
        onClick={toggleModal}
        className="h-13 w-13 lg:h-15 lg:w-15 fixed top-4 right-2 md:right-4 bg-white/5 text-2xl text-white font-semibold rounded-full shadow-md shadow-black/30 pointer z-[1000] cursor-pointer hover:scale-115 transition-transform"
      >
        ?
      </button>

      {/* Modal and backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 justify-center items-center bg-black/50 z-[1000] ${
          isOpen ? "flex " : "hidden"
        }`}
        onClick={toggleModal} // clicking outside modal closes
      >
        <div
          className="bg-white text-black p-4 rounded-lg max-w-xl width-4/5 shadow relative mx-2"
          onClick={(e) => e.stopPropagation()} // prevent close on modal click
        >
          <h2 className="mb-4">About Stegasaur</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi
            consequat, justo quis dapibus efficitur, velit dolor euismod elit,
            at cursus purus neque a elit. Pellentesque habitant morbi tristique
            senectus et netus et malesuada fames ac turpis egestas.
          </p>
          <p>
            Sed at ligula at enim consectetur interdum. Duis efficitur libero
            nec mauris dignissim, et interdum mauris pretium. Praesent sed
            imperdiet leo.
          </p>
          <button
            onClick={toggleModal}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
      </div>
    </>
  );
}

export default AboutStegasaur;
