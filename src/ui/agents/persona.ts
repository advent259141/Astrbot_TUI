import type { PersonaItem, PersonaSavePayload } from "../../api/types.js";
import type { I18n } from "../../i18n/index.js";
import type { AgentField } from "../AgentsView.js";

export function createPersonaDraft(personas: PersonaItem[]): PersonaItem {
  return {
    persona_id: nextPersonaId(personas),
    system_prompt: "",
    begin_dialogs: [],
    tools: null,
    skills: null,
    custom_error_message: null,
    folder_id: null,
    sort_order: personas.length,
  };
}

function nextPersonaId(personas: PersonaItem[]): string {
  const existing = new Set(personas.map((persona) => persona.persona_id));
  const base = "new_persona";
  if (!existing.has(base)) {
    return base;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}_${index}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  return `${base}_${Date.now()}`;
}

export function personaEditableValue(
  key: AgentField["key"],
  value: unknown,
): string {
  if (key === "tools" || key === "skills") {
    if (value === null || value === undefined) {
      return "*";
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return "";
  }
  if (key === "begin_dialogs") {
    return Array.isArray(value) ? value.join(" | ") : "";
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function parsePersonaEditableValue(
  key: AgentField["key"],
  rawValue: string,
  previousValue: unknown,
): unknown {
  const trimmed = rawValue.trim();
  if (key === "persona_id") {
    return trimmed;
  }
  if (key === "custom_error_message") {
    return trimmed || null;
  }
  if (key === "tools" || key === "skills") {
    if (!trimmed) {
      return [];
    }
    if (trimmed === "*") {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed === null || Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall back to comma-separated values.
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (key === "begin_dialogs") {
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      // Fall back to pipe/newline separated values.
    }
    const separator = rawValue.includes("|") ? /\|/ : /\r?\n/;
    return rawValue
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof previousValue === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : previousValue;
  }
  return rawValue;
}

export function validatePersonaDraft(
  draft: PersonaItem,
  personas: PersonaItem[],
  draftIndex: number,
  isCreating: boolean,
  i18n: I18n,
): string {
  const personaId = draft.persona_id.trim();
  if (!personaId) {
    return i18n.t("features.persona.validation.required", "This field is required");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(personaId)) {
    return i18n.t("features.persona.validation.alphanumeric", "Only letters, numbers, underscores and hyphens are allowed");
  }
  const duplicate = personas.some((persona, index) =>
    index !== draftIndex && persona.persona_id === personaId,
  );
  if (isCreating && duplicate) {
    return i18n.t("features.persona.validation.personaIdExists", "This persona name already exists");
  }
  if (!String(draft.system_prompt || "").trim()) {
    return i18n.t("features.persona.validation.required", "This field is required");
  }
  if ((draft.begin_dialogs || []).length % 2 !== 0) {
    return i18n.t("features.persona.form.presetDialogsHelp", "The number of dialogs must be even.");
  }
  return "";
}

export function personaSavePayload(persona: PersonaItem): PersonaSavePayload {
  return {
    persona_id: persona.persona_id.trim(),
    system_prompt: String(persona.system_prompt || "").trim(),
    begin_dialogs: (persona.begin_dialogs || []).map((item) => String(item)),
    tools: Array.isArray(persona.tools) ? persona.tools : null,
    skills: Array.isArray(persona.skills) ? persona.skills : null,
    custom_error_message:
      typeof persona.custom_error_message === "string" &&
      persona.custom_error_message.trim()
        ? persona.custom_error_message.trim()
        : null,
    folder_id: persona.folder_id ?? null,
    sort_order: typeof persona.sort_order === "number" ? persona.sort_order : 0,
  };
}
