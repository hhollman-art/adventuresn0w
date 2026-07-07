import type { Metadata } from "next";
import AdminPortalClient from "@/features/admin/AdminPortalClient";

export const metadata: Metadata = {
  title: "Admin — D&D Easy",
  description: "Internal DMMS admin UI management portal.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPortalClient />;
}
