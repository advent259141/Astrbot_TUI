import React from "react";
import { Box, Text } from "ink";
import type { PersonaItem } from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

export type AgentPane = "list" | "fields" | "actions";
export type AgentAction = "new" | "save" | "cancel" | "delete";
export type AgentFieldKey =
  | "persona_id"
  | "system_prompt"
  | "custom_error_message"
  | "tools"
  | "skills"
  | "begin_dialogs";

export interface AgentField {
  key: AgentFieldKey;
  label: string;
  value: unknown;
  editable: boolean;
  hint?: string;
}

export interface AgentsViewProps {
  i18n?: I18n;
  width: number;
  personas: PersonaItem[];
  visiblePersonas: PersonaItem[];
  personaWindowStart: number;
  selectedPersonaIndex: number;
  selectedAgentAction: AgentAction;
  selectedAgentFieldIndex: number;
  agentPane: AgentPane;
  selectedPersona: PersonaItem | null;
  agentFields: AgentField[];
  isEditingAgent: boolean;
  isCreatingAgent: boolean;
  editingAgentFieldKey: string | null;
  workingPersonaId: string | null;
}

type I18nParams = Parameters<I18n["t"]>[2];
type TextColor = "cyan" | "green" | "gray" | "yellow" | "red" | "white";

const STATE_WIDTH = 3;
const NAME_MIN_WIDTH = 14;
const COUNT_WIDTH = 9;
const ACTION_WIDTH = 8;

function t(
  i18n: I18n | undefined,
  key: string,
  fallback: string,
  params?: I18nParams,
): string {
  return i18n
    ? i18n.t(key, fallback, params)
    : interpolateFallback(fallback, params);
}

