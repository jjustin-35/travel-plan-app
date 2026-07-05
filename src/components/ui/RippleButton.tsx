"use client";

import { useState } from "react";

type RippleItem = {
  id: number;
  x: number;
  y: number;
  size: number;
};

function useRipples() {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const spawn = (e: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.5;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y, size }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  };

  return { ripples, spawn };
}

function RippleLayer({ ripples, color }: { ripples: RippleItem[]; color: string }) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            backgroundColor: color,
            animation: "ripple-expand 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          }}
        />
      ))}
    </>
  );
}

type RippleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  rippleColor?: string;
  // to fix the passed position in style may not override the default position
  position?: 'fixed' | 'absolute' | 'relative' | 'sticky' | 'static' | 'inherit' | 'initial' | 'unset';
};

export function RippleButton({
  rippleColor = "rgba(255,255,255,0.42)",
  children,
  className = "",
  onClick,
  style,
  position = 'relative',
  ...rest
}: RippleButtonProps) {
  const { ripples, spawn } = useRipples();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    spawn(e);
    onClick?.(e);
  };

  return (
    <button
      {...rest}
      className={`${position} overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      <RippleLayer ripples={ripples} color={rippleColor} />
    </button>
  );
}

type RippleCardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  rippleColor?: string;
};

export function RippleCard({
  children,
  className = "",
  onClick,
  rippleColor = "rgba(233, 116, 81, 0.15)",
}: RippleCardProps) {
  const { ripples, spawn } = useRipples();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    spawn(e);
    onClick?.(e);
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {children}
      <RippleLayer ripples={ripples} color={rippleColor} />
    </div>
  );
}
