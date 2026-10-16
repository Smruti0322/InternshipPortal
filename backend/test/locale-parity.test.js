const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const localeDirectory = path.resolve(__dirname, "../../frontend/src/locales");
const localeFiles = fs.readdirSync(localeDirectory).filter((file) => file.endsWith(".json"));
const flattenKeys = (value, prefix = "") => Object.entries(value).flatMap(([key, nested]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    return nested && typeof nested === "object" && !Array.isArray(nested)
        ? flattenKeys(nested, current)
        : [current];
});

test("all supported locales have the same translation keys as English", () => {
    const locales = Object.fromEntries(localeFiles.map((file) => [
        path.basename(file, ".json"),
        JSON.parse(fs.readFileSync(path.join(localeDirectory, file), "utf8")),
    ]));
    const englishKeys = new Set(flattenKeys(locales.en));

    assert.deepEqual(Object.keys(locales).sort(), ["en", "es", "fr", "hi", "pt", "zh"]);
    for (const [locale, translations] of Object.entries(locales)) {
        assert.deepEqual(new Set(flattenKeys(translations)), englishKeys, `${locale} locale keys differ`);
    }
});
