const {
  apiCache,
  pendingApiSearches,
  EXTERNAL_SEARCH_TIMEOUT_MS
} = require("./foodSearch");

const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

function parseOFFProducts(data, sourceName = "Open Food Facts") {
  // Support both legacy (data.products) and Search-a-licious (data.hits) formats
  const items = data.hits || data.products || [];
  return items.map(p => {
    const n = p.nutriments || {};
    const foodName = String(p.product_name || p.product_name_en || p.generic_name || "").trim();
    const calories = Number(n["energy-kcal_100g"] || n["energy-kcal"] || 0);
    if (!foodName || !calories) return null;
    // brands can be a string or array depending on the endpoint
    const brandValue = Array.isArray(p.brands) ? p.brands.join(", ") : (p.brands || "Open Food Facts");
    return {
      externalCode: p.code || null,
      food_name: foodName,
      brand: brandValue,
      calories_per_100g: calories,
      protein_per_100g: Number(n.proteins_100g || 0),
      carbs_per_100g: Number(n.carbohydrates_100g || 0),
      fat_per_100g: Number(n.fat_100g || 0),
      source: sourceName
    };
  }).filter(Boolean);
}

function normalizeExternalFoodItem(item, sourceName) {
  const foodName = String(item.food_name || item.name || item.label || item.title || "").trim();
  const calories = Number(
    item.calories_per_100g ||
    item.calories ||
    item.energy_kcal ||
    item.energyKcal ||
    item.nutrients?.ENERC_KCAL ||
    0
  );

  if (!foodName || !calories) return null;

  return {
    food_name: foodName,
    brand: item.brand || item.brand_name || sourceName,
    calories_per_100g: calories,
    protein_per_100g: Number(item.protein_per_100g || item.protein || item.protein_g || item.nutrients?.PROCNT || 0),
    carbs_per_100g: Number(item.carbs_per_100g || item.carbs || item.carbohydrates || item.carbohydrates_total_g || item.nutrients?.CHOCDF || 0),
    fat_per_100g: Number(item.fat_per_100g || item.fat || item.fat_total_g || item.nutrients?.FAT || 0),
    source: sourceName
  };
}

function extractFoodItems(data) {
  if (Array.isArray(data)) return data;
  return data?.foods || data?.items || data?.results || data?.data || data?.hints || [];
}

