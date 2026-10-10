import { Router, type IRouter } from "express";
import {
  GetCountriesResponse,
  GetCountryBiodiversityParams,
  GetCountryBiodiversityResponse,
  GetFeaturedSpeciesResponse,
  GetSpeciesParams,
  GetSpeciesResponse,
  SearchSpeciesQueryParams,
  SearchSpeciesResponse,
} from "@workspace/api-zod";
import {
  getCountryBiodiversity,
  getFeaturedSpecies,
  getSpeciesById,
  listCountries,
  searchSpecies,
} from "../lib/biodiversity";
import { requestLimit } from "../middlewares/request-limit";

const router: IRouter = Router();

router.get("/countries", (_req, res): void => {
  res.json(GetCountriesResponse.parse(listCountries()));
});

router.get(
  "/countries/:code/biodiversity",
  requestLimit("inat-country", 45),
  async (req, res): Promise<void> => {
    const params = GetCountryBiodiversityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Use a valid country code." });
      return;
    }
    try {
      const result = await getCountryBiodiversity(params.data.code);
      if (!result) {
        res.status(404).json({ error: "Country not found." });
        return;
      }
      res.json(GetCountryBiodiversityResponse.parse(result));
    } catch (error) {
      req.log.warn(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "Biodiversity provider request failed",
      );
      res.status(502).json({
        error: "iNaturalist is temporarily unavailable. Please try this country again shortly.",
      });
    }
  },
);

router.get("/species/search", requestLimit("inat-search", 60), async (req, res): Promise<void> => {
  const query = SearchSpeciesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Enter at least two letters to search species." });
    return;
  }
  try {
    res.json(SearchSpeciesResponse.parse(await searchSpecies(query.data.q)));
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Species search provider request failed",
    );
    res.status(502).json({ error: "iNaturalist search is temporarily unavailable." });
  }
});

router.get("/species/featured", requestLimit("inat-featured", 60), async (req, res): Promise<void> => {
  try {
    res.json(GetFeaturedSpeciesResponse.parse(await getFeaturedSpecies()));
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Featured species provider request failed",
    );
    res.status(502).json({ error: "Featured species are temporarily unavailable." });
  }
});

router.get("/species/:id", requestLimit("inat-species", 90), async (req, res): Promise<void> => {
  const params = GetSpeciesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Use a valid iNaturalist taxon id." });
    return;
  }
  try {
    const species = await getSpeciesById(params.data.id);
    if (!species) {
      res.status(404).json({ error: "No iNaturalist taxon was found." });
      return;
    }
    res.json(GetSpeciesResponse.parse(species));
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Species detail provider request failed",
    );
    res.status(502).json({ error: "Species details are temporarily unavailable." });
  }
});

export default router;
