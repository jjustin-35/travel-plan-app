"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const handleClick = () => {
    if (href) {
      router.push(href);
    }
    onClick?.();
  };

  return (
    <RippleButton
      onClick={handleClick}
      position="fixed"
      className={fabClassName}
      style={fabStyle}
      title={title}
    >
      <Plus size={18} strokeWidth={2.5} />
    </RippleButton>
  );
}