function interpolateFallback(value: string, params?: I18nParams): string {
  if (!params) {
    return value;
  }
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function AgentsView({
  i18n,
  width,
  personas,
  visiblePersonas,
  personaWindowStart,
  selectedPersonaIndex,
  selectedAgentAction,
  selectedAgentFieldIndex,
  agentPane,
  selectedPersona,
  agentFields,
  isEditingAgent,
  isCreatingAgent,
  editingAgentFieldKey,
  workingPersonaId,
}: AgentsViewProps) {
  const listWidth = Math.max(48, Math.min(76, Math.floor(width * 0.48)));
  const detailWidth = Math.max(30, width - listWidth - 3);
  const selectedPosition = personas.length
    ? `${Math.min(selectedPersonaIndex + 1, personas.length)}/${personas.length}`
    : "0/0";
  const meta = t(i18n, "tui.agents.meta", "{count} personas  {position}", {
    count: personas.length,
    position: selectedPosition,
  });

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{t(i18n, "features.persona.persona.personasTitle", "Personas")}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      <Box>
        <Box
          width={listWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={agentPane === "list" ? "cyan" : "gray"}
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Text bold>{t(i18n, "features.persona.persona.personasTitle", "Personas")}</Text>
            <Text
              color={agentPane === "list" && selectedAgentAction === "new" ? "cyan" : "green"}
              inverse={agentPane === "list" && selectedAgentAction === "new"}
            >
              {` ${t(i18n, "tui.common.new", "new")} `}
            </Text>
          </Box>
          <Text dimColor>{personaHeader(listWidth - 4, i18n)}</Text>
          {visiblePersonas.length ? (
            visiblePersonas.map((persona, index) => {
              const personaIndex = personaWindowStart + index;
              const isCurrent = personaIndex === selectedPersonaIndex;
              const isSelected =
                agentPane === "list" &&
                selectedAgentAction !== "new" &&
                isCurrent;
              return (
                <PersonaRow
                  key={persona.persona_id}
                  persona={persona}
                  width={listWidth - 4}
                  isSelected={isSelected}
                  isCurrent={isCurrent}
                  selectedAction={selectedAgentAction}
                  isEditingAgent={isEditingAgent && isCurrent}
                  isCreatingAgent={isCreatingAgent && isCurrent}
                  working={workingPersonaId === persona.persona_id}
                  i18n={i18n}
                />
              );
            })
          ) : (
            <Text dimColor>{t(i18n, "features.persona.empty.description", "Create your first persona to start using personalized chatbots")}</Text>
          )}
        </Box>
        <Box width={3}>
          <Text> </Text>
        </Box>
        <Box
          width={detailWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={agentPane === "fields" || agentPane === "actions" ? "cyan" : "gray"}
          paddingX={1}
        >
          {selectedPersona ? (
            <>
              <Box justifyContent="space-between">
                <Text bold>{truncateCells(selectedPersona.persona_id, Math.max(1, detailWidth - 18))}</Text>
                <Text color={isEditingAgent || isCreatingAgent ? "yellow" : "gray"}>
                  {agentModeLabel(isCreatingAgent, isEditingAgent, i18n)}
                </Text>
              </Box>
              <PersonaSummary persona={selectedPersona} width={detailWidth - 4} i18n={i18n} />
              <Box justifyContent="space-between">
                <Text bold>{t(i18n, "core.common.settings", "Settings")}</Text>
                <Text dimColor>{`${Math.min(selectedAgentFieldIndex + 1, Math.max(1, agentFields.length))}/${agentFields.length || 0}`}</Text>
              </Box>
              {agentFields.length ? (
                agentFields.map((field, index) => (
                  <AgentFieldLine
                    key={field.key}
                    field={field}
                    isSelected={agentPane === "fields" && index === selectedAgentFieldIndex}
                    isEditing={editingAgentFieldKey === field.key}
                    width={detailWidth - 4}
                    i18n={i18n}
                  />
                ))
              ) : (
                <Text dimColor>{t(i18n, "tui.agents.emptySettings", "No editable persona settings.")}</Text>
              )}
            </>
          ) : (
            <Text dimColor>{t(i18n, "tui.agents.selectPersona", "Select a persona.")}</Text>
          )}
        </Box>
      </Box>
      <Text dimColor>
        {truncateCells(
          agentFooterLine({
            agentPane,
            selectedAgentAction,
            selectedPersona,
            selectedField: agentFields[selectedAgentFieldIndex],
            isEditingAgent,
            isCreatingAgent,
            editingAgentFieldKey,
            i18n,
          }),
          width,
        )}
      </Text>
    </>
  );
}

function PersonaRow({
  persona,
  width,
  isSelected,
  isCurrent,
  selectedAction,
  isEditingAgent,
  isCreatingAgent,
  working,
  i18n,
}: {
  persona: PersonaItem;
  width: number;
  isSelected: boolean;
  isCurrent: boolean;
  selectedAction: AgentAction;
  isEditingAgent: boolean;
  isCreatingAgent: boolean;
  working: boolean;
  i18n?: I18n;
}) {
  const layout = personaTableLayout(width);
  const marker = `${isSelected ? ">" : " "} `;
  const stateLabel = working
    ? "..."
    : isCreatingAgent
      ? "+"
      : isEditingAgent
        ? "*"
        : " ";
  const tools = personaToolsLabel(persona.tools, i18n);
  const skills = personaSkillsLabel(persona.skills, i18n);
  const primaryLabel = isCreatingAgent || isEditingAgent
    ? t(i18n, "features.persona.buttons.save", "Save")
    : "";
  const dangerLabel = isCreatingAgent || isEditingAgent
    ? t(i18n, "features.persona.buttons.cancel", "Cancel")
    : t(i18n, "features.persona.buttons.delete", "Delete");
  const primarySelected = isSelected && selectedAction === "save";
  const dangerAction: AgentAction = isCreatingAgent || isEditingAgent ? "cancel" : "delete";
  const dangerSelected = isSelected && selectedAction === dangerAction;

  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : isCurrent ? "green" : undefined}>{marker}</Text>
      <Text color={stateLabel === "..." ? "yellow" : stateLabel === " " ? "gray" : "cyan"}>
        {padRightCells(stateLabel, STATE_WIDTH)}
      </Text>
      <Text color={isSelected ? "cyan" : undefined}>
        {padRightCells(truncateCells(persona.persona_id, layout.nameWidth), layout.nameWidth)}
      </Text>
      <Text color={tools === "*" ? "green" : "gray"}>
        {padRightCells(truncateCells(tools, COUNT_WIDTH), COUNT_WIDTH)}
      </Text>
      <Text color={skills === "*" ? "green" : "gray"}>
        {padRightCells(truncateCells(skills, COUNT_WIDTH), COUNT_WIDTH)}
      </Text>
      <Text color={primarySelected ? "cyan" : "yellow"} inverse={primarySelected}>
        {padRightCells(truncateCells(primaryLabel, ACTION_WIDTH), ACTION_WIDTH)}
      </Text>
      <Text color={dangerAction === "delete" ? "red" : "yellow"} inverse={dangerSelected}>
        {padRightCells(truncateCells(dangerAction === "delete" ? "X" : dangerLabel, ACTION_WIDTH), ACTION_WIDTH)}
      </Text>
    </Box>
  );
}

