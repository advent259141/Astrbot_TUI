import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type {
  ProviderCheckResult,
  ProviderConfig,
  ProviderSourceConfig,
  ProviderTemplatePayload,
} from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import {
  padLeftCells,
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

export type ProviderPane = "tabs" | "sources" | "settings" | "models";
export type ProviderSourceAction = "new" | "switch" | "models" | "delete";
export type ProviderModelAction = "new" | "switch" | "config" | "test" | "delete" | "add";
export type ProviderModelEntryType = "configured" | "available";
export type ProviderType =
  | "chat_completion"
  | "agent_runner"
  | "speech_to_text"
  | "text_to_speech"
  | "embedding"
  | "rerank";

export interface ProviderRow {
  provider: ProviderConfig;
  source?: ProviderSourceConfig;
  providerType: ProviderType;
}

export interface AvailableProviderModel {
  name: string;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderModelEntry {
  type: ProviderModelEntryType;
  id: string;
  provider?: ProviderConfig;
  row?: ProviderRow;
  model: string;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderSourceSetting {
  key: string;
  value: unknown;
}

type TextColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray";
type ProviderTextValues = Record<string, string | number>;

const COMPONENT_STATE_WIDTH = 6;
const COMPONENT_HEADER_STATE_WIDTH = 2 + COMPONENT_STATE_WIDTH;
const PROVIDER_CONFIG_ACTION_WIDTH = 8;
const PROVIDER_TEST_ACTION_WIDTH = 7;
const PROVIDER_DELETE_ACTION_WIDTH = 6;
const PROVIDER_CONFIG_ICON = "⚙";
const PROVIDER_TEST_IDLE_MARK = "o";
const PROVIDER_TEST_FRAMES = ["-", "\\", "|", "/"];

export const PROVIDER_TYPES: ProviderType[] = [
  "chat_completion",
  "agent_runner",
  "speech_to_text",
  "text_to_speech",
  "embedding",
  "rerank",
];

export interface ProvidersViewProps {
  width: number;
  i18n?: I18n;
  providerTemplate: ProviderTemplatePayload | null;
  providerType: ProviderType;
  providerPane: ProviderPane;
  providerRows: ProviderRow[];
  providerSources: ProviderSourceConfig[];
  selectedProviderRows: ProviderRow[];
  selectedProviderEntries: ProviderModelEntry[];
  selectedProviderSource: ProviderSourceConfig | null;
  selectedProviderSourceIndex: number;
  selectedProviderSourceSettingIndex: number;
  selectedProviderIndex: number;
  selectedProviderSourceAction: ProviderSourceAction;
  selectedProviderModelAction: ProviderModelAction;
  visibleProviderSources: ProviderSourceConfig[];
  visibleProviderEntries: ProviderModelEntry[];
  providerSourceWindowStart: number;
  providerWindowStart: number;
  providerStatuses: Record<string, ProviderCheckResult>;
  testingProviderId: string | null;
  providerSourceModels: Record<string, AvailableProviderModel[]>;
  loadingProviderSourceModelsId: string | null;
  editingProviderSourceSettingKey: string | null;
}

export function ProvidersView({
  width,
  i18n,
  providerTemplate,
  providerType,
  providerPane,
  providerRows,
  providerSources,
  selectedProviderRows,
  selectedProviderEntries,
  selectedProviderSource,
  selectedProviderSourceIndex,
  selectedProviderSourceSettingIndex,
  selectedProviderIndex,
  selectedProviderSourceAction,
  selectedProviderModelAction,
  visibleProviderSources,
  visibleProviderEntries,
  providerSourceWindowStart,
  providerWindowStart,
  providerStatuses,
  testingProviderId,
  providerSourceModels,
  loadingProviderSourceModelsId,
  editingProviderSourceSettingKey,
}: ProvidersViewProps) {
  const testingFrame = useTestingFrame(testingProviderId);
  const providerUsesSourceLayout = providerType === "chat_completion";
  const providerSourceWidth = Math.max(42, Math.min(64, Math.floor(width * 0.45)));
  const providerMainWidth = Math.max(28, width - providerSourceWidth - 3);
  const selectedEntry = selectedProviderEntries[selectedProviderIndex] || null;
  const selectedProvider = selectedEntry?.provider || null;
  const providerSourceSettings = selectedProviderSource
    ? buildProviderSourceSettings(selectedProviderSource)
    : [];
  const currentProviderTypeLabel = providerTypeLabel(providerType, i18n);
  const providersMeta = !providerTemplate
    ? providerText(i18n, "tui.providers.meta.loading", "loading providers")
    : providerUsesSourceLayout
      ? providerText(
        i18n,
        "tui.providers.meta.sourceLayout",
        "{type}  sources {sourceCurrent}/{sourceTotal}  models {modelCurrent}/{modelTotal}",
        {
          type: currentProviderTypeLabel,
          sourceCurrent: Math.min(selectedProviderSourceIndex + 1, Math.max(1, providerSources.length)),
          sourceTotal: providerSources.length || 0,
          modelCurrent: selectedProviderEntries.length ? selectedProviderIndex + 1 : 0,
          modelTotal: selectedProviderEntries.length,
        },
      )
      : providerText(
        i18n,
        "tui.providers.meta.flatLayout",
        "{type}  {current}/{total}",
        {
          type: currentProviderTypeLabel,
          current: selectedProviderEntries.length ? selectedProviderIndex + 1 : 0,
          total: selectedProviderEntries.length,
        },
      );
  const footerLine = providerFooterLine({
    i18n,
    editingProviderSourceSettingKey,
    providerPane,
    providerSourceSettings,
    selectedProviderSourceSettingIndex,
    selectedEntry,
    selectedProvider,
    selectedProviderModelAction,
    providerType,
    providerStatuses,
    testingProviderId,
    providerUsesSourceLayout,
    selectedProviderSourceAction,
    loadingProviderSourceModelsId,
    selectedProviderSource,
  });

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{providerText(i18n, "features.provider.title", "Providers")}</Text>
        <Text dimColor>{providersMeta}</Text>
      </Box>
      <Box>
        {PROVIDER_TYPES.map((type) => (
          <Text
            key={type}
            color={providerType === type ? "cyan" : undefined}
            inverse={providerPane === "tabs" && providerType === type}
          >
            {` ${providerTypeLabel(type, i18n)} `}
          </Text>
        ))}
        <Text dimColor>
          {providerUsesSourceLayout
            ? providerText(i18n, "tui.providers.help.sourceTabs", "  Up to tabs  Down back  Left/Right in tabs")
            : providerText(i18n, "tui.providers.help.flatTabs", "  Up to tabs  Down back  Enter edits")}
        </Text>
      </Box>
      {providerUsesSourceLayout ? (
        <Box>
          <Box
            width={providerSourceWidth}
            flexDirection="column"
            borderStyle="single"
            borderColor={providerPane === "sources" || providerPane === "tabs" ? "cyan" : "gray"}
            paddingX={1}
          >
            <Box justifyContent="space-between">
              <Box>
                <Text bold>{providerText(i18n, "features.provider.providerSources.title", "Provider Sources")}</Text>
                <Text> </Text>
                <Text
                  color={selectedProviderSourceAction === "new" && providerPane === "sources" ? "cyan" : "green"}
                  inverse={selectedProviderSourceAction === "new" && providerPane === "sources"}
                >
                  {providerText(i18n, "tui.providers.actions.newPadded", " new ")}
                </Text>
              </Box>
              <Text dimColor>{providerSources.length}</Text>
            </Box>
            {visibleProviderSources.length ? (
              visibleProviderSources.map((source, index) => {
                const sourceIndex = providerSourceWindowStart + index;
                const isCurrent = sourceIndex === selectedProviderSourceIndex;
                const isSelected =
                  providerPane === "sources" &&
                  selectedProviderSourceAction !== "new" &&
                  isCurrent;
                const count = providerRows.filter(
                  (row) => row.provider.provider_source_id === source.id,
                ).length;
                const rowWidth = providerSourceWidth - 4;
                const marker = `${isSelected ? ">" : " "} `;
                const switchSelected = isSelected && selectedProviderSourceAction === "switch";
                const modelsSelected = isSelected && selectedProviderSourceAction === "models";
                const deleteSelected = isSelected && selectedProviderSourceAction === "delete";
                const state = padRightCells(
                  source.enable === false
                    ? providerText(i18n, "tui.common.off", "off")
                    : providerText(i18n, "tui.common.on", "on"),
                  5,
                );
                const modelCountText = padLeftCells(
                  loadingProviderSourceModelsId === source.id ? "..." : String(count),
                  4,
                );
                const deleteText = providerText(i18n, "tui.providers.actions.deletePadded", "  X");
                const nameWidth = Math.max(
                  1,
                  rowWidth
                    - terminalWidth(marker)
                    - terminalWidth(state)
                    - terminalWidth(modelCountText)
                    - terminalWidth(deleteText)
                );
                const sourceName = padRightCells(truncateCells(source.id, nameWidth), nameWidth);
                return (
                  <Box key={source.id} width={rowWidth}>
                    <Text color={isSelected ? "cyan" : isCurrent ? "green" : undefined}>
                      {marker}
                    </Text>
                    <Text
                      color={switchSelected ? "cyan" : source.enable === false ? "red" : "green"}
                      inverse={switchSelected}
                    >
                      {state}
                    </Text>
                    <Text
                      color={isSelected ? "cyan" : source.enable === false ? "gray" : undefined}
                      inverse={false}
                    >
                      {sourceName}
                    </Text>
                    <Text
                      color={modelsSelected ? "cyan" : "yellow"}
                      inverse={modelsSelected}
                    >
                      {modelCountText}
                    </Text>
                    <Text
                      color="red"
                      inverse={deleteSelected}
                    >
                      {deleteText}
                    </Text>
                  </Box>
                );
              })
            ) : (
              <Text dimColor>{providerText(i18n, "tui.providers.empty.sources", "No provider sources.")}</Text>
            )}
          </Box>
          <Box width={3}>
            <Text> </Text>
          </Box>
          <Box
            width={providerMainWidth}
            flexDirection="column"
            borderStyle="single"
            borderColor={providerPane === "settings" || providerPane === "models" ? "cyan" : "gray"}
            paddingX={1}
          >
            {selectedProviderSource ? (
              <>
                <Box justifyContent="space-between">
                  <Text bold>{truncateCells(selectedProviderSource.id, Math.max(1, providerMainWidth - 18))}</Text>
                  <Text dimColor>{truncateCells(providerSourceKind(selectedProviderSource, i18n), 12)}</Text>
                </Box>
                <Box justifyContent="space-between">
                  <Text bold>{providerText(i18n, "features.provider.providers.settings", "Settings")}</Text>
                  <Text dimColor>{providerSourceSettings.length}</Text>
                </Box>
                {providerSourceSettings.length ? (
                  providerSourceSettings.map((setting, index) => (
                    <ProviderSourceSettingLine
                      key={setting.key}
                      setting={setting}
                      isSelected={
                        providerPane === "settings" &&
                        index === selectedProviderSourceSettingIndex
                      }
                      isEditing={editingProviderSourceSettingKey === setting.key}
                      width={providerMainWidth - 4}
                      i18n={i18n}
                    />
                  ))
                ) : (
                  <Text dimColor>{providerText(i18n, "tui.providers.empty.sourceSettings", "No editable source settings.")}</Text>
                )}
                <Text> </Text>
                <Box justifyContent="space-between">
                  <Text bold>{providerText(i18n, "features.provider.models.configured", "Configured Models")}</Text>
                  <Text dimColor>{selectedProviderRows.length}</Text>
                </Box>
                <Text dimColor>{formatProviderHeader(providerMainWidth - 4, true, i18n)}</Text>
                {visibleProviderEntries.length ? (
                  visibleProviderEntries.map((entry, index) => {
                    const providerIndex = providerWindowStart + index;
                    const isSelected =
                      providerPane === "models" &&
                      providerIndex === selectedProviderIndex;
                    const previousEntry = selectedProviderEntries[providerIndex - 1];
                    const showAvailableHeader =
                      entry.type === "available" && previousEntry?.type !== "available";
                    if (entry.type === "available") {
                      const addSelected = isSelected && selectedProviderModelAction === "add";
                      return (
                        <React.Fragment key={entry.id}>
                          {showAvailableHeader ? (
                            <>
                              <Text> </Text>
                              <Box justifyContent="space-between">
                                <Text bold>{providerText(i18n, "features.provider.models.available", "Available Models")}</Text>
                                <Text dimColor>
                                  {Math.max(0, selectedProviderEntries.length - selectedProviderRows.length)}
                                </Text>
                              </Box>
                            </>
                          ) : null}
                          <AvailableModelRowLine
                            entry={entry}
                            isSelected={isSelected}
                            addSelected={addSelected}
                            width={providerMainWidth - 4}
                            i18n={i18n}
                          />
                        </React.Fragment>
                      );
                    }
                    const row = entry.row;
                    if (!row) {
                      return null;
                    }
                    const cells = formatProviderCells(row, {
                        isSelected,
                        status: providerStatuses[row.provider.id],
                        testing: testingProviderId === row.provider.id,
                        testingFrame,
                        width: providerMainWidth - 4,
                        omitSource: true,
                        selectedAction: selectedProviderModelAction,
                        i18n,
                      });
                      return (
                        <ProviderRowLine
                          key={row.provider.id}
                          row={row}
                          cells={cells}
                          isSelected={isSelected}
                          status={providerStatuses[row.provider.id]}
                          width={providerMainWidth - 4}
                          omitSource
                          selectedAction={selectedProviderModelAction}
                        />
                      );
                  })
                ) : (
                  <Text dimColor>
                    {loadingProviderSourceModelsId === selectedProviderSource.id
                      ? providerText(i18n, "tui.providers.loading.availableModels", "Fetching available models...")
                      : providerText(i18n, "tui.providers.empty.sourceModels", "No models under this source. Select models on the source row to fetch.")}
                  </Text>
                )}
              </>
            ) : (
              <Text dimColor>{providerText(i18n, "tui.providers.empty.selectSource", "Select a provider source.")}</Text>
            )}
          </Box>
        </Box>
      ) : (
        <>
          <Box justifyContent="space-between">
            <Box>
              <Text bold>
                {providerText(
                  i18n,
                  "tui.providers.sections.typedProviders",
                  "{type} Providers",
                  { type: currentProviderTypeLabel },
                )}
              </Text>
              <Text> </Text>
              <Text
                color={selectedProviderModelAction === "new" && providerPane === "models" ? "cyan" : "green"}
                inverse={selectedProviderModelAction === "new" && providerPane === "models"}
              >
                {providerText(i18n, "tui.providers.actions.newPadded", " new ")}
              </Text>
            </Box>
            <Text dimColor>{selectedProviderEntries.length}</Text>
          </Box>
          <Text dimColor>{formatProviderHeader(width, false, i18n)}</Text>
          {visibleProviderEntries.length ? (
            visibleProviderEntries.map((entry, index) => {
              const row = entry.row;
              if (!row) {
                return null;
              }
              const providerIndex = providerWindowStart + index;
              const isSelected = providerIndex === selectedProviderIndex;
              const cells = formatProviderCells(row, {
                isSelected,
                status: providerStatuses[row.provider.id],
                testing: testingProviderId === row.provider.id,
                testingFrame,
                width,
                selectedAction: selectedProviderModelAction,
                i18n,
              });
              return (
                <ProviderRowLine
                  key={entry.id}
                  row={row}
                  cells={cells}
                  isSelected={isSelected}
                  status={providerStatuses[row.provider.id]}
                  width={width}
                  selectedAction={selectedProviderModelAction}
                />
              );
            })
          ) : (
            <Text dimColor>
              {providerText(
                i18n,
                "tui.providers.empty.typedProviders",
                "No {type} providers.",
                { type: currentProviderTypeLabel },
              )}
            </Text>
          )}
        </>
      )}
      <Text dimColor>
        {truncateCells(footerLine, width)}
      </Text>
    </>
  );
}

function ProviderSourceSettingLine({
  setting,
  isSelected,
  isEditing,
  width,
  i18n,
}: {
  setting: ProviderSourceSetting;
  isSelected: boolean;
  isEditing: boolean;
  width: number;
  i18n?: I18n;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const active = isSelected || isEditing;
  const keyWidth = Math.min(18, Math.max(10, Math.floor(width * 0.28)));
  const valueText = providerConfigValueLabel(setting.value, i18n);
  const valueWidth = Math.max(
    1,
    width - terminalWidth(marker) - keyWidth,
  );
  return (
    <Box width={width}>
      <Text color={active ? "cyan" : undefined} inverse={active}>
        {marker}
      </Text>
      <Text color={active ? "cyan" : undefined} inverse={active}>
        {padRightCells(truncateCells(setting.key, keyWidth), keyWidth)}
      </Text>
      <Text color={active ? "cyan" : undefined} inverse={active}>
        {padRightCells(truncateCells(valueText, valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function AvailableModelRowLine({
  entry,
  isSelected,
  addSelected,
  width,
  i18n,
}: {
  entry: ProviderModelEntry;
  isSelected: boolean;
  addSelected: boolean;
  width: number;
  i18n?: I18n;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const addText = providerText(i18n, "tui.providers.actions.addPadded", " +");
  const meta = providerMetadataLabel(entry.metadata, i18n);
  const metaWidth = meta ? Math.min(18, Math.max(8, Math.floor(width * 0.25))) : 0;
  const modelWidth = Math.max(
    1,
    width - terminalWidth(marker) - terminalWidth(addText) - metaWidth,
  );
  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : undefined}>{marker}</Text>
      <Text color={isSelected ? "cyan" : undefined}>
        {padRightCells(truncateCells(entry.model, modelWidth), modelWidth)}
      </Text>
      {metaWidth ? (
        <Text dimColor={!isSelected} color={isSelected ? "cyan" : undefined}>
          {padRightCells(truncateCells(meta, metaWidth), metaWidth)}
        </Text>
      ) : null}
      <Text color={addSelected ? "cyan" : "green"} inverse={addSelected}>
        {addText}
      </Text>
    </Box>
  );
}

export function buildProviderModelEntries(
  selectedRows: ProviderRow[],
  availableModels: AvailableProviderModel[],
  sourceId?: string,
): ProviderModelEntry[] {
  const configuredModels = new Set(
    selectedRows.map((row) => row.provider.model).filter(Boolean),
  );
  const configuredEntries: ProviderModelEntry[] = selectedRows.map((row) => ({
    type: "configured",
    id: `configured:${row.provider.id}`,
    provider: row.provider,
    row,
    model: row.provider.model || row.provider.id || "-",
  }));
  const availableEntries: ProviderModelEntry[] = availableModels
    .filter((model) => !configuredModels.has(model.name))
    .map((model) => ({
      type: "available",
      id: `available:${sourceId || ""}:${model.name}`,
      model: model.name,
      metadata: model.metadata || null,
    }));
  return [...configuredEntries, ...availableEntries];
}

function providerEntryDetailLine(
  entry: ProviderModelEntry,
  status?: ProviderCheckResult,
  action?: ProviderModelAction,
  i18n?: I18n,
): string {
  if (entry.type === "available") {
    return [
      entry.model,
      providerText(i18n, "tui.providers.detail.enterAdd", "Enter: add"),
      providerMetadataLabel(entry.metadata, i18n),
    ].filter(Boolean).join("  ");
  }
  const provider = entry.provider;
  return provider
            ? providerDetailLine(
                provider,
                status,
                action,
                i18n,
              )
            : "";
}

function providerFooterLine({
  i18n,
  editingProviderSourceSettingKey,
  providerPane,
  providerSourceSettings,
  selectedProviderSourceSettingIndex,
  selectedEntry,
  selectedProvider,
  selectedProviderModelAction,
  providerType,
  providerStatuses,
  testingProviderId,
  providerUsesSourceLayout,
  selectedProviderSourceAction,
  loadingProviderSourceModelsId,
  selectedProviderSource,
}: {
  i18n?: I18n;
  editingProviderSourceSettingKey: string | null;
  providerPane: ProviderPane;
  providerSourceSettings: ProviderSourceSetting[];
  selectedProviderSourceSettingIndex: number;
  selectedEntry: ProviderModelEntry | null;
  selectedProvider: ProviderConfig | null;
  selectedProviderModelAction: ProviderModelAction;
  providerType: ProviderType;
  providerStatuses: Record<string, ProviderCheckResult>;
  testingProviderId: string | null;
  providerUsesSourceLayout: boolean;
  selectedProviderSourceAction: ProviderSourceAction;
  loadingProviderSourceModelsId: string | null;
  selectedProviderSource: ProviderSourceConfig | null;
}): string {
  if (editingProviderSourceSettingKey) {
    return providerText(
      i18n,
      "tui.providers.footer.editingSourceSetting",
      "Editing {key}. Enter saves, Esc cancels.",
      { key: editingProviderSourceSettingKey },
    );
  }
  if (providerPane === "settings") {
    const selectedSetting = providerSourceSettings[selectedProviderSourceSettingIndex];
    return selectedSetting
      ? providerText(
        i18n,
        "tui.providers.footer.selectedSourceSetting",
        "{key}  Enter edits. Left returns to sources, Right moves to models.",
        { key: selectedSetting.key },
      )
      : providerText(
        i18n,
        "tui.providers.footer.sourceSettingHelp",
        "Enter edits the selected source setting. Left returns to sources, Right moves to models.",
      );
  }
  if (providerPane === "models" && selectedEntry) {
    if (selectedProviderModelAction === "new") {
      return providerText(
        i18n,
        "tui.providers.footer.createTypedProvider",
        "Enter creates a {type} provider.",
        { type: providerTypeLabel(providerType, i18n) },
      );
    }
    if (testingProviderId === selectedProvider?.id) {
      return providerText(
        i18n,
        "tui.providers.footer.testingProvider",
        "Testing provider {id}...",
        { id: selectedProvider.id },
      );
    }
    return providerEntryDetailLine(
      selectedEntry,
      selectedProvider ? providerStatuses[selectedProvider.id] : undefined,
      selectedProviderModelAction,
      i18n,
    );
  }
  if (!providerUsesSourceLayout && providerPane === "models" && selectedProviderModelAction === "new") {
    return providerText(
      i18n,
      "tui.providers.footer.createTypedProvider",
      "Enter creates a {type} provider.",
      { type: providerTypeLabel(providerType, i18n) },
    );
  }
  if (providerPane === "sources") {
    return selectedProviderSourceAction === "new"
      ? providerText(
        i18n,
        "tui.providers.footer.createSource",
        "Enter creates a new provider source.",
      )
      : providerText(
        i18n,
        "tui.providers.footer.sourceActions",
        "Left/Right selects on/off, model count, or X. Enter runs the selected source action.",
      );
  }
  if (loadingProviderSourceModelsId === selectedProviderSource?.id) {
    return providerText(i18n, "tui.providers.loading.availableModels", "Fetching available models...");
  }
  return providerText(
    i18n,
    "tui.providers.footer.modelActions",
    "Left/Right selects row actions. Enter runs the selected model action.",
  );
}

function ProviderRowLine({
  row,
  cells,
  isSelected,
  status,
  width,
  omitSource = false,
  selectedAction,
}: {
  row: ProviderRow;
  cells: ReturnType<typeof formatProviderCells>;
  isSelected: boolean;
  status?: ProviderCheckResult;
  width: number;
  omitSource?: boolean;
  selectedAction: ProviderModelAction;
}) {
  const switchSelected = isSelected && selectedAction === "switch";
  const configSelected = isSelected && selectedAction === "config";
  const testSelected = isSelected && selectedAction === "test";
  const deleteSelected = isSelected && selectedAction === "delete";
  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : undefined}>
        {cells.marker}
      </Text>
      <Text
        color={switchSelected ? "cyan" : providerEnabled(row.provider) ? "green" : "red"}
        inverse={switchSelected}
      >
        {cells.state}
      </Text>
      {omitSource ? null : (
        <Text color={isSelected ? "cyan" : providerEnabled(row.provider) ? undefined : "gray"} inverse={false}>
          {cells.source}
        </Text>
      )}
      <Text color={isSelected ? "cyan" : providerEnabled(row.provider) ? undefined : "gray"} inverse={false}>
        {cells.model}
      </Text>
      <Text color={isSelected ? "cyan" : providerStatusColor(status)}>
        {cells.status}
      </Text>
      <Text color={configSelected ? "cyan" : "magenta"} inverse={configSelected}>
        {cells.config}
      </Text>
      <Text color={providerTestColor(status, cells.testing)} inverse={testSelected}>
        {cells.test}
      </Text>
      <Text color="red" inverse={deleteSelected}>
        {cells.delete}
      </Text>
    </Box>
  );
}

export function buildProviderRows(
  payload: ProviderTemplatePayload | null,
  providerType: ProviderType,
): ProviderRow[] {
  if (!payload) {
    return [];
  }
  const sourceById = new Map(
    payload.provider_sources.map((source) => [source.id, source]),
  );
  return payload.providers
    .map((provider) => {
      const source = provider.provider_source_id
        ? sourceById.get(provider.provider_source_id)
        : undefined;
      return {
        provider,
        source,
        providerType: providerTypeForProvider(provider, source),
      };
    })
    .filter((row) => row.providerType === providerType);
}

export function buildProviderSources(
  payload: ProviderTemplatePayload | null,
  providerType: ProviderType,
): ProviderSourceConfig[] {
  if (!payload) {
    return [];
  }
  return payload.provider_sources.filter(
    (source) => providerTypeForProvider({}, source) === providerType,
  );
}

export function providerEnabled(provider: ProviderConfig): boolean {
  return provider.enable !== false;
}

function providerTypeForProvider(
  provider: Partial<ProviderConfig>,
  source?: ProviderSourceConfig,
): ProviderType {
  const rawType = String(
    provider.provider_type ||
      source?.provider_type ||
      provider.type ||
      source?.type ||
      "",
  );
  if (rawType.includes("agent_runner") || rawType === "dify" || rawType === "coze") {
    return "agent_runner";
  }
  if (rawType.includes("speech_to_text") || rawType.includes("stt")) {
    return "speech_to_text";
  }
  if (rawType.includes("text_to_speech") || rawType.includes("tts")) {
    return "text_to_speech";
  }
  if (rawType.includes("embedding")) {
    return "embedding";
  }
  if (rawType.includes("rerank")) {
    return "rerank";
  }
  return "chat_completion";
}

export function providerTypeLabel(type: ProviderType, i18n?: I18n): string {
  if (type === "chat_completion") {
    return providerText(i18n, "features.provider.providers.tabs.chatCompletion", "Chat");
  }
  if (type === "agent_runner") {
    return providerText(i18n, "features.provider.providers.tabs.agentRunner", "Agent");
  }
  if (type === "speech_to_text") {
    return providerText(i18n, "features.provider.providers.tabs.speechToText", "STT");
  }
  if (type === "text_to_speech") {
    return providerText(i18n, "features.provider.providers.tabs.textToSpeech", "TTS");
  }
  if (type === "embedding") {
    return providerText(i18n, "features.provider.providers.tabs.embedding", "Embed");
  }
  return providerText(i18n, "features.provider.providers.tabs.rerank", "Rerank");
}

function formatProviderHeader(width: number, omitSource = false, i18n?: I18n): string {
  const layout = providerTableLayout(width);
  const stateHeader = providerText(i18n, "tui.providers.table.state", "S");
  const providerHeader = providerText(i18n, "features.provider.dialogs.config.provider", "Provider");
  const modelHeader = providerText(i18n, "features.provider.models.title", "Model");
  const typeModelHeader = providerText(i18n, "tui.providers.table.typeModel", "Type / Model");
  const statusHeader = providerText(i18n, "core.common.status", "Status");
  const configHeader = padRightCells(providerText(i18n, "tui.providers.table.config", "Cfg"), PROVIDER_CONFIG_ACTION_WIDTH);
  const testHeader = padRightCells(providerText(i18n, "features.provider.availability.test", "Test"), PROVIDER_TEST_ACTION_WIDTH);
  const deleteHeader = padRightCells(providerText(i18n, "core.common.delete", "Delete"), PROVIDER_DELETE_ACTION_WIDTH);
  if (layout.compact) {
    const providerWidth = Math.max(
      1,
      width
        - COMPONENT_HEADER_STATE_WIDTH
        - PROVIDER_CONFIG_ACTION_WIDTH
        - PROVIDER_TEST_ACTION_WIDTH
        - PROVIDER_DELETE_ACTION_WIDTH,
    );
    return truncateCells(
      `${padRightCells(`  ${stateHeader}`, COMPONENT_HEADER_STATE_WIDTH)}${padRightCells(providerHeader, providerWidth)}${configHeader}${testHeader}${deleteHeader}`,
      width,
    );
  }
  if (omitSource) {
    return truncateCells(
      `${padRightCells(`  ${stateHeader}`, COMPONENT_HEADER_STATE_WIDTH)}${padRightCells(modelHeader, layout.modelWidth)}${padRightCells(statusHeader, layout.statusWidth)}${configHeader}${testHeader}${deleteHeader}`,
      width,
    );
  }
  return truncateCells(
    `${padRightCells(`  ${stateHeader}`, COMPONENT_HEADER_STATE_WIDTH)}${padRightCells(providerHeader, layout.sourceWidth)}${padRightCells(typeModelHeader, layout.modelWidth)}${padRightCells(statusHeader, layout.statusWidth)}${configHeader}${testHeader}${deleteHeader}`,
    width,
  );
}

function formatProviderCells(
  row: ProviderRow,
  options: {
    isSelected: boolean;
    status?: ProviderCheckResult;
    testing: boolean;
    testingFrame: string;
    width: number;
    omitSource?: boolean;
    selectedAction: ProviderModelAction;
    i18n?: I18n;
  },
): {
  marker: string;
  state: string;
  source: string;
  model: string;
  status: string;
  config: string;
  test: string;
  delete: string;
  testing: boolean;
} {
  const marker = `${options.isSelected ? ">" : " "} `;
  const state = providerEnabled(row.provider)
    ? providerText(options.i18n, "tui.common.on", "on")
    : providerText(options.i18n, "tui.common.off", "off");
  const source = options.omitSource
    ? row.source?.id || row.provider.provider_source_id || row.provider.provider || row.provider.type || "-"
    : row.provider.id || row.provider.provider || row.provider.type || "-";
  const model = row.provider.model || row.provider.type || row.provider.provider || row.provider.id || "-";
  const status = options.testing
    ? providerText(options.i18n, "tui.providers.status.testing", "testing")
    : providerStatusLabel(options.status, options.i18n);
  const config = padRightCells(
    providerText(options.i18n, "tui.providers.actions.configIcon", PROVIDER_CONFIG_ICON),
    PROVIDER_CONFIG_ACTION_WIDTH,
  );
  const test = padRightCells(
    options.testing ? options.testingFrame : PROVIDER_TEST_IDLE_MARK,
    PROVIDER_TEST_ACTION_WIDTH,
  );
  const deleteText = padRightCells(
    providerText(options.i18n, "tui.providers.actions.delete", "X"),
    PROVIDER_DELETE_ACTION_WIDTH,
  );
  const layout = providerTableLayout(options.width);
  if (layout.compact) {
    const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
    const providerWidth = Math.max(
      1,
      options.width
        - terminalWidth(marker)
        - terminalWidth(stateCell)
        - PROVIDER_CONFIG_ACTION_WIDTH
        - PROVIDER_TEST_ACTION_WIDTH
        - PROVIDER_DELETE_ACTION_WIDTH,
    );
    return {
      marker,
      state: stateCell,
      source: "",
      model: padRightCells(truncateCells(model, providerWidth), providerWidth),
      status: "",
      config,
      test,
      delete: deleteText,
      testing: options.testing,
    };
  }

  const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
  const sourceCell = options.omitSource ? "" : padRightCells(source, layout.sourceWidth);
  const modelCell = padRightCells(model, layout.modelWidth);
  return {
    marker,
    state: stateCell,
    source: sourceCell,
    model: modelCell,
    status: padRightCells(truncateCells(status, layout.statusWidth), layout.statusWidth),
    config,
    test,
    delete: deleteText,
    testing: options.testing,
  };
}

function providerTableLayout(width: number): {
  compact: boolean;
  sourceWidth: number;
  modelWidth: number;
  statusWidth: number;
} {
  if (width < 72) {
    return { compact: true, sourceWidth: 0, modelWidth: 0, statusWidth: 0 };
  }
  const statusWidth = 12;
  const actionWidth =
    PROVIDER_CONFIG_ACTION_WIDTH + PROVIDER_TEST_ACTION_WIDTH + PROVIDER_DELETE_ACTION_WIDTH;
  const fixedWidth = COMPONENT_HEADER_STATE_WIDTH + statusWidth + actionWidth;
  const available = Math.max(24, width - fixedWidth);
  const sourceWidth = Math.max(16, Math.min(30, Math.floor(available * 0.32)));
  return {
    compact: false,
    sourceWidth,
    modelWidth: Math.max(18, available - sourceWidth),
    statusWidth,
  };
}

function useTestingFrame(testingProviderId: string | null): string {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!testingProviderId) {
      setFrameIndex(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % PROVIDER_TEST_FRAMES.length);
    }, 180);
    return () => {
      clearInterval(timer);
    };
  }, [testingProviderId]);

  return PROVIDER_TEST_FRAMES[frameIndex] || PROVIDER_TEST_FRAMES[0];
}

function providerStatusLabel(status?: ProviderCheckResult, i18n?: I18n): string {
  if (!status) {
    return "-";
  }
  if (status.error) {
    return providerText(i18n, "features.provider.availability.unavailable", "unavailable");
  }
  if (status.status === "available") {
    return providerText(i18n, "features.provider.availability.available", "available");
  }
  if (status.status === "unavailable") {
    return providerText(i18n, "features.provider.availability.unavailable", "unavailable");
  }
  return status.status || "-";
}

function providerStatusColor(status?: ProviderCheckResult): TextColor | undefined {
  if (!status) {
    return undefined;
  }
  if (status.status === "available" && !status.error) {
    return "green";
  }
  if (status.status === "unavailable" || status.error) {
    return "red";
  }
  return "yellow";
}

function providerTestColor(
  status?: ProviderCheckResult,
  testing = false,
): TextColor | undefined {
  if (testing) {
    return "yellow";
  }
  if (!status) {
    return undefined;
  }
  if (status.status === "available" && !status.error) {
    return "green";
  }
  if (status.status === "unavailable" || status.error) {
    return "red";
  }
  return undefined;
}

function providerText(
  i18n: I18n | undefined,
  key: string,
  fallback: string,
  values?: ProviderTextValues,
): string {
  return formatProviderText(i18n?.t(key, fallback) || fallback, values);
}

function formatProviderText(template: string, values?: ProviderTextValues): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

function providerDetailLine(
  provider: ProviderConfig,
  status?: ProviderCheckResult,
  action?: ProviderModelAction,
  i18n?: I18n,
): string {
  const parts = [
    provider.id,
    action
      ? providerText(i18n, "tui.providers.detail.enterAction", "Enter: {action}", {
        action: providerModelActionLabel(action, i18n),
      })
      : "",
    provider.model
      ? providerText(i18n, "tui.providers.detail.model", "model: {model}", {
        model: provider.model,
      })
      : "",
    provider.provider_source_id
      ? providerText(i18n, "tui.providers.detail.source", "source: {source}", {
        source: provider.provider_source_id,
      })
      : "",
    provider.max_context_tokens
      ? providerText(i18n, "tui.providers.detail.context", "ctx: {context}", {
        context: provider.max_context_tokens,
      })
      : "",
    status?.error
      ? providerText(i18n, "tui.providers.detail.error", "error: {error}", {
        error: status.error,
      })
      : "",
  ].filter(Boolean);
  return parts.join("  ");
}

function providerModelActionLabel(action: ProviderModelAction, i18n?: I18n): string {
  if (action === "switch") {
    return providerText(i18n, "tui.providers.actions.switch", "on/off");
  }
  if (action === "test") {
    return providerText(i18n, "features.provider.availability.test", "test");
  }
  if (action === "config") {
    return providerText(i18n, "tui.providers.actions.config", "edit");
  }
  if (action === "add") {
    return providerText(i18n, "tui.providers.actions.add", "add");
  }
  return providerText(i18n, "tui.providers.actions.delete", "X");
}

function providerMetadataLabel(metadata?: Record<string, unknown> | null, i18n?: I18n): string {
  if (!metadata) {
    return "";
  }
  const tags: string[] = [];
  const modalities = metadata.modalities;
  const inputs =
    modalities && typeof modalities === "object" && "input" in modalities
      ? (modalities as { input?: unknown }).input
      : [];
  if (Array.isArray(inputs)) {
    if (inputs.includes("image")) {
      tags.push(providerText(i18n, "tui.providers.metadata.image", "img"));
    }
    if (inputs.includes("audio")) {
      tags.push(providerText(i18n, "tui.providers.metadata.audio", "aud"));
    }
  }
  if (metadata.tool_call) {
    tags.push(providerText(i18n, "tui.providers.metadata.tool", "tool"));
  }
  if (metadata.reasoning) {
    tags.push(providerText(i18n, "tui.providers.metadata.reasoning", "think"));
  }
  const limit = metadata.limit;
  const context =
    limit && typeof limit === "object" && "context" in limit
      ? (limit as { context?: unknown }).context
      : undefined;
  if (typeof context === "number" && context > 0) {
    tags.push(formatContextLimit(context));
  }
  return tags.join(" ");
}

function formatContextLimit(context: number): string {
  if (context >= 1_000_000) {
    return `${Math.round(context / 1_000_000)}M`;
  }
  if (context >= 1_000) {
    return `${Math.round(context / 1_000)}K`;
  }
  return String(context);
}

function providerSourceKind(source: ProviderSourceConfig, i18n?: I18n): string {
  return String(
    source.provider ||
      source.type ||
      source.provider_type ||
      providerText(i18n, "tui.providers.sourceKind.default", "source"),
  );
}

export function buildProviderSourceSettings(
  source: ProviderSourceConfig,
): ProviderSourceSetting[] {
  const priorityKeys = ["id", "api_base", "key", "timeout"];
  const excluded = new Set(["enable", "type", "provider_type", "provider"]);
  const entries: Array<[string, unknown]> = [];

  for (const key of priorityKeys) {
    if (source[key] !== undefined) {
      entries.push([key, source[key]]);
    }
  }
  for (const [key, value] of Object.entries(source)) {
    if (priorityKeys.includes(key) || excluded.has(key)) {
      continue;
    }
    entries.push([key, value]);
  }

  return entries.map(([key, value]) => ({ key, value }));
}

export function providerConfigValueLabel(value: unknown, i18n?: I18n): string {
  if (value === null || value === undefined || value === "") {
    return providerText(i18n, "tui.common.none", "N/A");
  }
  if (typeof value === "boolean") {
    return value
      ? providerText(i18n, "tui.common.true", "true")
      : providerText(i18n, "tui.common.false", "false");
  }
  if (Array.isArray(value)) {
    return value.map((item) => providerConfigValueLabel(item, i18n)).join(", ");
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length ? `{${keys.join(", ")}}` : "{}";
  }
  return String(value);
}
