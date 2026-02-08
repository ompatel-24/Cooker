import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Use Gemini to generate cooking tips and insights for a recipe
 * @param {object} recipe - Recipe object with title, ingredients, steps
 * @param {string[]} detectedIngredients - Ingredients detected from image
 * @returns {Promise<string>} - AI-generated cooking tip or insight
 */
export async function generateCookingTip(recipe, detectedIngredients = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a helpful cooking assistant. Given this recipe and detected ingredients, provide ONE concise, practical cooking tip or insight (max 2 sentences).

Recipe: ${recipe.title}
Detected Ingredients: ${detectedIngredients.join(", ") || "none"}
Recipe Ingredients: ${Array.isArray(recipe.ingredients) ? recipe.ingredients.join(", ") : recipe.ingredients}

Tip:`;

    const result = await model.generateContent(prompt);
    const tip = result.response.text().trim();
    return tip;
  } catch (error) {
    console.error("Gemini tip generation error:", error);
    return null;
  }
}

/**
 * Use Gemini to suggest ingredient substitutions or variations
 * @param {object} recipe - Recipe object
 * @param {string[]} detectedIngredients - Detected ingredients from image
 * @returns {Promise<object>} - Object with substitutions or variations
 */
export async function generateRecipeVariations(recipe, detectedIngredients = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a cooking expert. Given this recipe and detected ingredients, suggest quick modifications (max 1-2 sentences total).

Recipe: ${recipe.title}
Detected Ingredients: ${detectedIngredients.join(", ") || "none"}

Provide:
1. A healthier version tip (1 sentence)
2. A faster version tip (1 sentence)

Format as JSON: {"healthier": "...", "faster": "..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { healthier: null, faster: null };
  } catch (error) {
    console.error("Gemini variations error:", error);
    return { healthier: null, faster: null };
  }
}

/**
 * Use Gemini to clean up and validate recipes
 * Fixes: spelling, grammar, capitalization, formatting
 * @param {object[]} recipes - Array of recipe objects
 * @returns {Promise<object[]>} - Cleaned recipe objects
 */
export async function cleanRecipes(recipes) {
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY not set, skipping recipe cleaning");
    return recipes;
  }

  if (!recipes || recipes.length === 0) {
    console.log("No recipes to clean");
    return recipes;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const recipesJson = JSON.stringify(recipes, null, 2);

    const prompt = `You are a recipe quality assurance expert. Clean up the following recipes by:
1. Fixing any spelling errors
2. Fixing any grammar errors
3. Ensuring the title starts with a capital letter and is properly formatted
4. Fixing capitalization in ingredient names
5. Ensuring steps are clear and grammatically correct
6. Keeping all data structure intact

Return ONLY valid JSON array with the cleaned recipes. Do not add any additional text or explanation.

Recipes to clean:
${recipesJson}`;

    console.log("Calling Gemini to clean recipes...");
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log("Gemini response received");

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const cleanedRecipes = JSON.parse(jsonMatch[0]);
      console.log("Successfully cleaned recipes");
      return cleanedRecipes;
    }

    console.warn("Failed to parse cleaned recipes, returning originals");
    return recipes;
  } catch (error) {
    console.warn("Gemini recipe cleaning failed:", error.message);
    // Return original recipes on any error - don't break the request
    return recipes;
  }
}
