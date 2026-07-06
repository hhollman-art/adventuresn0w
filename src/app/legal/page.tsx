import type { Metadata } from "next";
import Link from "next/link";
import StandaloneContentShell from "@/features/shell/StandaloneContentShell";
import { FANTASY_FORGE } from "@/lib/workplace/forgeLexicon";
import {
  SRD_ATTRIBUTION_MARKDOWN,
  SRD_CONTENT_POLICY,
  SRD_MANIFEST,
} from "@/lib/srd";

export const metadata: Metadata = {
  title: "Licenses & content — D&D Easy",
  description:
    "SRD attribution, Creative Commons license, and content policy for D&D Easy.",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mt-10 text-xl font-bold text-[var(--accent)]">
      <span aria-hidden="true">&#10022; </span>
      {children}
    </h2>
  );
}

export default function LegalPage() {
  return (
    <StandaloneContentShell>
      <section
        className="fantasy-panel rounded-xl border p-6 sm:p-10"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="zone-badge mb-3">Legal &amp; content</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          Licenses &amp; content policy
        </h1>
        <div className="fantasy-divider mt-2" aria-hidden="true">
          <span className="text-sm leading-none">&#10022;</span>
        </div>

        <SectionHeading>SRD attribution</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          {SRD_MANIFEST.appName} uses material from the{" "}
          <strong>System Reference Document {SRD_MANIFEST.version}</strong> (&ldquo;SRD{" "}
          {SRD_MANIFEST.version}&rdquo; / {SRD_MANIFEST.documentPdfId}), &copy;{" "}
          {SRD_MANIFEST.copyrightHolder}, available at{" "}
          <a
            href={SRD_MANIFEST.srdUrl}
            className="font-semibold text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {SRD_MANIFEST.srdUrl}
          </a>
          . The Library&rsquo;s <strong>Browse SRD rules</strong> feature covers spells, monsters,
          classes, equipment, and rules via the{" "}
          <a
            href={SRD_MANIFEST.srdApiSource}
            className="font-semibold text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            D&amp;D 5e SRD API
          </a>{" "}
          (2014 SRD, CC BY 4.0). The spell picker index is structured from the Open5e API (
          <a
            href={SRD_MANIFEST.spellDataSource}
            className="font-semibold text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            open5e.com
          </a>
          , document <code className="text-[11px]">wotc-srd</code>), also under CC BY 4.0.
          The SRD is licensed under the{" "}
          <a
            href={SRD_MANIFEST.licenseUrl}
            className="font-semibold text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution 4.0 International License
          </a>{" "}
          ({SRD_MANIFEST.license}).
        </p>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">
          {SRD_MANIFEST.appName} is <strong>not</strong> affiliated with, endorsed, sponsored, or
          approved by {SRD_MANIFEST.copyrightHolder}. &ldquo;Dungeons &amp; Dragons&rdquo; and
          related marks are property of {SRD_MANIFEST.copyrightHolder}.
        </p>

        <SectionHeading>Two tiers of content</SectionHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-[var(--text)]/90">
          <li>
            <strong>SRD content (bundled).</strong> {SRD_CONTENT_POLICY.srdTier}
          </li>
          <li>
            <strong>Your content (private).</strong> {SRD_CONTENT_POLICY.userTier}
          </li>
        </ul>

        <SectionHeading>What we never do</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">{SRD_CONTENT_POLICY.never}</p>
        <p className="mt-2 leading-relaxed text-[var(--text)]/90">
          That includes D&amp;D Beyond: we do not log into your account, use your browser cookies,
          call hidden D&amp;D Beyond APIs, or scrape character sheets. If you use characters built
          with purchased books, you bring the data yourself — by typing from your sheet or
          uploading a <code className="text-[11px]">.json</code> file you saved on your device.
          Conversion runs in your browser only.
        </p>

        <SectionHeading>AI generation &amp; privacy</SectionHeading>
        <p className="mt-3 leading-relaxed text-[var(--text)]/90">{SRD_CONTENT_POLICY.aiTier}</p>
        <p className="mt-2 leading-relaxed text-[var(--text)]/90">
          Saved adventures, parties, and Virtual Table data live in{" "}
          <strong>your browser</strong> unless you export them yourself. See{" "}
          <Link href="/help" className="font-semibold text-[var(--accent)] underline">
            How to use
          </Link>{" "}
          for details.
        </p>

        <SectionHeading>Attribution text for exports</SectionHeading>
        <p className="mt-3 text-sm text-[var(--muted)]">
          You may paste this into booklets or shared documents that include SRD-derived mechanics:
        </p>
        <pre
          className="mt-2 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed whitespace-pre-wrap"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {SRD_ATTRIBUTION_MARKDOWN}
        </pre>

        <div className="fantasy-divider mt-10" aria-hidden="true">
          <span className="text-sm leading-none">&#10022;</span>
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="btn btn-primary btn-md">
            Back to the {FANTASY_FORGE}
          </Link>
        </p>
      </section>
    </StandaloneContentShell>
  );
}
