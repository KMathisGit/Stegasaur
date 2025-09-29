import { useState } from "react";

function AboutStegasaur() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleModal = () => setIsOpen(!isOpen);

  return (
    <>
      {/* About Button */}
      <button
        onClick={toggleModal}
        className="h-13 w-13 lg:h-15 lg:w-15 fixed top-4 right-2 md:right-8 bg-[#c832e5] text-3xl text-white font-semibold rounded-full shadow-md shadow-black/30 pointer z-[1000] cursor-pointer hover:scale-115 transition-transform"
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
          className="bg-white text-black p-6 rounded-lg max-w-3xl max-h-[80dvh] width-4/5 overflow-auto shadow relative mx-2"
          onClick={(e) => e.stopPropagation()} // prevent close on modal click
        >
          <h2>About Stegasaur</h2>
          <div className="flex flex-col gap-5 mt-6">
            <div>
              <h3>What is Stegasaur?</h3>
              <p>
                Stegasaur is a web application built to demonstrate{" "}
                <a href="https://en.wikipedia.org/wiki/Steganography">
                  steganography
                </a>{" "}
                — the practice of hiding information within digital media. Much
                like its prehistoric namesake, Stegasaur carries a secret
                beneath the surface. With it, you can embed messages or files
                inside images without leaving any obvious traces.
              </p>
            </div>
            <div>
              <h3>How does it work?</h3>
              <p>
                At its core, Stegasaur uses Least Significant Bit (LSB)
                manipulation to encode data in a way that is nearly invisible to
                the human eye. To add another layer, all embedded data is
                encrypted using{" "}
                <a href="https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation">
                  block cipher
                </a>{" "}
                techniques, further obscuring the information stored inside. The
                hidden content can only be retrieved by using the same secret
                key that was used during encoding.
              </p>
            </div>

            <div>
              <h3>Why Stegasaur exists</h3>
              <p>
                Stegasaur began out of simple curiosity—a personal interest in
                exploring how steganography really works. What started as
                experimenting with image data turned into a deeper dive into the
                fascinating techniques behind concealing information in plain
                sight. The project exists as both a creative outlet and a way to
                make these concepts approachable for others.
              </p>
            </div>

            <div>
              <h3>For learning, not secrets</h3>
              <p>
                As the name suggests, Stegasaur is not meant to be taken too
                seriously. It was built strictly as a research and educational
                project. While it's effective in showing how data can be tucked
                away inside images, it is not intended for real-world security
                or secure private communication. Stegasaur is here to spark
                curiosity and learning—not to guard your secrets.
              </p>
            </div>
          </div>

          <button
            onClick={toggleModal}
            className="absolute top-4 right-4 text-2xl cursor-pointer"
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
