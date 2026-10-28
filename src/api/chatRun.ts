import type { DashboardClient } from "./client.js";

/** Reattach to a server-side generation after transport loss without resending the prompt. */
export async function* recoverChatStream(
  client: Pick<DashboardClient, "getSession" | "resumeChatRun">,
  sessionId: string,
  initialStream: AsyncIterable<Record<string, unknown>>,
  signal: AbortSignal,
  knownRun: { runId?: string; checkpointId?: string } = {},
): AsyncGenerator<Record<string, unknown>> {
  let stream = initialStream;
  let { runId, checkpointId } = knownRun;
  for (let attempt = 0; ; attempt++) {
    let finished = false;
    let failure: unknown;
    try {
      for await (const event of stream) {
        if (signal.aborted) return;
        const type = event.type || event.t;
        const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : {};
        if (typeof event.message_id === "string") runId = event.message_id;
        if ((type === "run_snapshot" || type === "run_started") && typeof data.run_id === "string") runId = data.run_id;
        if (type === "user_message_saved" && typeof data.llm_checkpoint_id === "string") checkpointId = data.llm_checkpoint_id;
        if (type === "end" || type === "error") finished = true;
        yield event;
      }
    } catch (error) {
      if (signal.aborted) throw error;
      failure = error;
    }
    if (signal.aborted || finished) return;
    if (attempt >= 2) throw failure || new Error("Chat stream disconnected. Return to this chat to reconnect.");
    const session = await client.getSession(sessionId);
    if (signal.aborted) return;
    const run = session.active_runs?.find((candidate) => runId ? candidate.run_id === runId : checkpointId && candidate.llm_checkpoint_id === checkpointId);
    if (!run?.run_id) {
      if (failure) throw failure;
      if (session.active_runs?.length) throw new Error("The interrupted generation could not be identified. Reopen the chat to reconnect.");
      return;
    }
    runId = run.run_id;
    stream = client.resumeChatRun(run.run_id, { signal });
  }
}
