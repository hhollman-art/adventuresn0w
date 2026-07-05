import HomePage from "@/features/home/HomePage";
import { Suspense } from "react";

function LibraryFallback() {
  return (
    <main className="app-main app-main--library mx-auto px-4 py-10 text-sm text-[var(--muted)]">
      Loading library…
    </main>
  );
}

export default function LibraryPage(props: PageProps<"/library">) {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <HomePage {...props} />
    </Suspense>
  );
}
