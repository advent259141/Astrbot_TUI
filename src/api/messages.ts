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
        return (part.tool_calls || []).map((tool) => {
          const name = String(tool.name || "tool");
          const args = typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args ?? {});
          const result = tool.result == null ? "…" : payloadText(tool.result);
          return `[tool] ${name}(${args})\n${result}`;
        }).join("\n") || "[tool call]";
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

/** Apply the Dashboard's chat events to a bot record, including resumed snapshots. */
export function applyChatEvent(record: ChatRecord, payload: Record<string, unknown>): ChatRecord {
  const type = String(payload.type || payload.t || "");
  const chain = String(payload.chain_type || "");
  const data = payload.data;
  if (type === "run_snapshot" && data && typeof data === "object") {
    const snapshot = data as Record<string, unknown>;
    const content = snapshot.content as ChatRecord["content"] | undefined;
    const next = normalizeChatRecord({ ...record, content: content || { type: "bot", message: [] } });
    next.llm_checkpoint_id = snapshot.llm_checkpoint_id as string | null | undefined;
    next.content.isLoading = snapshot.status === "running" && next.content.message.length === 0;
    return next;
  }
  if (type === "message_saved" && data && typeof data === "object") {
    const saved = data as Partial<ChatRecord> & { refs?: Record<string, unknown> };
    return { ...record, id: saved.id ?? record.id, created_at: saved.created_at ?? record.created_at,
      llm_checkpoint_id: saved.llm_checkpoint_id ?? record.llm_checkpoint_id,
      content: { ...record.content, refs: saved.refs ?? record.content.refs, isLoading: false } };
  }
  if (type === "agent_stats" || chain === "agent_stats") {
    return { ...record, content: { ...record.content, agent_stats: data as Record<string, unknown>, isLoading: false } };
  }
  if (type === "plain" && (chain === "tool_call" || chain === "tool_call_result")) {
    let tool: Record<string, unknown>;
    try {
      tool = typeof data === "string" ? JSON.parse(data) : data;
      if (!tool || typeof tool !== "object" || !tool.id) return record;
    } catch { return record; }
    const next = cloneRecord(record);
    // Results refer to the original call ID; update it instead of showing a second call.
    const part = next.content.message.find((item) => item.type === "tool_call" && item.tool_calls?.some((call) => call.id === tool.id));
    if (part?.tool_calls) {
      part.tool_calls = part.tool_calls.map((call) => call.id === tool.id ? { ...call, ...tool } : call);
    } else {
      next.content.message.push({ type: "tool_call", tool_calls: [{ ...tool }] });
    }
    next.content.isLoading = false;
    return next;
  }
  if (type === "plain") {
    return chain === "reasoning" ? appendThinkPart(record, payloadText(data)) : appendPlainPart(record, payloadText(data));
  }
  if (["image", "record", "file", "video"].includes(type)) {
    const filename = payloadText(data).replace(/^\[(IMAGE|RECORD|FILE|VIDEO)\]/, "");
    const [stored, display] = filename.split("|", 2);
    return appendTypedPart(record, { type, filename: display || stored });
  }
  if (type === "error") return appendPlainPart(record, `\n${payloadText(data)}`);
  if (["complete", "break", "end"].includes(type)) {
    const finalText = payloadText(data);
    const existing = record.content.message.filter((part) => part.type === "plain").map((part) => part.text || "").join("");
    const missing = finalText.startsWith(existing) ? finalText.slice(existing.length) : "";
    const next = type !== "end" && missing ? appendPlainPart(record, missing) : cloneRecord(record);
    next.content.isLoading = false;
    return next;
  }
  return record;
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
