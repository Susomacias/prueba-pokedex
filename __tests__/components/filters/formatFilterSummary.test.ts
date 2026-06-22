import { describe, it, expect } from "vitest";
import { formatFilterSummary } from "@/src/components/filters/formatFilterSummary";
import type { FilterSummaryEntry } from "@/src/lib/filters/types";

describe("formatFilterSummary", () => {
  it("devuelve un string vacío cuando no hay entradas", () => {
    expect(formatFilterSummary([])).toBe("");
  });

  it("une las entradas con ' · ' como separador", () => {
    const entries: FilterSummaryEntry[] = [
      { key: "type1", label: "Tipo 1", display: "Fuego" },
      { key: "habitat", label: "Hábitat", display: "Pradera" },
    ];
    expect(formatFilterSummary(entries)).toBe("Tipo 1: Fuego · Hábitat: Pradera");
  });

  it("omite entradas con display vacío", () => {
    const entries: FilterSummaryEntry[] = [
      { key: "type1", label: "Tipo 1", display: "Fuego" },
      { key: "habitat", label: "Hábitat", display: "" },
    ];
    expect(formatFilterSummary(entries)).toBe("Tipo 1: Fuego");
  });
});