"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansTC",
  src: "https://fonts.gstatic.com/s/notosanstc/v26/-nF7OG829Oofr2wohFbTp9iFOSsLA_ZJ1g.woff2",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansTC",
    backgroundColor: "#FBF8F3",
    padding: 36,
    fontSize: 10,
    color: "#2D2420",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2D2420",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#8C7B6E",
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    backgroundColor: "#E87C5A",
    color: "#FFFFFF",
    padding: "6 10",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  event: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: "8 10",
    marginBottom: 6,
    borderLeft: "3 solid #E87C5A",
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: "bold",
    flex: 1,
  },
  eventTime: {
    fontSize: 9,
    color: "#8C7B6E",
  },
  eventLocation: {
    fontSize: 9,
    color: "#8C7B6E",
    marginBottom: 2,
  },
  eventDesc: {
    fontSize: 9,
    color: "#4A3F3A",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTop: "1 solid #DDD5CC",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#8C7B6E",
  },
});

type TripEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  category: string;
  eventTime: string;
  durationMinutes: number;
  sortOrder: number;
};

type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  events: TripEvent[];
};

type TripPdfDocumentProps = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: TripDay[];
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} 分鐘`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h} 小時`;
}

export function TripPdfDocument({
  title,
  destination,
  startDate,
  endDate,
  days,
}: TripPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            📍 {destination}　📅 {formatDate(startDate)} — {formatDate(endDate)}
          </Text>
        </View>

        {days.map((day) => (
          <View key={day.id} style={styles.daySection} wrap={false}>
            <Text style={styles.dayHeader}>
              Day {day.dayNumber}　{formatDate(day.date)}
            </Text>

            {day.events.map((event) => (
              <View key={event.id} style={styles.event}>
                <View style={styles.eventRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {event.eventTime} · {formatDuration(event.durationMinutes)}
                  </Text>
                </View>
                {event.location ? (
                  <Text style={styles.eventLocation}>📍 {event.location}</Text>
                ) : null}
                {event.description ? (
                  <Text style={styles.eventDesc}>{event.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AI 行程規劃師</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
