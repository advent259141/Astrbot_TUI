import type { ChatRecord, MessagePart } from "./types.js";

export function normalizeMessageParts(
  parts: unknown,
  legacyReasoning = "",
): MessagePart[] {
  const normalized = normalizePartsInternal(parts);
  if (legacyReasoning && !normalized.some((part) => part.type === "think")) {
    normalized.unshift({ type: "think", think: legacyReasoning });
  }
  return normalized;
}

export function normalizeChatRecord(record: ChatRecord): ChatRecord {
  const content = record.content || { type: "bot", message: [] };
  const parts = normalizeMessageParts(content.message, content.reasoning || "");
  return {
    ...record,
    content: {
      ...content,
      type: content.type || (record.sender_id === "bot" ? "bot" : "user"),
      message: parts,
      reasoning: extractReasoning(parts, content.reasoning),
    },
  };
}

export function textFromParts(parts: MessagePart[]): string {
  return parts
    .map((part) => {
      if (part.type === "plain") {
        return String(part.text || "");
      }
      if (part.type === "think") {
        const value = String(part.think || "").trim();
        return value ? `[thinking] ${value}` : "";
      }
      if (part.type === "tool_call") {
        return "[tool call]";
      }
      if (part.filename) {
        return `[${part.type}] ${part.filename}`;
      }
      return part.type ? `[${part.type}]` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function payloadText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  if (typeof value === "object") {
    const payload = value as Record<string, unknown>;
    for (const key of ["text", "content", "message"]) {
      if (typeof payload[key] === "string") {
        return payload[key] as string;
      }
    }
  }
  return String(value);
}

export function appendPlainPart(record: ChatRecord, text: string): ChatRecord {
  const next = cloneRecord(record);
  const parts = next.content.message;
  const last = parts[parts.length - 1];
  if (last?.type === "plain") {
    last.text = `${String(last.text || "")}${text}`;
  } else {
    parts.push({ type: "plain", text });
  }
  next.content.isLoading = false;
  return next;
}

export function appendThinkPart(record: ChatRecord, text: string): ChatRecord {
  const next = cloneRecord(record);
  const parts = next.content.message;
  const last = parts[parts.length - 1];
  if (last?.type === "think") {
    last.think = `${String(last.think || "")}${text}`;
  } else {
    parts.push({ type: "think", think: text });
  }
  next.content.reasoning = extractReasoning(parts);
  next.content.isLoading = false;
  return next;
}

export function appendTypedPart(record: ChatRecord, part: MessagePart): ChatRecord {
  const next = cloneRecord(record);
  next.content.message.push(part);
  next.content.isLoading = false;
  return next;
}

function normalizePartsInternal(parts: unknown): MessagePart[] {
  if (typeof parts === "string") {
    return parts ? [{ type: "plain", text: parts }] : [];
  }
  if (!Array.isArray(parts)) {
    return [];
  }
  return parts.map((part) => {
    if (!part || typeof part !== "object") {
      return { type: "plain", text: String(part ?? "") };
    }
    const copied = { ...(part as Record<string, unknown>) } as MessagePart;
    if (copied.type === "reasoning") {
      return {
        ...copied,
        type: "think",
        think: String(copied.think ?? copied.text ?? ""),
      };
    }
    return copied;
  });
}

function extractReasoning(parts: MessagePart[], legacy = ""): string {
  return (
    parts
      .filter((part) => part.type === "think")
      .map((part) => String(part.think || ""))
      .join("") || legacy
  );
}

function cloneRecord(record: ChatRecord): ChatRecord {
  return {
    ...record,
    content: {
      ...record.content,
      message: record.content.message.map((part) => ({ ...part })),
    },
  };
}
