import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PortalTooltip<T extends HTMLElement>({
  text,
  targetRef,
}: {
  text: string;
  targetRef: React.RefObject<T | null>;
}) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const rect = targetRef.current.getBoundingClientRect();

    setStyle({
      position: "fixed",
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
      transform: "translate(-50%, -100%)",
      zIndex: 9999,
    });
  }, [targetRef]);

  if (!style) return null;

  return createPortal(
    <div
      style={style}
      className="
        px-2 py-1
        rounded-md
        bg-gray-900 text-white
        text-xs whitespace-nowrap
        shadow-lg
      "
    >
      {text}
    </div>,
    document.body
  );
}
