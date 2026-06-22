import { describe, it, expect } from "vitest";
import { capitalize } from "@/src/lib/utils/capitalize";

describe("capitalize", () => {
  it("capitaliza la primera letra de una palabra en minúsculas", () => {
    expect(capitalize("bulbasaur")).toBe("Bulbasaur");
  });

  it("pasa el resto a minúsculas", () => {
    expect(capitalize("CHARIZARD")).toBe("Charizard");
  });

  it("devuelve la cadena vacía sin cambios", () => {
    expect(capitalize("")).toBe("");
  });

  it("solo capitaliza el primer caracter de una cadena multi-palabra", () => {
    expect(capitalize("mr mime")).toBe("Mr mime");
  });
});
