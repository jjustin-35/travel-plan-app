"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { RippleButton } from "@/components/ui/RippleButton";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  hideCancel?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "確認",
  cancelLabel = "取消",
  variant = "default",
  hideCancel = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onCancel}
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-3xl border border-border shadow-2xl overflow-hidden"
          style={{ backgroundColor: "#fffcf7" }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-message"
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <h2
              id="confirm-modal-title"
              className="font-bold text-charcoal text-base"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-butter hover:text-charcoal transition-colors disabled:opacity-50"
              aria-label="關閉"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5">
            <p
              id="confirm-modal-message"
              className="text-sm text-muted text-center leading-relaxed"
            >
              {message}
            </p>

            <div className="flex gap-3 mt-6">
              {!hideCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl border border-border text-charcoal text-sm font-semibold hover:bg-butter transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
              )}
              {variant === "danger" ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "處理中…" : confirmLabel}
                </button>
              ) : (
                <RippleButton
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-bold hover:bg-wood transition-colors disabled:opacity-50"
                >
                  {isLoading ? "處理中…" : confirmLabel}
                </RippleButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
