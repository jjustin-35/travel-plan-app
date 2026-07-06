"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  tripType: string;
  status: string;
};

const DESTINATION_EMOJIS: Record<string, string> = {
  東京: "🗼",
  京都: "⛩️",
  大阪: "🏯",
  峇里島: "🌴",
  巴黎: "🗺️",
  首爾: "🏙️",
  紐約: "🗽",
  倫敦: "🎡",
  曼谷: "🐘",
  싱가포르: "🦁",
};

function getDestinationEmoji(destination: string): string {
  for (const [key, emoji] of Object.entries(DESTINATION_EMOJIS)) {
    if (destination.includes(key)) return emoji;
  }
  return "✈️";
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
}

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const emoji = getDestinationEmoji(trip.destination);
  const isGenerating = trip.status === "generating";

  const handleOpen = () => {
    if (isDeleting || showDeleteConfirm) return;
    router.push(`/trips/${trip.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete trip");
      setShowDeleteConfirm(false);
      router.refresh();
    } catch {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      setShowDeleteError(true);
    }
  };

  return (
    <>
      <div
        onClick={handleOpen}
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      >
      {/* Cover */}
      <div className="h-28 bg-linear-to-br from-butter to-wood-light flex items-center justify-center">
        <span className="text-6xl drop-shadow-sm">{emoji}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-charcoal text-sm leading-tight flex-1">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {isGenerating && (
              <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full">
                規劃中
              </span>
            )}
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label="刪除行程"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted mt-1">{trip.destination}</p>

        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted">
            📅 {formatDateRange(trip.startDate, trip.endDate)}
          </span>
          <span className="text-xs text-muted">👥 {trip.peopleCount} 人</span>
          <span className="text-xs bg-butter text-charcoal px-2 py-0.5 rounded-full">
            {trip.tripType}
          </span>
        </div>
      </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="刪除行程"
        message={`確定要刪除「${trip.title}」嗎？此操作無法復原。`}
        confirmLabel="刪除"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={showDeleteError}
        title="刪除失敗"
        message="請稍後再試"
        confirmLabel="知道了"
        hideCancel
        onConfirm={() => setShowDeleteError(false)}
        onCancel={() => setShowDeleteError(false)}
      />
    </>
  );
}
