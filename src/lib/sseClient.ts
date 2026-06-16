/**
 * Client-side companion to `createHeartbeatJsonResponse`.
 *
 * Image generation can take well over a minute. A plain `fetch` that waits for
 * the whole response holds an idle connection, which mobile browsers drop (and
 * the tab suspends on screen-lock), surfacing as a "load failure". The server
 * streams keep-alive heartbeats during generation and ends with a single `done`
 * event carrying the JSON body; this reader consumes that stream and resolves
 * the final `{ status, body }`. If streaming is unavailable or the stream breaks
 * mid-flight, it falls back to a plain non-streaming POST so the request still
 * completes.
 */

type JsonResult = { status: number; body: unknown };

function parseMaybeJson(text: string): unknown {
  const t = text.trim();
  if (!t) return {};
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return { error: t.length > 280 ? `${t.slice(0, 280)}…` : t };
  }
}

async function postPlainJson(
  url: string,
  payload: Record<string, unknown>,
): Promise<JsonResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: parseMaybeJson(await res.text()) };
}

export async function postHeartbeatJson(
  url: string,
  payload: Record<string, unknown>,
): Promise<JsonResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    if (!res.ok) {
      return { status: res.status, body: parseMaybeJson(await res.text()) };
    }
    if (!res.body) {
      return postPlainJson(url, payload);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let final: JsonResult | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const lines = rawEvent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data: "));
        if (lines.length === 0) continue;
        const dataText = lines.map((line) => line.slice(6)).join("\n");
        const evt = JSON.parse(dataText) as {
          type?: string;
          status?: number;
          body?: unknown;
        };
        if (evt.type === "done") {
          final = { status: evt.status ?? 200, body: evt.body ?? {} };
        }
      }
    }

    if (final) return final;
    // Stream ended before a result arrived; retry without streaming.
    return postPlainJson(url, payload);
  } catch {
    return postPlainJson(url, payload);
  }
}
