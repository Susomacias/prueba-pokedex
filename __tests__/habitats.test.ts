import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { HABITATS, type Habitat } from "@/src/lib/types/pokemon";
import { HABITAT_IMAGES } from "@/src/lib/constants/habitats";

describe("HABITAT_IMAGES", () => {
  it("tiene una entrada por cada hábitat del catálogo", () => {
    expect(HABITATS).toHaveLength(10);

    for (const habitat of HABITATS) {
      expect(
        HABITAT_IMAGES[habitat],
        `falta imagen para el hábitat "${habitat}"`,
      ).toBeDefined();
    }
  });

  it("no contiene hábitats fuera del catálogo", () => {
    const keys = Object.keys(HABITAT_IMAGES) as Habitat[];
    expect(keys).toHaveLength(HABITATS.length);
    for (const key of keys) {
      expect(HABITATS).toContain(key);
    }
  });

  it("cada hábitat referenciado mapea a un archivo .webp existente en /public/habitats", () => {
    const habitatsDir = path.resolve(process.cwd(), "public", "habitats");

    for (const habitat of HABITATS) {
      const url = HABITAT_IMAGES[habitat];
      expect(url).toMatch(/^\/habitats\/.+\.webp$/);

      const filePath = path.join(habitatsDir, path.basename(url));
      expect(
        fs.existsSync(filePath),
        `no existe el archivo "${filePath}" para el hábitat "${habitat}"`,
      ).toBe(true);
    }
  });
});
