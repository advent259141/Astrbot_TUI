import { describe, expect, it } from "vitest";
import { normalizeSubagentConfig } from "./managementHelpers.js";

describe("normalizeSubagentConfig", () => {
  it("preserves inline prompts, tools, and upstream-defined agent fields", () => {
    const normalized = normalizeSubagentConfig({
      main_enable: true,
      remove_main_duplicate_tools: false,
      agents: [
        {
          name: "inline_writer",
          persona_id: null,
          system_prompt: "Write concise drafts.",
          public_description: "Drafts text",
          enabled: true,
          tools: ["search", "read"],
          custom_upstream_field: { mode: "preserve" },
        },
      ],
    });

    expect(normalized.agents[0]).toMatchObject({
      name: "inline_writer",
      persona_id: null,
      system_prompt: "Write concise drafts.",
      tools: ["search", "read"],
      custom_upstream_field: { mode: "preserve" },
    });
  });

  it("accepts persona-based agents without a system prompt", () => {
    const normalized = normalizeSubagentConfig({
      agents: [{ name: "support", persona_id: "persona-1", enabled: false, public_description: "Help" }],
    });

    expect(normalized.agents[0]).toMatchObject({
      name: "support",
      persona_id: "persona-1",
      enabled: false,
      provider_id: null,
    });
    expect(normalized.agents[0]).not.toHaveProperty("system_prompt");
  });
});
