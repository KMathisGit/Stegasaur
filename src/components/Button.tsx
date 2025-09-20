import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type AppButtonProps = {} & ButtonHTMLAttributes<HTMLButtonElement>;

function AppButton(props: AppButtonProps) {
  const baseClasses = `font-pixilify font-semibold cursor-pointer bg-[#0000001c] hover:bg-[#ffffff12] shadow-2xl border-none rounded-md px-4 py-2 transition-all shadow-6-6-0-0 hover:shadow-2-2-0-1 hover:translate-0.75`;
  const classes = clsx(baseClasses, props.className);

  return (
    <>
      <button {...props} className={classes}>
        {props.children}
      </button>
    </>
  );
}

export default AppButton;
