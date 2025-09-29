// Tooltip.js
import { useEffect, useRef, useState, type JSX } from "react";

type TooltipProps = {
  children: JSX.Element;
  text: string;
};
function Tooltip({ children, text }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const toolTipRef = useRef<HTMLSpanElement>(null);

  // Hide tooltip when tapping outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        toolTipRef.current &&
        !toolTipRef.current.contains(event.target as Node)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      ref={toolTipRef}
    >
      {children}
      <span
        className="ml-1.5 font-bold rounded-full bg-[#007bff] text-white w-4 h-4 text-center text-xs absolute"
        tabIndex={0}
        aria-label="Info"
        role="tooltip-trigger"
        onClick={() => setVisible(!visible)}
      >
        i
      </span>
      {visible && (
        <span className="absolute bg-gray-950/90 rounded text-white text-sm p-2 px-4 max-w-xl w-[75vw] z-10 top-[-64px] -translate-x-1/4 pointerEvents: none">
          {text}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
