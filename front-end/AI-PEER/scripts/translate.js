const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

if (!API_KEY) {
  console.error("Set GOOGLE_CLOUD_API_KEY env variable");
  process.exit(1);
}

function flatten(obj, prefix = "", result = {}) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function unflatten(obj) {
  const result = {};

  for (const flatKey of Object.keys(obj)) {
    const keys = flatKey.split(".");
    let current = result;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (i === keys.length - 1) {
        current[key] = obj[flatKey];
      } else {
        current[key] = current[key] || {};
        current = current[key];
      }
    }
  }

  return result;
}

async function translate(texts, targetLang) {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        source: "en",
        target: targetLang,
        format: "text",
      }),
    }
  );

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.message);
  }

  return json.data.translations.map((t) => t.translatedText);
}

async function main() {
  const enPath = path.join(__dirname, "../src/locales/en/translation.json");
  const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));

  const flatEn = flatten(en);
  const keys = Object.keys(flatEn);
  const values = Object.values(flatEn);

  const translated = [];

  for (let i = 0; i < values.length; i += 100) {
    const batch = values.slice(i, i + 100);
    const results = await translate(batch, "es");
    translated.push(...results);
    console.log(`Translated ${Math.min(i + 100, values.length)}/${values.length}`);
  }

  const flatEs = {};
  keys.forEach((key, i) => {
    flatEs[key] = translated[i];
  });

  const es = unflatten(flatEs);

  const esPath = path.join(__dirname, "../src/locales/es/translation.json");
  fs.writeFileSync(esPath, JSON.stringify(es, null, 2));

  console.log(`Wrote ${esPath}`);
}

main().catch(console.error);
