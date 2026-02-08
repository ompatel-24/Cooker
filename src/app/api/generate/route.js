import { NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";
import { generateCookingTip, generateRecipeVariations } from "@/lib/gemini";

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
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No matching recipes found. Try different ingredients or a different prompt." },
        { status: 404 }
      );
    }

    // Map Snowflake rows → frontend recipe schema
    const recipes = await Promise.all(
      rows.map(async (row) => {
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

        const ingredients = parseArr(row.INGREDIENTS);
        const steps = parseArr(row.STEPS);

        // Enrich with Gemini AI tips and variations
        let aiTip = null;
        let aiVariations = { healthier: null, faster: null };
        
        if (process.env.GEMINI_API_KEY) {
          try {
            const [tip, variations] = await Promise.all([
              generateCookingTip({ title: row.TITLE, ingredients, steps }, normalised),
              generateRecipeVariations({ title: row.TITLE, ingredients, steps }, normalised),
            ]);
            aiTip = tip;
            aiVariations = variations;
          } catch (geminiError) {
            console.warn("Gemini enrichment failed:", geminiError);
            // Continue without AI enrichment
          }
        }

        return {
          title: row.TITLE,
          ingredients,
          steps,
          time_to_make: row.TIME_TO_MAKE || "Unknown",
          nutrition: {
            calories: `${Math.round(row.CALORIES || 0)} kcal`,
            protein: `${Math.round(row.PROTEIN_G || 0)}g`,
            fat: `${Math.round(row.FAT_G || 0)}g`,
            carbohydrates: `${Math.round(row.CARBS_G || 0)}g`,
          },
          ai: {
            tip: aiTip,
            variations: aiVariations,
          },
        };
      })
    );

    return NextResponse.json({ result: { recipes } });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to query recipes" },
      { status: 500 }
    );
  }
}
