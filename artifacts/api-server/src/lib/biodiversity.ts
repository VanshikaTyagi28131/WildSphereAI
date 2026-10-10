import countries, { type Country } from "world-countries";

type InatPhoto = {
  medium_url?: string | null;
  url?: string | null;
  attribution?: string | null;
  attribution_name?: string | null;
};

type InatConservationStatus = {
  status_name?: string | null;
  url?: string | null;
};

type InatTaxon = {
  id: number;
  name: string;
  preferred_common_name?: string | null;
  iconic_taxon_name?: string | null;
  default_photo?: InatPhoto | null;
  observations_count?: number | null;
  wikipedia_summary?: string | null;
  wikipedia_url?: string | null;
  conservation_status?: InatConservationStatus | null;
  conservation_statuses?: InatConservationStatus[] | null;
};

type InatSpeciesCount = { count: number; taxon: InatTaxon };
type InatPlace = { id: number; name: string; admin_level?: number | null };

export type CountrySummary = {
  code: string;
  name: string;
  region: string;
  subregion: string;
  flag: string;
};

export type SpeciesRecord = {
  id: number;
  name: string;
  scientificName: string;
  category: string;
  photoUrl: string | null;
  attribution: string | null;
  observationsCount: number | null;
  lastObserved: string | null;
  description: string | null;
  habitat: string | null;
  range: string | null;
  conservationStatus: string | null;
  conservationSourceUrl: string | null;
  sourceUrl: string;
  recordType: string;
};

export type CountryBiodiversity = {
  country: CountrySummary;
  overview: string;
  habitats: string[];
  animals: SpeciesRecord[];
  birds: SpeciesRecord[];
  plants: SpeciesRecord[];
  source: string;
  limitations: string[];
};

