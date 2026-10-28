import { ApiError } from "./errors.js";

export interface SseEvent {
  id?: string;
  event?: string;
  data: string;
}

export function parseSseBlock(block: string): SseEvent | null {
  const event: SseEvent = { data: "" };
  const dataLines: string[] = [];

  for (const [lineIndex, rawLine] of block
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .entries()) {
    const line = lineIndex === 0 ? rawLine.replace(/^\uFEFF/, "") : rawLine;
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field =
      separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    let value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "data") {
      dataLines.push(value);
    } else if (field === "id") {
      event.id = value;
    } else if (field === "event") {
      event.event = value;
    }
  }

  if (!dataLines.length) {
    return null;
  }

  event.data = dataLines.join("\n");
  return event;
}

export async function* parseEventSource(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventLines: string[] = [];
  let streamDone = false;

  try {
    while (!streamDone) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }
      streamDone = done;

      while (true) {
        const lineFeedIndex = buffer.indexOf("\n");
        const carriageReturnIndex = buffer.indexOf("\r");
        let lineEndIndex: number;
        if (lineFeedIndex < 0) {
          lineEndIndex = carriageReturnIndex;
        } else if (carriageReturnIndex < 0) {
          lineEndIndex = lineFeedIndex;
        } else {
          lineEndIndex = Math.min(lineFeedIndex, carriageReturnIndex);
        }

        if (lineEndIndex < 0) {
          break;
        }
        if (
          buffer[lineEndIndex] === "\r" &&
          lineEndIndex === buffer.length - 1 &&
          !streamDone
        ) {
          break;
        }

        const line = buffer.slice(0, lineEndIndex);
        const separatorLength =
          buffer[lineEndIndex] === "\r" && buffer[lineEndIndex + 1] === "\n"
            ? 2
            : 1;
        buffer = buffer.slice(lineEndIndex + separatorLength);
        if (line === "") {
          const event = parseSseBlock(eventLines.join("\n"));
          eventLines = [];
          if (event) {
            yield event;
          }
        } else {
          eventLines.push(line);
        }
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      eventLines.push(buffer);
    }
    const trailing = parseSseBlock(eventLines.join("\n"));
    if (trailing) {
      yield trailing;
    }
  } finally {
    if (!streamDone) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

export async function* parseJsonEventSource<T = unknown>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  for await (const event of parseEventSource(body)) {
    if (!event.data.trim()) {
      continue;
    }
    try {
      yield JSON.parse(event.data) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiError(`Invalid JSON in event stream: ${error.message}`);
      }
      throw error;
    }
  }
}
