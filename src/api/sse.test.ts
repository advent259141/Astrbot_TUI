import { describe, expect, it } from "vitest";
import { parseEventSource, parseSseBlock } from "./sse.js";

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
