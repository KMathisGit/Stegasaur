import { useEffect, useState } from "react";

type FadeComponentProps = {
  show: boolean;
  children: React.ReactNode;
};

function FadeComponent({ show, children }: FadeComponentProps) {
  const [shouldRender, setRender] = useState(show);

  useEffect(() => {
    if (show) setRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setRender(false);
  };

  return (
    shouldRender && (
      <div
        className="inline"
        style={{ animation: `${show ? "fadeIn" : "fadeOut"} 1s` }}
        onAnimationEnd={onAnimationEnd}
      >
        {children}
      </div>
    )
  );
}

export default FadeComponent;
