"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { RippleButton } from "@/components/ui/RippleButton";

type AddFabProps = {
  onClick?: () => void;
  href?: string;
  title?: string;
};

const fabClassName =
  "bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white z-40 transition-transform active:scale-95 hover:bg-wood cursor-pointer";

const fabStyle = { boxShadow: "0 6px 18px rgba(233,116,81,0.40)" };

export function AddFab({ onClick, href, title = "新增" }: AddFabProps) {
  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={`fixed overflow-hidden ${fabClassName}`}
        style={fabStyle}
      >
        <Plus size={18} strokeWidth={2.5} />
      </Link>
    );
  }

  return (
    <RippleButton
      onClick={onClick}
      position="fixed"
      className={fabClassName}
      style={fabStyle}
      title={title}
    >
      <Plus size={18} strokeWidth={2.5} />
    </RippleButton>
  );
}
