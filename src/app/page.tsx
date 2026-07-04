import HomePage from "@/features/home/HomePage";
import { Suspense } from "react";

function WorkshopFallback() {
  return (
    <main className="app-main app-main--workshop mx-auto px-4 py-10 text-sm text-[var(--muted)]">
      Loading workshop…
    </main>
  );
}

export default function Page(props: PageProps<"/">) {
  return (
    <Suspense fallback={<WorkshopFallback />}>
      <HomePage {...props} />
    </Suspense>
  );
}
