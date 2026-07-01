import { redirect } from "next/navigation";

// Root page — redirect handled by middleware based on auth state
// Authenticated users -> /  (app layout)
// Unauthenticated users -> /login
export default function RootPage() {
  redirect("/login");
}
