"use client";

import { useEffect, useRef } from "react";

type MenuAction = "edit" | "delete" | "copy" | "alternative";

type EventContextMenuProps = {
  onAction: (action: MenuAction) => void;
  onClose: () => void;
};

const MENU_ITEMS: { action: MenuAction; icon: string; label: string }[] = [
  { action: "edit", icon: "✏️", label: "編輯" },
  { action: "copy", icon: "📋", label: "複製到其他天" },
  { action: "alternative", icon: "🔄", label: "換一個" },
  { action: "delete", icon: "🗑️", label: "刪除" },
];

export function EventContextMenu({ onAction, onClose }: EventContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 z-20 mt-1 bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
    >
      {MENU_ITEMS.map((item) => (
        <button
          key={item.action}
          onClick={() => {
            onAction(item.action);
            onClose();
          }}
          className={[
            "w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors",
            item.action === "delete"
              ? "text-red-500 hover:bg-red-50"
              : "text-charcoal hover:bg-butter",
          ].join(" ")}
        >
          <span>{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