const inatBase = "https://api.inaturalist.org/v1";
const cache = new Map<string, { until: number; value: unknown }>();
const cacheMs = 15 * 60 * 1000;
const countryList = (countries as Country[])
  .filter((country) => /^\d{3}$/.test(country.ccn3))
  .map((country): CountrySummary => ({
    code: country.ccn3,
    name: country.name.common,
    region: country.region || "Other",
    subregion: country.subregion || "Not specified",
    flag: country.flag || "",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

async function cachedJson<T>(url: string): Promise<T> {
  const current = cache.get(url);
  if (current && current.until > Date.now()) return current.value as T;

  const response = await fetch(url, {
    headers: { "User-Agent": "WildSphereAI/1.0 (biodiversity learning app)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`iNaturalist returned HTTP ${response.status}`);
  }
  const value = (await response.json()) as T;
  if (cache.size > 1_000) cache.clear();
  cache.set(url, { value, until: Date.now() + cacheMs });
  return value;
}

function countryByCode(code: string): CountrySummary | undefined {
  const normalized = code.toUpperCase();
  return countryList.find((country) => country.code === normalized);
}

function countrySource(code: string): Country | undefined {
  const normalized = code.toUpperCase();
  return (countries as Country[]).find((country) => country.ccn3 === normalized);
}

function categoryFor(taxon: InatTaxon): string {
  if (taxon.iconic_taxon_name === "Aves") return "Bird";
  if (taxon.iconic_taxon_name === "Plantae") return "Plant";
  return "Animal";
}

function mapTaxon(taxon: InatTaxon, count?: number): SpeciesRecord {
  const conservation =
    taxon.conservation_status ??
    taxon.conservation_statuses?.find((status) => status.status_name) ??
    null;
  return {
    id: taxon.id,
    name: taxon.preferred_common_name || taxon.name,
    scientificName: taxon.name,
    category: categoryFor(taxon),
    photoUrl: taxon.default_photo?.medium_url || taxon.default_photo?.url || null,
    attribution:
      taxon.default_photo?.attribution ||
      taxon.default_photo?.attribution_name ||
      null,
    observationsCount: count ?? taxon.observations_count ?? null,
    lastObserved: null,
    description: taxon.wikipedia_summary || null,
    habitat: null,
    range: null,
    conservationStatus: conservation?.status_name || null,
    conservationSourceUrl: conservation?.url || null,
    sourceUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
    recordType:
      count === undefined
        ? "iNaturalist taxon profile"
        : "Frequently recorded in available iNaturalist observations",
  };
}

async function getPlaceId(countryName: string): Promise<number | null> {
  const url = `${inatBase}/places/autocomplete?q=${encodeURIComponent(countryName)}&per_page=20`;
  const data = await cachedJson<{ results?: InatPlace[] }>(url);
  const results = data.results || [];
  const exact = results.find(
    (place) =>
      place.admin_level === 0 &&
      place.name.toLocaleLowerCase() === countryName.toLocaleLowerCase(),
  );
  const countryLevel = results.find((place) => place.admin_level === 0);
  return exact?.id ?? countryLevel?.id ?? null;
}

async function getSpeciesCounts(
  placeId: number | null,
  taxonId: number,
  perPage: number,
): Promise<SpeciesRecord[]> {
  const params = new URLSearchParams({
    taxon_id: String(taxonId),
    per_page: String(perPage),
    order: "desc",
    order_by: "observations_count",
    locale: "en",
  });
  if (placeId !== null) params.set("place_id", String(placeId));
  const data = await cachedJson<{ results?: InatSpeciesCount[] }>(
    `${inatBase}/observations/species_counts?${params.toString()}`,
  );
  return (data.results || []).map(({ count, taxon }) => mapTaxon(taxon, count));
}

export function listCountries(): CountrySummary[] {
  return countryList;
}

export async function getCountryBiodiversity(
  code: string,
): Promise<CountryBiodiversity | null> {
  const summary = countryByCode(code);
  const sourceCountry = countrySource(code);
  if (!summary || !sourceCountry) return null;

  const placeId = await getPlaceId(summary.name);
  if (placeId === null) {
    return {
      country: summary,
      overview:
        "No matching country-level iNaturalist place was found. The map is still available, but this panel has no source records to show.",
      habitats: [],
      animals: [],
      birds: [],
      plants: [],
      source: "iNaturalist",
      limitations: [
        "No country-level place match was found for this country name.",
        "Habitat types and native status are not inferred from observation records.",
      ],
    };
  }

  const [animalRecords, birdRecords, plantRecords] = await Promise.all([
    getSpeciesCounts(placeId, 1, 18),
    getSpeciesCounts(placeId, 3, 8),
    getSpeciesCounts(placeId, 47126, 8),
  ]);

  return {
    country: summary,
    overview:
      `These are species with frequent records in available iNaturalist observations for ${summary.name}. They are not a census or a definitive list of the country's wildlife.`,
    habitats: [],
    animals: animalRecords.filter((species) => species.category !== "Bird"),
    birds: birdRecords,
    plants: plantRecords,
    source: "iNaturalist observation records",
    limitations: [
      "Observation counts reflect community submissions, not population size or ecological abundance.",
      "A recorded observation does not establish that a species is native, endemic, invasive, or resident.",
      "Habitat and geographic range are shown only when available from a species source; they are not inferred from these records.",
      `Country naming and region metadata: world-countries dataset (${sourceCountry.cca3}).`,
    ],
  };
}

export async function searchSpecies(query: string): Promise<SpeciesRecord[]> {
  const params = new URLSearchParams({
    q: query,
    per_page: "10",
    locale: "en",
  });
  const data = await cachedJson<{ results?: InatTaxon[] }>(
    `${inatBase}/taxa/autocomplete?${params.toString()}`,
  );
  return (data.results || []).map((taxon) => mapTaxon(taxon));
}

export async function getSpeciesById(id: number): Promise<SpeciesRecord | null> {
  const data = await cachedJson<unknown>(`${inatBase}/taxa/${id}`);
  let taxon: InatTaxon | undefined;
  if (Array.isArray(data)) {
    taxon = data[0] as InatTaxon | undefined;
  } else if (data && typeof data === "object") {
    const record = data as { results?: InatTaxon[]; id?: number };
    taxon = record.results?.[0] ?? (record.id ? (record as InatTaxon) : undefined);
  }
  return taxon ? mapTaxon(taxon) : null;
}

export async function getFeaturedSpecies(): Promise<SpeciesRecord[]> {
  const [animals, birds, plants] = await Promise.all([
    getSpeciesCounts(null, 1, 3),
    getSpeciesCounts(null, 3, 3),
    getSpeciesCounts(null, 47126, 3),
  ]);
  const unique = new Map<number, SpeciesRecord>();
  for (const species of [...animals, ...birds, ...plants]) {
    unique.set(species.id, species);
  }
  return [...unique.values()].slice(0, 9);
}
