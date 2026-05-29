export interface SseEvent {
  id?: string;
  event?: string;
  data: string;
}

export function parseSseBlock(block: string): SseEvent | null {
  const event: SseEvent = { data: "" };
  const dataLines: string[] = [];

  for (const rawLine of block.replace(/\r\n/g, "\n").split("\n")) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }

    const separatorIndex = rawLine.indexOf(":");
    const field =
      separatorIndex >= 0 ? rawLine.slice(0, separatorIndex) : rawLine;
    let value = separatorIndex >= 0 ? rawLine.slice(separatorIndex + 1) : "";
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

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const event = parseSseBlock(block);
        if (event) {
          yield event;
        }
      }
    }

    buffer += decoder.decode();
    const trailing = buffer.trim();
    if (trailing) {
      const event = parseSseBlock(trailing);
      if (event) {
        yield event;
      }
    }
  } finally {
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
    yield JSON.parse(event.data) as T;
  }
}
