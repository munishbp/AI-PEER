import { usePrefs } from "../prefs-context";

type Primitive = string | number | boolean | null | undefined;
type Params = Record<string, Primitive>;

export type SupportedLocale = "en" | "es" | "ht";

type DictNode = {
  [key: string]: string | DictNode;
};

const en = require("./locales/en/translation.json") as DictNode;
const es = require("./locales/es/translation.json") as DictNode;
const ht = require("./locales/ht/translation.json") as DictNode;

const dictionaries: Record<SupportedLocale, DictNode> = {
  en,
  es,
  ht,
};

function getByPath(dict: DictNode, key: string): string | DictNode | undefined {
  const parts = key.split(".");
  let current: string | DictNode | undefined = dict;
  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === null || value === undefined ? `{${token}}` : String(value);
  });
}

function getPluralized(
  dict: DictNode,
  key: string,
  count: number
): string | undefined {
  const exact = getByPath(dict, key);
  if (typeof exact === "string") return exact;

  const suffixes =
    count === 0 ? ["zero", "other", "one"] : count === 1 ? ["one", "other"] : ["other", "one"];

  for (const suffix of suffixes) {
    const candidate = getByPath(dict, `${key}_${suffix}`);
    if (typeof candidate === "string") return candidate;
  }

  return undefined;
}

export function translate(
  locale: SupportedLocale,
  key: string,
  params?: Params,
  fallback?: string
): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const count = typeof params?.count === "number" ? params.count : undefined;

  let template: string | undefined;
  if (count !== undefined) {
    template = getPluralized(dict, key, count);
  }

  if (!template) {
    const local = getByPath(dict, key);
    if (typeof local === "string") template = local;
  }

  if (!template) {
    if (count !== undefined) {
      template = getPluralized(dictionaries.en, key, count);
    }
    if (!template) {
      const english = getByPath(dictionaries.en, key);
      if (typeof english === "string") template = english;
    }
  }

  return interpolate(template ?? fallback ?? key, params);
}

export function useI18n() {
  const { prefs } = usePrefs();
  const language = prefs.language as SupportedLocale;

  return {
    language,
    t: (key: string, params?: Params, fallback?: string) =>
      translate(language, key, params, fallback),
  };
}

