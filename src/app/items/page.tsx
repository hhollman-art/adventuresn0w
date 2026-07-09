import ItemLibraryPage from "@/features/items/ItemLibraryPage";
import { Suspense } from "react";

function ItemsFallback() {
  return (
    <main className="app-main mx-auto px-4 py-10 text-sm text-[var(--muted)]">
      Loading items…
    </main>
  );
}

export default function ItemsRoutePage() {
  return (
    <Suspense fallback={<ItemsFallback />}>
      <ItemLibraryPage />
    </Suspense>
  );
}
