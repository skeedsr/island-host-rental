import { useQuery } from "@tanstack/react-query";

export interface PublicProperty {
  id: number;
  name: string;
  location: string;
  description: string | null;
  vvLicense: string | null;
  igicEnabled: boolean;
  nightlyRate: number;
  maxGuests: number;
  photos: string[];
  icalImportUrls: string[];
  icalExportToken: string;
  rentalTypes: unknown;
  nightly_rate: number;
  max_guests: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchPublicProperties(): Promise<PublicProperty[]> {
  const res = await fetch("/api/properties/public");
  if (!res.ok) throw new Error("Failed to load properties");
  return res.json();
}

export function usePublicProperties() {
  return useQuery<PublicProperty[]>({
    queryKey: ["properties", "public"],
    queryFn: fetchPublicProperties,
    staleTime: 5 * 60 * 1000,
  });
}
