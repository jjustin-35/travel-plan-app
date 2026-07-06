"use client";

import dynamic from "next/dynamic";
import { TripPdfDocument } from "@/components/trip/TripPdfDocument";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

type TripDay = {
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
};

type PdfDownloadButtonProps = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: TripDay[];
};

export function PdfDownloadButton({
  title,
  destination,
  startDate,
  endDate,
  days,
}: PdfDownloadButtonProps) {
  const filename = `${title.replace(/\s+/g, "-")}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <TripPdfDocument
          title={title}
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          days={days}
        />
      }
      fileName={filename}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal bg-butter rounded-xl border border-border hover:bg-wood/20 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳" : "📄"}
          <span>{loading ? "產生中…" : "匯出 PDF"}</span>
        </button>
      )}
    </PDFDownloadLink>
  );
}