function PersonaSummary({
  persona,
  width,
  i18n,
}: {
  persona: PersonaItem;
  width: number;
  i18n?: I18n;
}) {
  return (
    <>
      <DetailLine
        label={t(i18n, "features.persona.form.tools", "Tool Selection")}
        value={toolSelectionDetail(persona.tools, true, i18n)}
        width={width}
        color={persona.tools === null || persona.tools === undefined ? "green" : "cyan"}
      />
      <DetailLine
        label={t(i18n, "features.persona.form.skills", "Skills Selection")}
        value={toolSelectionDetail(persona.skills, false, i18n)}
        width={width}
        color={persona.skills === null || persona.skills === undefined ? "green" : "cyan"}
      />
      <DetailLine
        label={t(i18n, "features.persona.labels.presetDialogs", "Preset Dialogs ({count} pairs)", {
          count: Math.floor((persona.begin_dialogs?.length || 0) / 2),
        })}
        value={`${persona.begin_dialogs?.length || 0}`}
        width={width}
        color={(persona.begin_dialogs?.length || 0) > 0 ? "cyan" : "gray"}
      />
      <Text> </Text>
    </>
  );
}

function DetailLine({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: number;
  color: TextColor;
}) {
  const labelWidth = Math.min(22, Math.max(12, Math.floor(width * 0.34)));
  const valueWidth = Math.max(1, width - labelWidth - 2);
  return (
    <Box width={width}>
      <Text color="gray">{padRightCells(truncateCells(label, labelWidth), labelWidth)}</Text>
      <Text>  </Text>
      <Text color={color}>{padRightCells(truncateCells(value, valueWidth), valueWidth)}</Text>
    </Box>
  );
}

