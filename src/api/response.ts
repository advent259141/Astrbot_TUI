import { ApiError } from "./errors.js";
import type { ApiEnvelope } from "./types.js";

export function unwrapApiEnvelope<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw new ApiError("Invalid Dashboard response.");
  }

  const envelope = payload as Partial<ApiEnvelope<T>>;
  if (envelope.status === "error") {
    throw new ApiError(envelope.message || "Dashboard request failed.");
  }

  if (envelope.status !== "ok" && envelope.status !== "warning") {
    throw new ApiError("Unexpected Dashboard response status.");
  }

  return (envelope.data ?? {}) as T;
}
