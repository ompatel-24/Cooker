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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
