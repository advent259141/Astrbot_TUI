import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Locale = "en-US" | "zh-CN";

type Dictionary = Record<string, unknown>;
type TranslateParams = Record<string, string | number | boolean | null | undefined>;

const SUPPORTED_LOCALES: Locale[] = ["en-US", "zh-CN"];
const DEFAULT_LOCALE: Locale = "en-US";
const __dirname = dirname(fileURLToPath(import.meta.url));
const dictionaries = new Map<Locale, Dictionary>();

export function resolveLocale(value?: string): Locale {
  const raw = (value || process.env.ASTR_TUI_LANG || process.env.LANG || "").toLowerCase();
  if (raw.startsWith("zh")) {
    return "zh-CN";
  }
  if (raw.startsWith("en")) {
    return "en-US";
  }
  return DEFAULT_LOCALE;
}

export function createI18n(localeValue?: string): I18n {
  const locale = resolveLocale(localeValue);
  return {
    locale,
    t: (key: string, fallback = key, params?: TranslateParams) =>
      translate(key, fallback, locale, params),
    raw: (key: string) => readPath(loadDictionary(locale), key),
    translateIfKey: (value: unknown, fallback = "") =>
      translateIfKey(value, fallback, locale),
  };
}

export interface I18n {
  locale: Locale;
  t: (key: string, fallback?: string, params?: TranslateParams) => string;
  raw: (key: string) => unknown;
  translateIfKey: (value: unknown, fallback?: string) => string;
}

export function translateIfKey(value: unknown, fallback = "", locale: Locale = DEFAULT_LOCALE): string {
  if (typeof value !== "string" || !value) {
    return fallback;
  }
  const translated = translate(value, "", locale);
  return translated || value;
}

export function translate(
  key: string,
  fallback = key,
  locale: Locale = DEFAULT_LOCALE,
  params?: TranslateParams,
): string {
  const value = readPath(loadDictionary(locale), key);
  return interpolate(typeof value === "string" ? value : fallback, params);
}

export function resolveConfigText(
  i18n: I18n,
  path: string[],
  field: string,
  fallback: unknown,
): string {
  const explicit = readConfigMetadataPath(i18n, [...path, field]);
  if (typeof explicit === "string") {
    return explicit;
  }
  return i18n.translateIfKey(fallback, String(fallback || path[path.length - 1] || ""));
}

export function resolveConfigList(
  i18n: I18n,
  path: string[],
  field: string,
  fallback: unknown,
): unknown[] {
  const explicit = readConfigMetadataPath(i18n, [...path, field]);
  if (Array.isArray(explicit)) {
    return explicit;
  }
  if (typeof fallback === "string") {
    const translated = i18n.raw(fallback);
    if (Array.isArray(translated)) {
      return translated;
    }
  }
  return Array.isArray(fallback) ? fallback : [];
}

function readConfigMetadataPath(i18n: I18n, path: string[]): unknown {
  const webuiPath = ["features", "config-metadata", ...path].join(".");
  const webuiValue = i18n.raw(webuiPath);
  if (webuiValue !== undefined) {
    return webuiValue;
  }
  return i18n.raw(path.join("."));
}

function loadDictionary(locale: Locale): Dictionary {
  const cached = dictionaries.get(locale);
  if (cached) {
    return cached;
  }
  const dictionary = loadLocaleDictionary(locale) || loadLocaleDictionary(DEFAULT_LOCALE) || {};
  dictionaries.set(locale, dictionary);
  return dictionary;
}

function loadLocaleDictionary(locale: Locale): Dictionary | null {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return null;
  }
  const webui = loadWebuiLocaleModules(locale);
  const tui = readJson(join(__dirname, "locales", locale, "tui.json"));
  if (!webui && !tui) {
    return null;
  }
  return deepMerge(webui || {}, tui || {});
}

function readJson(path: string): Dictionary | null {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as Dictionary;
  } catch {
    return null;
  }
}

function loadWebuiLocaleModules(locale: Locale): Dictionary | null {
  const localeDir = join(__dirname, "locales", locale);
  const roots = ["core", "features", "messages"];
  let loaded = false;
  let dictionary: Dictionary = {};
  for (const root of roots) {
    const rootDir = join(localeDir, root);
    const moduleData = loadJsonTree(rootDir);
    if (moduleData) {
      dictionary = deepMerge(dictionary, { [root]: moduleData });
      loaded = true;
    }
  }
  return loaded ? dictionary : null;
}

function loadJsonTree(dir: string): Dictionary | null {
  try {
    if (!statSync(dir).isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }
  const result: Dictionary = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = loadJsonTree(entryPath);
      if (child) {
        result[entry.name] = child;
      }
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const data = readJson(entryPath);
    if (data) {
      result[entry.name.replace(/\.json$/, "")] = data;
    }
  }
  return result;
}

function deepMerge(left: Dictionary, right: Dictionary): Dictionary {
  const merged: Dictionary = { ...left };
  for (const [key, value] of Object.entries(right)) {
    const existing = merged[key];
    if (
      existing &&
      value &&
      typeof existing === "object" &&
      typeof value === "object" &&
      !Array.isArray(existing) &&
      !Array.isArray(value)
    ) {
      merged[key] = deepMerge(existing as Dictionary, value as Dictionary);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function interpolate(value: string, params?: TranslateParams): string {
  if (!params) {
    return value;
  }
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

function readPath(source: unknown, path: string): unknown {
  let cursor = source;
  for (const segment of path.split(".").filter(Boolean)) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}
