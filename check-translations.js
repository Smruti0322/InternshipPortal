
const fs = require("fs");
const path = require("path");

const localesDir = path.join(
    __dirname,
    "frontend",
    "src",
    "locales"
);

const languages = ["en", "hi", "fr", "es", "pt", "zh"];

function flattenKeys(value, prefix = "", result = {}) {
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        for (const key of Object.keys(value)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            flattenKeys(value[key], fullKey, result);
        }
    } else {
        result[prefix] = value;
    }

    return result;
}

function loadLocale(language) {
    const filePath = path.join(localesDir, `${language}.json`);

    if (!fs.existsSync(filePath)) {
        console.log(`Missing file: ${language}.json`);
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.log(`Invalid JSON in ${language}.json: ${error.message}`);
        return null;
    }
}

const english = loadLocale("en");

if (!english) {
    console.log("Cannot continue: fix en.json first.");
    process.exit(1);
}

const englishKeys = flattenKeys(english);
let totalMissing = 0;
let totalEmpty = 0;

for (const language of languages.filter((lang) => lang !== "en")) {
    const locale = loadLocale(language);

    if (!locale) continue;

    const translatedKeys = flattenKeys(locale);
    const missing = [];
    const empty = [];

    for (const key of Object.keys(englishKeys)) {
        if (!Object.prototype.hasOwnProperty.call(translatedKeys, key)) {
            missing.push(key);
        } else {
            const value = translatedKeys[key];

            if (typeof value === "string" && value.trim() === "") {
                empty.push(key);
            }
        }
    }

    console.log(`\n========== ${language.toUpperCase()} ==========`);

    console.log(`Missing keys: ${missing.length}`);
    missing.forEach((key) => console.log(`  MISSING: ${key}`));

    console.log(`Empty translations: ${empty.length}`);
    empty.forEach((key) => console.log(`  EMPTY: ${key}`));

    totalMissing += missing.length;
    totalEmpty += empty.length;
}

console.log("\n========== SUMMARY ==========");
console.log(`Missing translations: ${totalMissing}`);
console.log(`Empty translations: ${totalEmpty}`);
console.log("Audit completed. No files were modified.");