function buildProviderUrl(baseUrl, searchTerm) {
  if (baseUrl.includes("{query}")) {
    return baseUrl.replace("{query}", encodeURIComponent(searchTerm));
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}q=${encodeURIComponent(searchTerm)}`;
}

function fetchConfiguredFoodProvider({ baseUrl, apiKey, headerName = "Authorization", sourceName }, searchTerm) {
  if (!baseUrl) return null;

  const headers = {};
  if (apiKey) {
    headers[headerName] = headerName.toLowerCase() === "authorization" ? `Bearer ${apiKey}` : apiKey;
  }

  return fetchWithTimeout(buildProviderUrl(baseUrl, searchTerm), { headers }, 2500)
    .then(resp => resp.json())
    .then(data => extractFoodItems(data)
      .map(item => normalizeExternalFoodItem(item.food || item, sourceName))
      .filter(Boolean))
    .catch(err => { console.log(`[API] ${sourceName} failed:`, err.message); return []; });
}

function fetchOpenFoodFactsSearch(url, sourceName) {
  return fetchWithTimeout(url, {
    headers: {
      "User-Agent": "NutriTrack/1.0 (student-project)"
    }
  }, EXTERNAL_SEARCH_TIMEOUT_MS)
    .then(resp => resp.json())
    .then(data => parseOFFProducts(data, sourceName))
    .catch(err => { console.log(`[API] ${sourceName} failed:`, err.message); return []; });
}

async function fetchExternalFoodResults(searchTerm) {
  const fetchPromises = [];
  const indianProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.INDIAN_FOOD_API_URL,
    apiKey: process.env.INDIAN_FOOD_API_KEY,
    headerName: process.env.INDIAN_FOOD_API_HEADER || "Authorization",
    sourceName: "Indian Nutrition API"
  }, searchTerm);
  const bonHappeteeProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.BONHAPPETEE_API_URL,
    apiKey: process.env.BONHAPPETEE_API_KEY,
    headerName: process.env.BONHAPPETEE_API_HEADER || "Authorization",
    sourceName: "Bon Happetee"
  }, searchTerm);
  const apyfluxIndianProvider = fetchConfiguredFoodProvider({
    baseUrl: process.env.APYFLUX_INDIAN_FOOD_API_URL,
    apiKey: process.env.APYFLUX_INDIAN_FOOD_API_KEY,
    headerName: process.env.APYFLUX_INDIAN_FOOD_API_HEADER || "Authorization",
    sourceName: "Apyflux Indian Food API"
  }, searchTerm);

  if (indianProvider) fetchPromises.push(indianProvider);
  if (bonHappeteeProvider) fetchPromises.push(bonHappeteeProvider);
  if (apyfluxIndianProvider) fetchPromises.push(apyfluxIndianProvider);

  // A. Open Food Facts India country-filtered API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(searchTerm)}&countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=20`,
      "Open Food Facts India"
    )
  );

  // B. Open Food Facts India subdomain API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=20`,
      "Open Food Facts India"
    )
  );

  // C. Open Food Facts India-biased Search-a-licious API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(`${searchTerm} india`)}&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=15`,
      "Open Food Facts India"
    )
  );

  // D. Open Food Facts broad Search-a-licious API.
  fetchPromises.push(
    fetchOpenFoodFactsSearch(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(searchTerm)}&fields=code,product_name,product_name_en,generic_name,brands,nutriments&page_size=15`,
      "Open Food Facts"
    )
  );

  // E. CalorieNinjas
  if (process.env.CALORIENINJAS_API_KEY) {
    fetchPromises.push(
      fetchWithTimeout(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(searchTerm)}`, {
        headers: { "X-Api-Key": process.env.CALORIENINJAS_API_KEY }
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.items || []).map(item => {
          const servingG = Number(item.serving_size_g) || 100;
          return {
            food_name: item.name, brand: "CalorieNinjas",
            calories_per_100g: Math.round((item.calories || 0) * (100 / servingG)),
            protein_per_100g: Math.round(((item.protein_g || 0) * (100 / servingG)) * 10) / 10,
            carbs_per_100g: Math.round(((item.carbohydrates_total_g || 0) * (100 / servingG)) * 10) / 10,
            fat_per_100g: Math.round(((item.fat_total_g || 0) * (100 / servingG)) * 10) / 10,
            source: "CalorieNinjas"
          };
        }))
        .catch(err => { console.log("[API] CalorieNinjas failed:", err.message); return []; })
    );
  }

  // F. Nutritionix natural nutrients.
  if (process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY) {
    fetchPromises.push(
      fetchWithTimeout("https://trackapi.nutritionix.com/v2/natural/nutrients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": process.env.NUTRITIONIX_APP_ID,
          "x-app-key": process.env.NUTRITIONIX_APP_KEY
        },
        body: JSON.stringify({ query: searchTerm })
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.foods || []).map(item => {
          const servingG = Number(item.serving_weight_grams) || 100;
          const factor = 100 / servingG;
          return {
            food_name: item.food_name,
            brand: item.brand_name || "Nutritionix",
            calories_per_100g: Math.round(Number(item.nf_calories || 0) * factor),
            protein_per_100g: Math.round(Number(item.nf_protein || 0) * factor * 10) / 10,
            carbs_per_100g: Math.round(Number(item.nf_total_carbohydrate || 0) * factor * 10) / 10,
            fat_per_100g: Math.round(Number(item.nf_total_fat || 0) * factor * 10) / 10,
            source: "Nutritionix"
          };
        }))
        .catch(err => { console.log("[API] Nutritionix failed:", err.message); return []; })
    );
  }

  // G. Edamam
  if (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) {
    const edamamUrl = `https://api.edamam.com/api/food-database/v2/parser?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(searchTerm)}`;
    fetchPromises.push(
      fetchWithTimeout(edamamUrl, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.parsed || []).concat(data.hints || []).slice(0, 10).map(item => {
          const fd = item.food;
          if (!fd || !fd.nutrients) return null;
          return {
            food_name: fd.label, brand: fd.brand || "Edamam",
            calories_per_100g: fd.nutrients.ENERC_KCAL || 0,
            protein_per_100g: fd.nutrients.PROCNT || 0,
            carbs_per_100g: fd.nutrients.CHOCDF || 0,
            fat_per_100g: fd.nutrients.FAT || 0,
            source: "Edamam"
          };
        }).filter(Boolean))
        .catch(err => { console.log("[API] Edamam failed:", err.message); return []; })
    );
  }

  // H. Spoonacular ingredients.
  if (process.env.SPOONACULAR_API_KEY) {
    fetchPromises.push(
      fetchWithTimeout(`https://api.spoonacular.com/food/ingredients/search?apiKey=${process.env.SPOONACULAR_API_KEY}&query=${encodeURIComponent(searchTerm)}&number=10&metaInformation=true`, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.results || []).map(item => normalizeExternalFoodItem({
          food_name: item.name,
          brand: "Spoonacular",
          calories_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Calories")?.amount || 0,
          protein_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Protein")?.amount || 0,
          carbs_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Carbohydrates")?.amount || 0,
          fat_per_100g: item.nutrition?.nutrients?.find(n => n.name === "Fat")?.amount || 0
        }, "Spoonacular")).filter(Boolean))
        .catch(err => { console.log("[API] Spoonacular failed:", err.message); return []; })
    );
  }

  // I. USDA FoodData Central
  const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";
  fetchPromises.push(
    fetchWithTimeout(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(searchTerm)}&pageSize=10`, {}, EXTERNAL_SEARCH_TIMEOUT_MS)
      .then(resp => resp.json())
      .then(data => (data.foods || []).map(fd => {
        const getNutrient = (id) => (fd.foodNutrients || []).find(n => n.nutrientId === id)?.value || 0;
        return {
          food_name: fd.description, brand: fd.brandOwner || "USDA",
          calories_per_100g: getNutrient(1008),
          protein_per_100g: getNutrient(1003),
          carbs_per_100g: getNutrient(1005),
          fat_per_100g: getNutrient(1004),
          source: usdaKey === "DEMO_KEY" ? "USDA (Demo Key)" : "USDA"
        };
      }))
      .catch(err => { console.log("[API] USDA failed:", err.message); return []; })
  );

  // J. FatSecret
  if (process.env.FATSECRET_ACCESS_TOKEN) {
    fetchPromises.push(
      fetchWithTimeout(`https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(searchTerm)}&format=json`, {
        headers: { "Authorization": `Bearer ${process.env.FATSECRET_ACCESS_TOKEN}` }
      }, EXTERNAL_SEARCH_TIMEOUT_MS)
        .then(resp => resp.json())
        .then(data => (data.foods?.food || []).map(fd => ({
          food_name: fd.food_name, brand: fd.brand_name || "FatSecret",
          calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0,
          source: "FatSecret"
        })))
        .catch(err => { console.log("[API] FatSecret failed:", err.message); return []; })
    );
  }

  const settled = await Promise.allSettled(fetchPromises);
  return settled.reduce((foods, result) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      foods.push(...result.value);
    }
    return foods;
  }, []);
}

function refreshExternalFoodCache(searchTerm, cacheKey) {
  if (pendingApiSearches.has(cacheKey)) return;

  pendingApiSearches.add(cacheKey);
  fetchExternalFoodResults(searchTerm)
    .then(apiFoods => {
      if (apiCache.size > 200) {
        const oldestKey = apiCache.keys().next().value;
        apiCache.delete(oldestKey);
      }
      apiCache.set(cacheKey, { data: apiFoods, timestamp: Date.now() });
      console.log(`[Search] "${searchTerm}" => External cache refreshed (${apiFoods.length})`);
    })
    .catch(err => console.log("[API] Food cache refresh failed:", err.message))
    .finally(() => pendingApiSearches.delete(cacheKey));
}

module.exports = {
  fetchWithTimeout,
  fetchExternalFoodResults,
  refreshExternalFoodCache
};
