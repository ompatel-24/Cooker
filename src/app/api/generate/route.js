import { NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";
import { generateCookingTip, generateRecipeVariations, cleanRecipes } from "@/lib/gemini";

/**
 * POST /api/generate
 * Body: { prompt: string, ingredients: string[] }
 *
 * Queries Snowflake for the top 3 recipes that best match the detected
 * ingredients and/or prompt keywords. Uses fuzzy (ILIKE) matching so
 * "tomato" matches "diced tomatoes", "tomato sauce", etc.
 */
export async function POST(req) {
  try {
    const { prompt, ingredients } = await req.json();

    const normalised = (Array.isArray(ingredients) ? ingredients : [])
      .map((i) => i.toLowerCase().trim())
      .filter(Boolean);

    const promptKeywords = (prompt || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5);

    if (normalised.length === 0 && promptKeywords.length === 0) {
      return NextResponse.json(
        { error: "Please provide ingredients or a search prompt" },
        { status: 400 }
      );
    }

    let recipes = [];

    // --- Try external API first ---
    console.log("Trying external API first...");
    console.log("Sending ingredients:", normalised);
    try {
      const externalResp = await fetch(
        "https://gemini-snowflake-cxc2026.onrender.com/recipes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fridge_items: normalised,
            prompt: prompt || "",
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      const externalData = await externalResp.json();
      console.log(
        "External API response:",
        JSON.stringify(externalData).substring(0, 300)
      );
      console.log(
        `External API returned ${Array.isArray(externalData) ? externalData.length : 0} items`
      );

      if (externalResp.ok && Array.isArray(externalData) && externalData.length > 0) {
        console.log("External API SUCCESS - Converting recipes...");
        recipes = externalData.slice(0, 3).map((item) => {
          const parseArr = (val) => {
            if (Array.isArray(val)) return val;
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch {
                return val.split(",").map((s) => s.trim());
              }
            }
            return [];
          };

          return {
            title: item.title,
            ingredients: parseArr(item.NER || item.ingredients || "[]"),
            steps: parseArr(item.directions || item.steps || "[]"),
            time_to_make: item.time_to_make || "Unknown",
            nutrition: {
              calories: item.calories || "Unknown",
              protein: item.protein || "Unknown",
              fat: item.fat || "Unknown",
              carbohydrates: item.carbs || "Unknown",
            },
            source: "external",
          };
        });
      } else {
        console.log("External API returned empty or error");
      }
    } catch (externalError) {
      console.warn("External API call failed:", externalError.message);
    }

    // --- Fallback to Snowflake if no external results ---
    if (recipes.length === 0) {
      console.log("External API returned no results, trying Snowflake...");

      let rows = [];

      if (normalised.length > 0) {
        // --- Ingredient-based search using fuzzy ILIKE matching ---
        // For each detected ingredient, count how many recipe ingredients
        // contain that word (e.g. "tomato" matches "diced tomatoes").
        // We build a SUM of CASE expressions for each detected ingredient.
        const matchCases = normalised
          .map(
            (_, idx) =>
              `MAX(CASE WHEN LOWER(f.VALUE::STRING) ILIKE ? THEN 1 ELSE 0 END)`
          )
          .join(" + ");

        const ingredientBinds = normalised.map((ing) => `%${ing}%`);

        let promptClause = "";
        const promptBinds = [];
        if (promptKeywords.length > 0) {
          const conditions = promptKeywords.map(() => "LOWER(r.TITLE) ILIKE ?");
          promptClause = `HAVING (${conditions.join(" OR ")})`;
          promptKeywords.forEach((kw) => promptBinds.push(`%${kw}%`));
        }

        // Use FLATTEN to check each recipe's ingredients array, then
        // aggregate back to get a match score per recipe.
        const sql = `
          SELECT
            r.TITLE,
            r.INGREDIENTS,
            r.STEPS,
            r.TIME_TO_MAKE,
            r.CALORIES,
            r.PROTEIN_G,
            r.FAT_G,
            r.CARBS_G,
            (${matchCases}) AS MATCH_SCORE
          FROM RECIPES r,
            TABLE(FLATTEN(input => r.INGREDIENTS)) f
          GROUP BY r.ID, r.TITLE, r.INGREDIENTS, r.STEPS, r.TIME_TO_MAKE,
                   r.CALORIES, r.PROTEIN_G, r.FAT_G, r.CARBS_G
          HAVING MATCH_SCORE > 0
          ${promptClause ? `AND (${promptClause.replace("HAVING ", "")})` : ""}
          ORDER BY MATCH_SCORE DESC, r.CALORIES ASC
          LIMIT 3
        `;

        rows = await querySnowflake(sql, [...ingredientBinds, ...promptBinds]);

        // Fallback: drop prompt filter if no results
        if (rows.length === 0 && promptBinds.length > 0) {
          console.log("Snowflake returned 0 with prompt, trying without prompt...");
          const fallbackSql = `
            SELECT
              r.TITLE,
              r.INGREDIENTS,
              r.STEPS,
              r.TIME_TO_MAKE,
              r.CALORIES,
              r.PROTEIN_G,
              r.FAT_G,
              r.CARBS_G,
              (${matchCases}) AS MATCH_SCORE
            FROM RECIPES r,
              TABLE(FLATTEN(input => r.INGREDIENTS)) f
            GROUP BY r.ID, r.TITLE, r.INGREDIENTS, r.STEPS, r.TIME_TO_MAKE,
                     r.CALORIES, r.PROTEIN_G, r.FAT_G, r.CARBS_G
            HAVING MATCH_SCORE > 0
            ORDER BY MATCH_SCORE DESC, r.CALORIES ASC
            LIMIT 3
          `;
          rows = await querySnowflake(fallbackSql, ingredientBinds);
          console.log(`Snowflake fallback returned ${rows.length} recipes`);
        } else {
          console.log(`Snowflake returned ${rows.length} recipes`);
        }
      } else {
        // --- Prompt-only search (no ingredients detected) ---
        const conditions = promptKeywords.map(() => "LOWER(r.TITLE) ILIKE ?");
        const sql = `
          SELECT
            r.TITLE,
            r.INGREDIENTS,
            r.STEPS,
            r.TIME_TO_MAKE,
            r.CALORIES,
            r.PROTEIN_G,
            r.FAT_G,
            r.CARBS_G
          FROM RECIPES r
          WHERE ${conditions.join(" OR ")}
          ORDER BY r.CALORIES ASC
          LIMIT 3
        `;
        rows = await querySnowflake(
          sql,
          promptKeywords.map((kw) => `%${kw}%`)
        );
        console.log(`Snowflake prompt-only search returned ${rows.length} recipes`);
      }

      console.log(`Converting ${rows.length} Snowflake rows to recipes...`);
      // Convert Snowflake rows to recipe format
      recipes = rows.map((row) => {
        const parseArr = (val) => {
          if (Array.isArray(val)) return val;
          if (typeof val === "string") {
            try {
              return JSON.parse(val);
            } catch {
              return [];
            }
          }
          return [];
        };

        return {
          title: row.TITLE,
          ingredients: parseArr(row.INGREDIENTS),
          steps: parseArr(row.STEPS),
          time_to_make: row.TIME_TO_MAKE || "Unknown",
          nutrition: {
            calories: `${Math.round(row.CALORIES || 0)} kcal`,
            protein: `${Math.round(row.PROTEIN_G || 0)}g`,
            fat: `${Math.round(row.FAT_G || 0)}g`,
            carbohydrates: `${Math.round(row.CARBS_G || 0)}g`,
          },
          source: "snowflake",
        };
      });
    }

    if (recipes.length === 0) {
      // Fallback: Try external API if Snowflake returns nothing
      console.log("Snowflake returned no results, trying external API...");
      try {
        const externalResp = await fetch(
          "https://gemini-snowflake-cxc2026.onrender.com/recipes",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fridge_items: normalised,
              prompt: prompt || "",
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        const externalData = await externalResp.json();
        console.log(
          `External API returned ${Array.isArray(externalData) ? externalData.length : 0} recipes`
        );

        if (externalResp.ok && Array.isArray(externalData) && externalData.length > 0) {
          // Convert external API format to our format
          recipes = externalData.slice(0, 3).map((item) => {
            const parseArr = (val) => {
              if (Array.isArray(val)) return val;
              if (typeof val === "string") {
                try {
                  return JSON.parse(val);
                } catch {
                  return val.split(",").map((s) => s.trim());
                }
              }
              return [];
            };

            return {
              title: item.title,
              ingredients: parseArr(item.NER || item.ingredients || "[]"),
              steps: parseArr(item.directions || item.steps || "[]"),
              time_to_make: item.time_to_make || "Unknown",
              nutrition: {
                calories: item.calories || "Unknown",
                protein: item.protein || "Unknown",
                fat: item.fat || "Unknown",
                carbohydrates: item.carbs || "Unknown",
              },
            };
          });
          console.log(`Successfully converted ${recipes.length} recipes from external API`);
        } else {
          console.log("External API returned no recipes or error");
        }
      } catch (externalError) {
        console.warn("External API fallback failed:", externalError.message);
      }
    }

    if (recipes.length === 0) {
      return NextResponse.json(
        {
          error:
            "No matching recipes found. Try different ingredients or a different prompt.",
        },
        { status: 404 }
      );
    }

    // Enrich all recipes (from either source) with Gemini tips and variations
    const enrichedRecipes = recipes.map((recipe) => {
      return {
        ...recipe,
        ai: {
          tip: null,
          variations: { healthier: null, faster: null },
        },
      };
    });

    // Clean up recipes (fix spelling, grammar, capitalization)
    // Only if Gemini API key exists and we're not hitting quota
    let finalRecipes = enrichedRecipes;
    if (process.env.GEMINI_API_KEY) {
      console.log("Cleaning recipes with Gemini...");
      const cleanedRecipes = await cleanRecipes(enrichedRecipes);
      if (cleanedRecipes && cleanedRecipes.length > 0) {
        finalRecipes = cleanedRecipes;
        console.log("Cleaned recipes received");
      } else {
        console.log("Gemini cleaning failed, returning original recipes");
      }
    } else {
      console.log("Gemini API key not set, skipping recipe cleaning");
    }

    return NextResponse.json({ result: { recipes: finalRecipes } });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to query recipes" },
      { status: 500 }
    );
  }
}
