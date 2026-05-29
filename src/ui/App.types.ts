import type {
  PlatformConfig,
  ProviderConfig,
  ProviderSourceConfig,
  TokenRange,
} from "../api/types.js";
import type { AgentAction } from "./AgentsView.js";
import type { PluginAction, PluginConfigSetting } from "./PluginsView.js";
import type { ProviderModelAction, ProviderSourceAction } from "./ProvidersView.js";

export type MainView =
  | "chat"
  | "status"
  | "console"
  | "commands"
  | "plugins"
  | "agents"
  | "providers"
  | "platforms";

export type PendingProviderDelete =
  | { kind: "source"; id: string }
  | { kind: "model"; id: string }
  | null;

export type PendingPlatformDelete = { id: string } | null;

export interface ProviderSourceTemplate {
  name: string;
  config: ProviderSourceConfig;
}

export interface ProviderTemplate {
  name: string;
  config: ProviderConfig;
}

export interface ProviderConfigSetting extends PluginConfigSetting {}

export interface PlatformRegistrationFlow {
  templateIndex?: number;
  platformId?: string;
  config: PlatformConfig;
  status: string;
  registrationCode?: string;
  message?: string;
  qrValue?: string;
  userCode?: string;
  verificationUri?: string;
  interval?: number;
}

export interface PendingMarketInstallWarning {
  pluginKey: string;
  pluginName: string;
  sourceUrl: string;
  downloadUrl: string;
  message: string;
}

export interface PluginConfigChoice {
  label: string;
  value: unknown;
  description?: string;
}

export interface PluginConfigChoiceDialogState {
  setting: PluginConfigSetting;
  choices: PluginConfigChoice[];
  selectedIndex: number;
  selectedValues: unknown[];
  multi: boolean;
  loading: boolean;
  title: string;
  applyValue?: (value: unknown) => void | Promise<void>;
}

export interface PluginConfigTemplateListDialogState {
  setting: PluginConfigSetting;
  mode: "entries" | "templates" | "fields";
  selectedIndex: number;
  entryIndex: number;
}

export interface PluginTemplateFieldEditState {
  templateSetting: PluginConfigSetting;
  entryIndex: number;
  field: PluginConfigSetting;
  value: string;
  cursor: number;
}

export interface PluginObjectEditorState {
  setting: PluginConfigSetting;
  selectedIndex: number;
  editingKey: string | null;
  keyValue: string;
  keyCursor: number;
  valueValue: string;
  valueCursor: number;
  newValueType: "string" | "number" | "boolean" | "json";
  applyValue?: (value: unknown) => void | Promise<void>;
}

export type PluginConfigObjectValueType = PluginObjectEditorState["newValueType"];

export interface PluginFileDialogState {
  setting: PluginConfigSetting;
  selectedIndex: number;
  loading: boolean;
  files: string[];
}

export const MAIN_VIEWS: MainView[] = [
  "chat",
  "status",
  "console",
  "commands",
  "plugins",
  "agents",
  "providers",
  "platforms",
];
export const AGENT_ACTIONS: AgentAction[] = ["delete"];
export const AGENT_EDIT_ACTIONS: AgentAction[] = ["save", "cancel"];
export const PLATFORM_REGISTRATION_TYPES = new Set(["lark", "weixin_oc", "dingtalk"]);
export const PROVIDER_SOURCE_ROW_ACTIONS: ProviderSourceAction[] = ["switch", "models", "delete"];
export const PROVIDER_MODEL_ACTIONS: ProviderModelAction[] = ["switch", "config", "test", "delete"];
export const AVAILABLE_PROVIDER_MODEL_ACTIONS: ProviderModelAction[] = ["add"];
export const PLUGIN_ACTIONS: PluginAction[] = ["switch", "delete"];
export const TOKEN_RANGES: TokenRange[] = [1, 3, 7];
