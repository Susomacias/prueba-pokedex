"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useCarousel } from "./CarouselController";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

/**
 * Plan 06.3 — `PokemonCarousel`: vista presentacional del carrusel
 * de imágenes + info. Lee el estado compartido del
 * `CarouselController` y se limita a:
 *  - Construir las slides a partir del `detail`.
 *  - Renderizar la slide activa con animación horizontal.
 *  - Manejar la duración de la animación (`SLIDE_TRANSITION_MS`).
 *
 * El fetch del detalle y la cancelación del auto-avance viven en el
 * `CarouselController` (provider). Esto permite que los slots
 * `PUNTOS_CARRUSEL` (LEDs) y `BOTONES_CARRUSEL` (botones izq/der)
 * compartan el mismo estado.
 */

const SLIDE_TRANSITION_MS = 400;
const MAX_SLIDES = 7;

export function PokemonCarousel() {
  const { detail, error, activeIndex } = useCarousel();
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIndexRef = useRef(activeIndex);

  // Detecta dirección del cambio para la animación.
  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      setDirection(activeIndex > prevIndexRef.current ? "forward" : "backward");
      setTransitioning(true);
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  // Limpia el timer de transición al desmontar o al completar.
  useEffect(() => {
    if (!transitioning) return;
    transitionTimerRef.current = setTimeout(() => {
      setTransitioning(false);
      transitionTimerRef.current = null;
    }, SLIDE_TRANSITION_MS);
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [activeIndex, transitioning]);

  const slides = useMemo<ReadonlyArray<CarouselSlide>>(
    () => (detail ? buildSlides(detail) : []),
    [detail],
  );

  if (error) {
    return (
      <div role="alert" className="pokemon-carousel pokemon-carousel--error">
        Error cargando el detalle: {error.message}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="pokemon-carousel pokemon-carousel--loading" aria-busy="true">
        <header className="pokemon-carousel__header">
          <h2
            data-testid="pokemon-carousel-name"
            className="pokemon-carousel__name"
          >
            {detail ? "" : ""}
          </h2>
        </header>
        <div className="pokemon-carousel__skeleton" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="pokemon-carousel" data-active={activeIndex}>
      <header className="pokemon-carousel__header">
        <h2
          data-testid="pokemon-carousel-name"
          className="pokemon-carousel__name"
        >
          {detail.name}
        </h2>
      </header>

      <div
        className={`pokemon-carousel__viewport${
          transitioning ? " pokemon-carousel__viewport--animating" : ""
        }`}
        aria-live="polite"
      >
        <div
          className={`pokemon-carousel__track pokemon-carousel__track--${direction}`}
          data-testid="pokemon-carousel-track"
          data-active={activeIndex}
          style={
            {
              transform: `translateX(-${activeIndex * 100}%)`,
              transitionDuration: transitioning ? `${SLIDE_TRANSITION_MS}ms` : "0ms",
            } as CSSProperties
          }
        >
          {slides.map((slide, i) => (
            <Slide key={`${slide.kind}-${i}`} slide={slide} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ *
 * Slide
 * ------------------------------------------------------------------------ */

interface CarouselSlide {
  kind: "hero" | "flavor" | "gallery";
  imageUrl: string | null;
  label?: string;
  flavor?: string;
}

export function buildSlides(detail: PokemonDetail): ReadonlyArray<CarouselSlide> {
  const slides: CarouselSlide[] = [];

  if (detail.sprites.frontDefault) {
    slides.push({ kind: "hero", imageUrl: detail.sprites.frontDefault });
  }

  if (detail.sprites.frontDefault || detail.flavorText) {
    slides.push({
      kind: "flavor",
      imageUrl: detail.sprites.frontDefault,
      flavor: detail.flavorText ?? undefined,
    });
  }

  const galleryOrder: Array<{
    url: string | null;
    label: string;
  }> = [
    { url: detail.sprites.officialArtwork, label: "Artwork oficial" },
    { url: detail.sprites.homeFront, label: "Home" },
    { url: detail.sprites.frontShiny, label: "Variante shiny" },
    { url: detail.sprites.backDefault, label: "Vista trasera" },
    { url: detail.sprites.backShiny, label: "Trasera shiny" },
    { url: detail.sprites.officialArtworkShiny, label: "Artwork shiny" },
    { url: detail.sprites.homeShiny, label: "Home shiny" },
  ];
  for (const g of galleryOrder) {
    if (!g.url) continue;
    slides.push({ kind: "gallery", imageUrl: g.url, label: g.label });
    if (slides.length >= MAX_SLIDES) break;
  }

  return slides;
}

function Slide({ slide, index }: { slide: CarouselSlide; index: number }) {
  if (slide.kind === "flavor") {
    return (
      <article
        className="pokemon-carousel__slide pokemon-carousel__slide--flavor"
        data-testid="pokemon-carousel-slide"
        data-variant={slide.kind}
      >
        <div className="pokemon-carousel__slide-flavor-grid">
          <div className="pokemon-carousel__slide-flavor-image">
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                aria-hidden="true"
                width={120}
                height={120}
                unoptimized
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
          <p
            className="pokemon-carousel__slide-flavor-text"
            style={{ overflowY: "auto" }}
          >
            {slide.flavor ?? "Sin descripción disponible."}
          </p>
        </div>
        <span className="sr-only">Diapositiva {index + 1}</span>
      </article>
    );
  }

  if (slide.kind === "hero") {
    return (
      <article
        className="pokemon-carousel__slide pokemon-carousel__slide--hero"
        data-testid="pokemon-carousel-slide"
        data-variant={slide.kind}
      >
        {slide.imageUrl ? (
          <Image
            src={slide.imageUrl}
            alt={`Imagen principal de ${detailAltFor(slide.imageUrl)}`}
            width={220}
            height={220}
            unoptimized
            priority
            className="pokemon-carousel__slide-hero-image"
          />
        ) : null}
        <span className="sr-only">Diapositiva {index + 1}</span>
      </article>
    );
  }

  return (
    <article
      className="pokemon-carousel__slide pokemon-carousel__slide--gallery"
      data-testid="pokemon-carousel-slide"
      data-variant={slide.kind}
    >
      {slide.imageUrl ? (
        <Image
          src={slide.imageUrl}
          alt={slide.label ?? "Imagen del pokemon"}
          width={200}
          height={200}
          unoptimized
          className="pokemon-carousel__slide-gallery-image"
        />
      ) : null}
      {slide.label ? (
        <span className="pokemon-carousel__slide-label">{slide.label}</span>
      ) : null}
      <span className="sr-only">Diapositiva {index + 1}</span>
    </article>
  );
}

function detailAltFor(url: string): string {
  return url.split("/").pop() ?? "pokemon";
}