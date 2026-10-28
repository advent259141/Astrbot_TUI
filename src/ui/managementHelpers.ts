import type { SubagentConfig } from "../api/management.types.js";

const EMPTY_SUBAGENT_CONFIG: SubagentConfig = {
  main_enable: false,
  remove_main_duplicate_tools: false,
  agents: [],
};

export function normalizeSubagentConfig(
  value: Partial<SubagentConfig> | null | undefined,
): SubagentConfig {
  const source = value && typeof value === "object" ? value : EMPTY_SUBAGENT_CONFIG;
  return {
    ...source,
    main_enable: Boolean(source.main_enable ?? source.enable),
    remove_main_duplicate_tools: Boolean(source.remove_main_duplicate_tools),
    agents: Array.isArray(source.agents)
      ? source.agents.map((agent) => ({
          ...agent,
          name: String(agent.name || ""),
          persona_id: agent.persona_id == null ? null : String(agent.persona_id),
          ...(agent.system_prompt !== undefined
            ? { system_prompt: agent.system_prompt == null ? "" : String(agent.system_prompt) }
            : {}),
          public_description: String(agent.public_description || ""),
          enabled: agent.enabled !== false,
          provider_id: agent.provider_id ?? null,
        }))
      : [],
  };
}
