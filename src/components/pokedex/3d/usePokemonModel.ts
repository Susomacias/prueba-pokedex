"use client";

import { useEffect, useState } from "react";

type ModelStatus = "idle" | "loading" | "ready" | "error";

const MODEL_BASE_URL =
  "https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular";

const modelCache = new Map<number, object>();

export function clearModelCache() {
  modelCache.clear();
}

export interface UsePokemonModelResult {
  model: object | null;
  status: ModelStatus;
  error: Error | null;
}

export function usePokemonModel(
  pokemonId: number | null,
): UsePokemonModelResult {
  const [model, setModel] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store-previous: detecta cambios en pokemonId durante el render
  const [prevPokemonId, setPrevPokemonId] = useState<number | null>(null);
  if (prevPokemonId !== pokemonId) {
    setPrevPokemonId(pokemonId);
    if (pokemonId == null) {
      setModel(null);
      setLoading(false);
      setError(null);
    } else {
      const cached = modelCache.get(pokemonId);
      if (cached) {
        setModel(cached);
        setLoading(false);
        setError(null);
      } else {
        setModel(null);
        setError(null);
        // El efecto se encarga de iniciar la carga asíncrona
      }
    }
  }

  useEffect(() => {
    if (pokemonId == null) return;

    const cached = modelCache.get(pokemonId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModel(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);

    (async () => {
      const url = `${MODEL_BASE_URL}/${pokemonId}.glb`;
      try {
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        const { DRACOLoader } = await import(
          "three/examples/jsm/loaders/DRACOLoader.js"
        );

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/");

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        const gltf = await new Promise<{ scene: object }>(
          (resolve, reject) => {
            loader.load(
              url,
              (result) => resolve(result as unknown as { scene: object }),
              undefined,
              (err) =>
                reject(
                  err instanceof Error ? err : new Error(String(err)),
                ),
            );
          },
        );

        if (!cancelled) {
          modelCache.set(pokemonId, gltf.scene);
          setModel(gltf.scene);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[usePokemonModel] Error cargando modelo %s: %s",
              url,
              e.message,
            );
          }
          setError(e);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pokemonId]);

  // Derivar el status
  let status: ModelStatus;
  if (pokemonId == null) {
    status = "idle";
  } else if (model) {
    status = "ready";
  } else if (error) {
    status = "error";
  } else if (loading) {
    status = "loading";
  } else {
    status = "idle";
  }

  return { model, status, error };
}
