import {
  formatAnthropicError,
  generateMarkdownStream,
} from "@/lib/anthropicGenerate";
import { logApiError } from "@/lib/serverLog";
import {
  recordTextGenerationUsage,
  type GenerationFeature,
} from "@/lib/usageMetering";

/** Named SSE event types used across markdown + heartbeat streams. */
export type SseEventName = "message" | "error" | "done";

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/**
 * Format one Server-Sent Event frame.
 * Clients that only read `data:` lines remain compatible; `event:` is additive.
 */
export function formatSseFrame(event: SseEventName, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type SseSession = {
  /** Enqueue a named SSE frame (no-op after close / abort). */
  write: (event: SseEventName, data: unknown) => void;
  /** True after client disconnect, abort, or finish. */
  isClosed: () => boolean;
  /** Combined abort signal (request + stream cancel). */
  signal: AbortSignal;
};

type CreateSseResponseOptions = {
  /** Native request abort — fires when the client disconnects. */
  signal?: AbortSignal;
  /** Keep-alive comment interval (ms). */
  heartbeatMs?: number;
  /**
   * Stream body. Must not throw past the helper — errors should be written
   * as `event: error` frames (the helper also catches unexpected throws).
   */
  run: (session: SseSession) => Promise<void>;
};

/**
 * Low-level SSE ReadableStream factory with heartbeats, abort wiring, and
 * guaranteed `controller.close()` in `finally`.
 */
export function createSseResponse({
  signal: requestSignal,
  heartbeatMs = 10_000,
  run,
}: CreateSseResponseOptions): Response {
  const encoder = new TextEncoder();
  const upstream = new AbortController();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const abortUpstream = () => {
    if (!upstream.signal.aborted) {
      upstream.abort();
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const safeEnqueue = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          closed = true;
          clearHeartbeat();
          abortUpstream();
        }
      };

      const write = (event: SseEventName, data: unknown) => {
        safeEnqueue(formatSseFrame(event, data));
      };

      const finish = () => {
        clearHeartbeat();
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const onRequestAbort = () => {
        closed = true;
        clearHeartbeat();
        abortUpstream();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      if (requestSignal) {
        if (requestSignal.aborted) {
          onRequestAbort();
          return;
        }
        requestSignal.addEventListener("abort", onRequestAbort, { once: true });
      }

      // Flush headers immediately, then keep the connection warm.
      safeEnqueue(": open\n\n");
      heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), heartbeatMs);

      const session: SseSession = {
        write,
        isClosed: () => closed || upstream.signal.aborted,
        signal: upstream.signal,
      };

      try {
        await run(session);
      } catch (err) {
        if (!session.isClosed()) {
          const message = err instanceof Error ? err.message : "Unknown stream error";
          write("error", { type: "error", error: message });
        }
      } finally {
        if (requestSignal) {
          requestSignal.removeEventListener("abort", onRequestAbort);
        }
        clearHeartbeat();
        finish();
      }
    },
    cancel() {
      clearHeartbeat();
      abortUpstream();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

type MarkdownSseOptions = {
  apiKey: string;
  system: string;
  user: string;
  /** Feature name for usage metering (SaaS chargeback). */
  feature: GenerationFeature;
  /** Tag passed to logApiError when the stream fails. */
  logTag: string;
  /** How often to emit a keep-alive comment, in ms. */
  heartbeatMs?: number;
  /** Abort when the client disconnects (pass `request.signal`). */
  signal?: AbortSignal;
};

/**
 * Builds a Server-Sent-Events Response that streams generated Markdown.
 *
 * Event map (additive `event:` names; JSON `type` kept for existing clients):
 * - `event: message` → `{ type: "meta" | "chunk", ... }`
 * - `event: done` → `{ type: "done", markdown, model }`
 * - `event: error` → `{ type: "error", error, status? }`
 *
 * Mobile browsers (and intermediate networks) frequently close a streamed
 * connection that goes idle while the model "thinks" between tokens. Heartbeat
 * comments + `X-Accel-Buffering: no` keep the pipe warm.
 */
export function createMarkdownSseResponse({
  apiKey,
  system,
  user,
  feature,
  logTag,
  heartbeatMs = 10_000,
  signal,
}: MarkdownSseOptions): Response {
  return createSseResponse({
    signal,
    heartbeatMs,
    run: async (session) => {
      try {
        const result = await generateMarkdownStream({
          apiKey,
          system,
          user,
          signal: session.signal,
          onModel: (model) => {
            if (session.isClosed()) return;
            session.write("message", { type: "meta", model });
          },
          onText: (chunk) => {
            if (session.isClosed()) return;
            session.write("message", { type: "chunk", text: chunk });
          },
        });
        if (session.isClosed()) return;
        recordTextGenerationUsage({
          feature,
          model: result.model,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
        session.write("done", {
          type: "done",
          markdown: result.markdown,
          model: result.model,
        });
      } catch (err) {
        if (session.isClosed() || session.signal.aborted) return;
        const { message, status } = formatAnthropicError(err);
        logApiError(logTag, { status: String(status), message });
        session.write("error", { type: "error", error: message, status });
      }
    },
  });
}

type HeartbeatJsonOptions = {
  /** Performs the long task and resolves the final JSON body + HTTP-ish status. */
  work: (signal: AbortSignal) => Promise<{ status: number; body: unknown }>;
  /** Tag passed to logApiError when work() throws. */
  logTag: string;
  heartbeatMs?: number;
  signal?: AbortSignal;
};

/**
 * Streams keep-alive heartbeats while a long task (e.g. OpenAI image
 * generation) runs, then emits the final JSON payload as one `done` event.
 */
export function createHeartbeatJsonResponse({
  work,
  logTag,
  heartbeatMs = 10_000,
  signal,
}: HeartbeatJsonOptions): Response {
  return createSseResponse({
    signal,
    heartbeatMs,
    run: async (session) => {
      try {
        const { status, body } = await work(session.signal);
        if (session.isClosed()) return;
        session.write("done", { type: "done", status, body });
      } catch (err) {
        if (session.isClosed() || session.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        logApiError(logTag, { message });
        session.write("error", {
          type: "error",
          error: message,
          status: 502,
        });
        // Legacy clients only look for `type: "done"` on image streams.
        session.write("done", {
          type: "done",
          status: 502,
          body: { error: message },
        });
      }
    },
  });
}
