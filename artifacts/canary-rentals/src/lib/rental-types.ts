export type RentalTypeKey = "vacacional" | "media-temporada" | "larga-temporada";

export interface VacationalConfig {
  enabled: boolean;
  dailyRate: number;
}

export interface TemporadaConfig {
  enabled: boolean;
  monthlyRate: number;
  maxDurationMonths?: number;
  internetIncluded: boolean;
  electricityIncluded: boolean;
  waterIncluded: boolean;
  communityFeesIncluded: boolean;
}

export interface RentalTypes {
  vacational?: VacationalConfig;
  mediaTemporada?: TemporadaConfig;
  largaTemporada?: TemporadaConfig;
}

export const RENTAL_TYPE_LABELS: Record<RentalTypeKey, string> = {
  vacacional: "Vacacional",
  "media-temporada": "Media Temporada",
  "larga-temporada": "Larga Temporada",
};

export const RENTAL_TYPE_DESCRIPTIONS: Record<RentalTypeKey, string> = {
  vacacional: "Affitti turistici a breve termine",
  "media-temporada": "Affitti medio termine fino a 6 mesi",
  "larga-temporada": "Affitti a lungo termine oltre 6 mesi",
};

export const RENTAL_TYPE_PRICE_UNIT: Record<RentalTypeKey, string> = {
  vacacional: "/ notte",
  "media-temporada": "/ mese",
  "larga-temporada": "/ mese",
};

export function hasRentalType(rentalTypes: unknown, type: RentalTypeKey): boolean {
  const rt = rentalTypes as RentalTypes | null | undefined;
  if (!rt) return type === "vacacional";
  switch (type) {
    case "vacacional":
      return rt.vacational?.enabled === true;
    case "media-temporada":
      return rt.mediaTemporada?.enabled === true;
    case "larga-temporada":
      return rt.largaTemporada?.enabled === true;
  }
}

export function getRentalTypePrice(
  rentalTypes: unknown,
  type: RentalTypeKey,
  fallbackNightlyRate?: number | null
): number | null {
  const rt = rentalTypes as RentalTypes | null | undefined;
  switch (type) {
    case "vacacional":
      return rt?.vacational?.dailyRate ?? fallbackNightlyRate ?? null;
    case "media-temporada":
      return rt?.mediaTemporada?.monthlyRate ?? null;
    case "larga-temporada":
      return rt?.largaTemporada?.monthlyRate ?? null;
  }
}

export function getTemporadaConfig(
  rentalTypes: unknown,
  type: "media-temporada" | "larga-temporada"
): TemporadaConfig | null {
  const rt = rentalTypes as RentalTypes | null | undefined;
  if (!rt) return null;
  switch (type) {
    case "media-temporada":
      return rt.mediaTemporada ?? null;
    case "larga-temporada":
      return rt.largaTemporada ?? null;
  }
}

export function isTemporada(type: RentalTypeKey): type is "media-temporada" | "larga-temporada" {
  return type === "media-temporada" || type === "larga-temporada";
}

export function parseRentalTypeFromSearch(search: string): RentalTypeKey {
  const p = new URLSearchParams(search).get("type");
  if (p === "media-temporada" || p === "larga-temporada") return p;
  return "vacacional";
}
