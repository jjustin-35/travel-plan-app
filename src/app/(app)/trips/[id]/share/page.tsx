"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PdfDownloadButton } from "@/components/trip/PdfDownloadButton";

type ShareLink = {
  id: string;
  shareToken: string;
  permission: string;
  createdAt: string;
  isActive: boolean;
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: {
    id: string;
    dayNumber: number;
    date: string;
    events: {
      id: string;
      title: string;
      location: string;
      description: string;
      category: string;
      eventTime: string;
      durationMinutes: number;
      sortOrder: number;
      lat: number;
      lng: number;
    }[];
  }[];
};

export default function ShareManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/trips/${id}/shares`).then((r) => r.json()),
      fetch(`/api/trips/${id}`).then((r) => r.json()),
    ]).then(([shareData, tripData]) => {
      setShares(shareData.shares ?? []);
      setTrip(tripData.trip ?? null);
    });
  }, [id]);

  const createShare = async () => {
    setIsCreating(true);
    const res = await fetch(`/api/trips/${id}/shares`, { method: "POST" });
    const data = await res.json();
    if (data.share) setShares((prev) => [data.share, ...prev]);
    setIsCreating(false);
  };

  const deleteShare = async (shareId: string) => {
    setDeleteError(null);
    const res = await fetch(`/api/trips/${id}/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError("無法停用分享連結，請稍後再試。");
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-lg text-charcoal hover:text-coral transition-colors"
        >
          ←
        </button>
        <h1 className="font-bold text-charcoal text-sm">分享與匯出</h1>
      </div>

      <div className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* PDF Export */}
        {trip && (
          <section className="bg-white rounded-2xl p-4 border border-border">
            <h2 className="font-bold text-charcoal text-sm mb-1">📄 匯出行程</h2>
            <p className="text-xs text-muted mb-3">將完整行程匯出為 PDF 檔案</p>
            <PdfDownloadButton
              title={trip.title}
              destination={trip.destination}
              startDate={trip.startDate}
              endDate={trip.endDate}
              days={trip.days}
            />
          </section>
        )}

        {/* Share Links */}
        <section className="bg-white rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-charcoal text-sm">🔗 分享連結</h2>
              <p className="text-xs text-muted mt-0.5">任何有連結的人可唯讀查看行程</p>
            </div>
            <button
              onClick={createShare}
              disabled={isCreating}
              className="text-xs font-semibold text-white bg-coral px-3 py-1.5 rounded-full disabled:opacity-50 hover:bg-wood transition-colors"
            >
              {isCreating ? "建立中…" : "+ 新增"}
            </button>
          </div>
          {deleteError && (
            <p role="alert" className="text-xs text-red-500 mb-3">
              {deleteError}
            </p>
          )}

          {shares.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">尚未建立任何分享連結</p>
          ) : (
            <div className="flex flex-col gap-3">
              {shares.map((share) => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.shareToken}`;
                const isCopied = copied === share.shareToken;
                return (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 p-3 bg-cream rounded-xl border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-charcoal truncate">{url}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        建立於 {new Date(share.createdAt).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                    <button
                      onClick={() => copyLink(share.shareToken)}
                      className={[
                        "text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex-shrink-0",
                        isCopied
                          ? "bg-green-100 text-green-600"
                          : "bg-white border border-border text-charcoal hover:border-coral/50",
                      ].join(" ")}
                    >
                      {isCopied ? "已複製 ✓" : "複製"}
                    </button>
                    <button
                      onClick={() => deleteShare(share.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
