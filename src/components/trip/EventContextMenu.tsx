"use client";

import { useEffect, useRef } from "react";
import { Edit3, Copy, RefreshCw, Trash2, type LucideIcon } from "lucide-react";

type MenuAction = "edit" | "delete" | "copy" | "alternative";

type EventContextMenuProps = {
  onAction: (action: MenuAction) => void;
  onClose: () => void;
};

const MENU_ITEMS: { action: MenuAction; Icon: LucideIcon; label: string }[] = [
  { action: "edit", Icon: Edit3, label: "編輯" },
  { action: "copy", Icon: Copy, label: "複製到其他天" },
  { action: "alternative", Icon: RefreshCw, label: "換一個" },
  { action: "delete", Icon: Trash2, label: "刪除" },
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
      className="absolute left-0 right-0 z-20 mt-1 bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(61,43,31,0.15)" }}
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
          <item.Icon size={16} />
          <span className="font-semibold">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
