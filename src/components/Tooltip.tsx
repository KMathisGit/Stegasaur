// Tooltip.js
import { useState, type JSX } from "react";

type TooltipProps = {
  children: JSX.Element;
  text: string;
};
function Tooltip({ children, text }: TooltipProps) {
  const [hover, setHover] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      <span
        className="ml-1.5 font-bold rounded-full bg-[#007bff] text-white w-4 h-4 text-center text-xs absolute"
        tabIndex={0}
        aria-label="Info"
        role="tooltip-trigger"
        onClick={() => setHover(!hover)}
      >
        i
      </span>
      {hover && (
        <span className="absolute bg-black/80 rounded text-white text-sm p-2 whitespace-nowrap z-10 left-[50%] top-[-32px] -translate-x-1/2">
          {text}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
