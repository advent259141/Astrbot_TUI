import { describe, expect, it } from "vitest";
import { ApiError } from "./errors.js";
import { parseEventSource, parseJsonEventSource, parseSseBlock } from "./sse.js";

describe("parseSseBlock", () => {
  it("parses id, event and multiline data", () => {
    expect(parseSseBlock("id: 1\nevent: log\ndata: hello\ndata: world")).toEqual({
      id: "1",
      event: "log",
      data: "hello\nworld",
    });
  });

  it("ignores heartbeat comments", () => {
    expect(parseSseBlock(": heartbeat")).toBeNull();
  });

  it("accepts a UTF-8 BOM and carriage return line endings", () => {
    expect(parseSseBlock("\uFEFFdata: hello\rdata: world")).toEqual({
      data: "hello\nworld",
    });
  });
});

describe("parseEventSource", () => {
  it("handles partial chunks and heartbeat comments", async () => {
    const stream = streamFrom([
      ": heartbeat\n\n",
      "data: {\"type\":\"plain\",\"data\":\"he",
      "llo\"}\n\n",
      "data: {\"type\":\"end\"}\n\n",
    ]);

    const events = [];
    for await (const event of parseEventSource(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { data: "{\"type\":\"plain\",\"data\":\"hello\"}" },
      { data: "{\"type\":\"end\"}" },
    ]);
  });

  it("handles CRLF split across chunks and final events without a blank line", async () => {
    const stream = streamFrom([
      "data: {\"type\":\"plain\"}\r",
      "\n\r",
      "\ndata: {\"type\":\"end\"}",
    ]);

    const events = [];
    for await (const event of parseEventSource(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { data: "{\"type\":\"plain\"}" },
      { data: "{\"type\":\"end\"}" },
    ]);
  });

  it("cancels the source when the consumer stops early", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: first\n\n"));
      },
      cancel() {
        cancelled = true;
      },
    });

    for await (const _event of parseEventSource(stream)) {
      break;
    }

    expect(cancelled).toBe(true);
  });
});

describe("parseJsonEventSource", () => {
  it("reports malformed JSON event data as an API error", async () => {
    const stream = streamFrom(["data: {not json}\n\n"]);

    await expect(async () => {
      for await (const _payload of parseJsonEventSource(stream)) {
        // Consume the stream to observe the parser error.
      }
    }).rejects.toBeInstanceOf(ApiError);
  });
});

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