function AgentFieldLine({
  field,
  isSelected,
  isEditing,
  width,
  i18n,
}: {
  field: AgentField;
  isSelected: boolean;
  isEditing: boolean;
  width: number;
  i18n?: I18n;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const active = isSelected || isEditing;
  const gap = "  ";
  const labelWidth = Math.min(24, Math.max(14, Math.floor(width * 0.34)));
  const valueWidth = Math.max(
    1,
    width - terminalWidth(marker) - labelWidth - terminalWidth(gap),
  );
  const valueText = personaValueLabel(field, valueWidth, i18n);
  return (
    <Box width={width}>
      <Text color={active ? "cyan" : undefined}>{marker}</Text>
      <Text color={active ? "cyan" : field.editable ? "gray" : "yellow"} inverse={active}>
        {padRightCells(truncateCells(field.label, labelWidth), labelWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "white" : field.editable ? "yellow" : "gray"} inverse={active}>
        {padRightCells(truncateCells(valueText, valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function personaHeader(width: number, i18n?: I18n): string {
  const layout = personaTableLayout(width);
  const stateHeader = padRightCells(`  ${t(i18n, "tui.common.stateShort", "S")}`, 2 + STATE_WIDTH);
  const nameHeader = padRightCells(
    t(i18n, "features.persona.form.personaId", "Persona ID"),
    layout.nameWidth,
  );
  const toolsHeader = padRightCells(t(i18n, "tui.agents.table.tools", "Tools"), COUNT_WIDTH);
  const skillsHeader = padRightCells(t(i18n, "tui.agents.table.skills", "Skills"), COUNT_WIDTH);
  const editHeader = padRightCells("", ACTION_WIDTH);
  const deleteHeader = padRightCells(t(i18n, "tui.common.deleteShort", "X"), ACTION_WIDTH);
  return truncateCells(
    `${stateHeader}${nameHeader}${toolsHeader}${skillsHeader}${editHeader}${deleteHeader}`,
    width,
  );
}

function personaTableLayout(width: number): { nameWidth: number } {
  const fixed = 2 + STATE_WIDTH + COUNT_WIDTH * 2 + ACTION_WIDTH * 2;
  return {
    nameWidth: Math.max(NAME_MIN_WIDTH, width - fixed),
  };
}

function agentModeLabel(
  isCreatingAgent: boolean,
  isEditingAgent: boolean,
  i18n?: I18n,
): string {
  if (isCreatingAgent) {
    return t(i18n, "features.persona.dialog.create.title", "Create New Persona");
  }
  if (isEditingAgent) {
    return t(i18n, "features.persona.dialog.edit.title", "Edit Persona");
  }
  return t(i18n, "features.persona.page.description", "Manage and configure chat bot personality settings");
}

function agentFooterLine({
  agentPane,
  selectedAgentAction,
  selectedPersona,
  selectedField,
  isEditingAgent,
  isCreatingAgent,
  editingAgentFieldKey,
  i18n,
}: {
  agentPane: AgentPane;
  selectedAgentAction: AgentAction;
  selectedPersona: PersonaItem | null;
  selectedField?: AgentField;
  isEditingAgent: boolean;
  isCreatingAgent: boolean;
  editingAgentFieldKey: string | null;
  i18n?: I18n;
}): string {
  if (editingAgentFieldKey) {
    return t(i18n, "tui.agents.footer.editing", "Editing {key}. Enter saves, Esc cancels.", {
      key: selectedField?.label || editingAgentFieldKey,
    });
  }
  if (agentPane === "fields") {
    if (!selectedField) {
      return t(i18n, "tui.agents.footer.fields", "Enter edits the selected persona setting. Left returns to list.");
    }
    if (!selectedField.editable) {
      return t(i18n, "tui.agents.footer.readonly", "{key} is read-only.", {
        key: selectedField.label,
      });
    }
    return t(i18n, "tui.agents.footer.fieldSelected", "{key}  Enter edits. Left returns to list.", {
      key: selectedField.label,
    });
  }
  if (selectedAgentAction === "new") {
    return t(i18n, "tui.agents.footer.new", "Enter creates a draft persona.");
  }
  if (!selectedPersona) {
    return t(i18n, "tui.agents.selectPersona", "Select a persona.");
  }
  if (isCreatingAgent || isEditingAgent) {
    if (selectedAgentAction === "save") {
      return t(i18n, "tui.agents.footer.save", "{id}  Enter saves changes.", {
        id: selectedPersona.persona_id,
      });
    }
    if (selectedAgentAction === "cancel") {
      return t(i18n, "tui.agents.footer.cancel", "{id}  Enter cancels editing.", {
        id: selectedPersona.persona_id,
      });
    }
  }
  return t(i18n, "tui.agents.footer.delete", "{id}  Enter twice deletes.", {
    id: selectedPersona.persona_id,
  });
}

function personaValueLabel(
  field: AgentField,
  width: number,
  i18n?: I18n,
): string {
  if (field.key === "tools") {
    return toolSelectionDetail(field.value, true, i18n);
  }
  if (field.key === "skills") {
    return toolSelectionDetail(field.value, false, i18n);
  }
  if (field.key === "begin_dialogs") {
    return dialogValueLabel(field.value, i18n);
  }
  const value = field.value;
  if (value === null || value === undefined || value === "") {
    return t(i18n, "tui.common.none", "N/A");
  }
  return truncateCells(String(value).replace(/\s+/g, " "), width);
}

function personaToolsLabel(value: unknown, i18n?: I18n): string {
  if (value === null || value === undefined) {
    return "*";
  }
  if (Array.isArray(value)) {
    return t(i18n, "tui.agents.count", "{count}", { count: value.length });
  }
  return "?";
}

function personaSkillsLabel(value: unknown, i18n?: I18n): string {
  if (value === null || value === undefined) {
    return "*";
  }
  if (Array.isArray(value)) {
    return t(i18n, "tui.agents.count", "{count}", { count: value.length });
  }
  return "?";
}

function toolSelectionDetail(value: unknown, tools: boolean, i18n?: I18n): string {
  if (value === null || value === undefined) {
    return tools
      ? t(i18n, "features.persona.form.allToolsAvailable", "Use all available tools")
      : t(i18n, "features.persona.form.allSkillsAvailable", "Use all available Skills");
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.join(", ");
  }
  return tools
    ? t(i18n, "features.persona.form.noToolsSelected", "No tools selected")
    : t(i18n, "features.persona.form.noSkillsSelected", "No skills selected");
}

function dialogValueLabel(value: unknown, i18n?: I18n): string {
  const count = Array.isArray(value) ? value.length : 0;
  if (!count) {
    return t(i18n, "tui.common.none", "N/A");
  }
  return t(i18n, "features.persona.labels.presetDialogs", "Preset Dialogs ({count} pairs)", {
    count: Math.floor(count / 2),
  });
}

export function buildAgentFields(
  persona: PersonaItem | null,
  isCreating: boolean,
  i18n?: I18n,
): AgentField[] {
  if (!persona) {
    return [];
  }
  return [
    {
      key: "persona_id",
      label: t(i18n, "features.persona.form.personaId", "Persona ID"),
      value: persona.persona_id,
      editable: isCreating,
      hint: t(i18n, "features.persona.validation.alphanumeric", "Only letters, numbers, underscores and hyphens are allowed"),
    },
    {
      key: "system_prompt",
      label: t(i18n, "features.persona.form.systemPrompt", "System Prompt"),
      value: persona.system_prompt || "",
      editable: true,
      hint: t(i18n, "features.persona.validation.required", "This field is required"),
    },
    {
      key: "custom_error_message",
      label: t(i18n, "features.persona.form.customErrorMessage", "Custom Error Reply Message (Optional)"),
      value: persona.custom_error_message || "",
      editable: true,
      hint: t(i18n, "features.persona.form.customErrorMessageHelp", "Leave empty to use the default error message."),
    },
    {
      key: "tools",
      label: t(i18n, "features.persona.form.tools", "Tool Selection"),
      value: persona.tools ?? null,
      editable: true,
      hint: t(i18n, "tui.agents.hints.selectionList", "Use * for all, empty for none, or comma-separated names."),
    },
    {
      key: "skills",
      label: t(i18n, "features.persona.form.skills", "Skills Selection"),
      value: persona.skills ?? null,
      editable: true,
      hint: t(i18n, "tui.agents.hints.selectionList", "Use * for all, empty for none, or comma-separated names."),
    },
    {
      key: "begin_dialogs",
      label: t(i18n, "features.persona.form.presetDialogs", "Preset Dialogs"),
      value: persona.begin_dialogs || [],
      editable: true,
      hint: t(i18n, "tui.agents.hints.dialogs", "JSON array or lines split by |. Must contain user/assistant pairs."),
    },
  ];
}
