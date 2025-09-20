import React, { useRef, useState } from "react";

type ImageDropzoneProps = {
  onImageUpload: (file: File) => void;
  className?: string;
};

const ImageDropzone = ({ onImageUpload, className }: ImageDropzoneProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHover, setIsHover] = useState(false);

  // Add mouse hover state handlers:
  const handleMouseEnter = () => setIsHover(true);
  const handleMouseLeave = () => setIsHover(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        onImageUpload(file);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const isActive = isDragActive || isHover;

  // TODO: adding clsx allowing classes to be overridden.. but need to account for isActive classes as well..

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`font-pixilify text-center cursor-pointer py-8 lg:py-12 text-2xl md:text-3xl rounded-lg lg:rounded-xl transition-all ${
        isActive
          ? "bg-[#ffffff12] translate-0.75 shadow-2-2-0-1"
          : "bg-[#0000001c] shadow-6-6-0-0"
      } ${className ?? ""}`}
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
  );
};

export default ImageDropzone;
