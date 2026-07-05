import {
  formatAnthropicError,
  generateMarkdownStream,
} from "@/lib/anthropicGenerate";
import { logApiError } from "@/lib/serverLog";
import {
  recordTextGenerationUsage,
  type GenerationFeature,
} from "@/lib/usageMetering";

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
};

/**
 * Builds a Server-Sent-Events Response that streams generated Markdown.
 *
 * Mobile browsers (and intermediate networks) frequently close a streamed
 * connection that goes idle while the model "thinks" between tokens. To keep
 * the stream alive we flush the response headers immediately and emit a small
 * comment heartbeat on an interval. `X-Accel-Buffering: no` prevents proxies
 * from buffering the whole response (which would defeat streaming entirely).
 */
export function createMarkdownSseResponse({
  apiKey,
  system,
  user,
  feature,
  logTag,
  heartbeatMs = 10_000,
}: MarkdownSseOptions): Response {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
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
          // Client disconnected; stop trying to write.
          closed = true;
          clearHeartbeat();
        }
      };

      const write = (payload: unknown) =>
        safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`);

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

      // Flush headers right away so the browser commits to the streamed
      // response, then keep the connection warm during generation gaps.
      safeEnqueue(": open\n\n");
      heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), heartbeatMs);

      try {
        const result = await generateMarkdownStream({
          apiKey,
          system,
          user,
          onModel: (model) => write({ type: "meta", model }),
          onText: (chunk) => write({ type: "chunk", text: chunk }),
        });
        recordTextGenerationUsage({
          feature,
          model: result.model,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
        write({ type: "done", markdown: result.markdown, model: result.model });
      } catch (err) {
        const { message, status } = formatAnthropicError(err);
        logApiError(logTag, { status: String(status), message });
        write({ type: "error", error: message, status });
      } finally {
        finish();
      }
    },
    cancel() {
      clearHeartbeat();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

type HeartbeatJsonOptions = {
  /** Performs the long task and resolves the final JSON body + HTTP-ish status. */
  work: () => Promise<{ status: number; body: unknown }>;
  /** Tag passed to logApiError when work() throws. */
  logTag: string;
  heartbeatMs?: number;
};

/**
 * Streams keep-alive heartbeats while a long task (e.g. OpenAI image
 * generation) runs, then emits the final JSON payload as one `done` event.
 *
 * Image requests can take well over a minute and send no bytes until they
 * finish; mobile browsers drop those idle connections (and suspend the tab on
 * screen-lock), which surfaces as a "load failure". Flushing headers up front
 * and emitting a small comment heartbeat keeps the connection warm so the
 * result survives. The body status is carried inside the event because the
 * HTTP response itself is committed as 200 the moment streaming starts.
 */
export function createHeartbeatJsonResponse({
  work,
  logTag,
  heartbeatMs = 10_000,
}: HeartbeatJsonOptions): Response {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
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
        }
      };

      const write = (payload: unknown) =>
        safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`);

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

      safeEnqueue(": open\n\n");
      heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), heartbeatMs);

      try {
        const { status, body } = await work();
        write({ type: "done", status, body });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logApiError(logTag, { message });
        write({ type: "done", status: 502, body: { error: message } });
      } finally {
        finish();
      }
    },
    cancel() {
      clearHeartbeat();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
