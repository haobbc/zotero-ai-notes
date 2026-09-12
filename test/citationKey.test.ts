import { assert } from "chai";
import {
  getCitationKey,
  normalizeCitationKey,
  parseCitationKeyFromExtra,
} from "../src/utils/citationKey";

type FieldMap = Record<string, string | undefined>;

function mockItem(options: {
  key?: string;
  id?: number;
  fields?: FieldMap;
  json?: Record<string, unknown>;
  throwOnField?: string[];
}): Zotero.Item {
  const fields = options.fields ?? {};
  const throwOnField = new Set(options.throwOnField ?? []);
  return {
    key: options.key ?? "ITEMKEY1",
    id: options.id ?? 1,
    getField(field: string) {
      if (throwOnField.has(field)) {
        throw new Error(`Invalid field "${field}"`);
      }
      return fields[field] ?? "";
    },
    toJSON() {
      return options.json ?? {};
    },
  } as unknown as Zotero.Item;
}

describe("citationKey", function () {
  describe("normalizeCitationKey", function () {
    it("trims non-empty strings", function () {
      assert.equal(normalizeCitationKey("  smith2020  "), "smith2020");
    });

    it("returns null for empty or non-string values", function () {
      assert.isNull(normalizeCitationKey(""));
      assert.isNull(normalizeCitationKey("   "));
      assert.isNull(normalizeCitationKey(undefined));
      assert.isNull(normalizeCitationKey(null));
      assert.isNull(normalizeCitationKey(123));
    });
  });

  describe("parseCitationKeyFromExtra", function () {
    it("reads Citation Key lines", function () {
      assert.equal(
        parseCitationKeyFromExtra("DOI: 10.1/x\nCitation Key: smith2020"),
        "smith2020",
      );
    });

    it("reads tex.citationkey lines", function () {
      assert.equal(
        parseCitationKeyFromExtra("tex.citationkey: doe2021"),
        "doe2021",
      );
    });

    it("returns null when Extra has no citekey", function () {
      assert.isNull(parseCitationKeyFromExtra("Publisher: Example"));
      assert.isNull(parseCitationKeyFromExtra(""));
    });
  });

  describe("getCitationKey", function () {
    afterEach(function () {
      const zoteroAny = Zotero as typeof Zotero & {
        BetterBibTeX?: unknown;
      };
      delete zoteroAny.BetterBibTeX;
    });

    it("prefers native citationKey over Extra and BBT", function () {
      const zoteroAny = Zotero as typeof Zotero & {
        BetterBibTeX?: { KeyManager: { get: () => { citationKey: string } } };
      };
      zoteroAny.BetterBibTeX = {
        KeyManager: { get: () => ({ citationKey: "bbtKey" }) },
      };

      const key = getCitationKey(
        mockItem({
          fields: {
            citationKey: "nativeKey",
            extra: "Citation Key: extraKey",
          },
        }),
      );
      assert.equal(key, "nativeKey");
    });

    it("accepts lowercase citationkey from getField", function () {
      const key = getCitationKey(
        mockItem({
          fields: { citationkey: "lowerKey" },
          throwOnField: ["citationKey"],
        }),
      );
      assert.equal(key, "lowerKey");
    });

    it("reads citationKey from serialized item JSON", function () {
      const key = getCitationKey(
        mockItem({
          throwOnField: ["citationKey", "citationkey"],
          json: { data: { citationKey: "jsonKey" } },
        }),
      );
      assert.equal(key, "jsonKey");
    });

    it("falls back to Extra when native field is empty", function () {
      const key = getCitationKey(
        mockItem({
          fields: {
            citationKey: "  ",
            extra: "Citation Key: extraKey",
          },
        }),
      );
      assert.equal(key, "extraKey");
    });

    it("falls back to Better BibTeX when native and Extra are missing", function () {
      const zoteroAny = Zotero as typeof Zotero & {
        BetterBibTeX?: { KeyManager: { get: () => { citationKey: string } } };
      };
      zoteroAny.BetterBibTeX = {
        KeyManager: { get: () => ({ citationKey: "bbtKey" }) },
      };

      const key = getCitationKey(mockItem({ fields: { citationKey: "" } }));
      assert.equal(key, "bbtKey");
    });

    it("uses the item key when no citation key is available", function () {
      const key = getCitationKey(
        mockItem({
          key: "ABCD1234",
          throwOnField: ["citationKey", "citationkey"],
        }),
      );
      assert.equal(key, "ABCD1234");
    });

    it("still reaches fallbacks if getField throws for citationKey", function () {
      const key = getCitationKey(
        mockItem({
          key: "FALLBACK1",
          throwOnField: ["citationKey", "citationkey"],
          fields: { extra: "Citation Key: recoveredKey" },
        }),
      );
      assert.equal(key, "recoveredKey");
    });
  });
});
