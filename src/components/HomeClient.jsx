"use client";

import { useEffect, useState } from "react";
import {
  FiUpload,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCheckCircle,
  FiZap,
  FiShield,
  FiHeart,
} from "react-icons/fi";
import LoginButton from "@/components/LoginButton";

const RecipeBlock = ({ recipe, onSave, onRemove, isSaved, canSave }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ingredientPreview = (recipe.ingredients || []).slice(0, 3).join(" • ");
  const stepPreview = (recipe.steps || [])[0];
  const ingredientCount = recipe.ingredients?.length || 0;

  return (
    <div className="group relative rounded-2xl border border-gray-200 dark:border-gray-800 my-4 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white/90 dark:bg-gray-900/80">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-blue-50/80 via-purple-50/60 to-transparent dark:from-blue-900/20 dark:via-purple-900/15" />

      <button
        type="button"
        className="relative w-full text-left flex items-start justify-between gap-4 p-5 md:p-6"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
              {recipe.time_to_make || "Time unknown"}
            </span>
            {recipe?.nutrition?.calories && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200 border border-green-100 dark:border-green-800">
                {recipe.nutrition.calories} kcal
              </span>
            )}
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              {ingredientCount} ingredients
            </span>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white leading-snug">
            {recipe.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {stepPreview || ingredientPreview || "Tap to see details and steps."}
          </p>

          <div className="flex flex-wrap gap-2">
            {(recipe.ingredients || []).slice(0, 4).map((ing, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              >
                {ing}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <span className="text-sm font-medium">{isExpanded ? "Hide details" : "View details"}</span>
          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </button>

      {isExpanded && (
        <div className="relative border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/70 p-5 md:p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Ingredients</h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {(recipe.ingredients || []).map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{ing}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Nutrition</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-3">
                  <div className="text-xs text-blue-800/80 dark:text-blue-100/80">Calories</div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-50">
                    {recipe?.nutrition?.calories ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 p-3">
                  <div className="text-xs text-green-800/80 dark:text-green-100/80">Protein</div>
                  <div className="text-lg font-semibold text-green-900 dark:text-green-50">
                    {recipe?.nutrition?.protein ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-100 dark:border-yellow-800 p-3">
                  <div className="text-xs text-yellow-800/80 dark:text-yellow-100/80">Fat</div>
                  <div className="text-lg font-semibold text-yellow-900 dark:text-yellow-50">
                    {recipe?.nutrition?.fat ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 p-3">
                  <div className="text-xs text-purple-800/80 dark:text-purple-100/80">Carbs</div>
                  <div className="text-lg font-semibold text-purple-900 dark:text-purple-50">
                    {recipe?.nutrition?.carbohydrates || recipe?.nutrition?.carbs || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Preparation Steps</h4>
            <ol className="space-y-3">
              {(recipe.steps || []).map((step, i) => (
                <li key={i} className="relative pl-9">
                  <span className="absolute left-0 top-1 flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</div>
                </li>
              ))}
            </ol>
          </div>

          {canSave && (
            <div className="flex flex-wrap gap-3">
              {isSaved ? (
                <button
                  type="button"
                  onClick={() => onRemove?.(recipe.title)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                >
                  Remove from saved
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSave?.(recipe)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Save recipe
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function HomeClient({ user }) {
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textOutput, setTextOutput] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  // Supabase user row returned from /api/me
  const [appUser, setAppUser] = useState(null);
  const [appUserError, setAppUserError] = useState("");

  // Map Auth0 user -> Supabase user (upsert) when logged in
  useEffect(() => {
    const syncUser = async () => {
      if (!user) {
        setAppUser(null);
        setAppUserError("");
        setSavedRecipes([]);
        return;
      }

      try {
        const resp = await fetch("/api/me", { method: "POST" });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(json.error || "Failed to sync user");
        setAppUser(json.user || null);
        setAppUserError("");
        fetchSavedRecipes();
      } catch (e) {
        setAppUser(null);
        setAppUserError(e?.message || "Failed to sync user");
      }
    };

    syncUser();
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result || "");
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    setTextOutput(null);

    if (!preview) {
      setError("Please upload an image first");
      return;
    }

    setLoading(true);

    try {
      const base64Data = preview.split(",")[1];
      if (!base64Data) throw new Error("Invalid image data");

      const roboflowResp = await fetch(
        "https://serverless.roboflow.com/infer/workflows/dataquest-ijnlj/custom-workflow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.NEXT_PUBLIC_ROBOFLOW,
            inputs: { image: { type: "base64", value: base64Data } },
          }),
          signal: AbortSignal.timeout(45000),
        }
      );

      if (!roboflowResp.ok) {
        const txt = await roboflowResp.text().catch(() => "");
        throw new Error(`Roboflow failed ${roboflowResp.status}: ${txt}`);
      }

      const rfJson = await roboflowResp.json();
      const preds = rfJson.outputs?.[0]?.predictions;
      const detectedIngredients = Array.isArray(preds) ? preds.map((p) => p.class) : [];

      const genResp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textInput,
          ingredients: detectedIngredients,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!genResp.ok) {
        const { error: genError } = (await genResp.json().catch(() => ({}))) || {};
        throw new Error(genError || `Generate failed ${genResp.status}`);
      }

      const { result } = await genResp.json();
      setTextOutput(typeof result === "string" ? JSON.parse(result) : result);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStartPhoto = () => {
    const card = document.getElementById("upload-card");
    const input = document.getElementById("file-upload");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    if (input) input.click();
  };

  const fetchSavedRecipes = async () => {
    if (!user) return;
    setSavedLoading(true);
    setSavedError("");
    try {
      const resp = await fetch("/api/saved-recipes");
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to load saved recipes");
      setSavedRecipes(json.recipes || []);
    } catch (e) {
      setSavedError(e?.message || "Failed to load saved recipes");
    } finally {
      setSavedLoading(false);
    }
  };

  const saveRecipe = async (recipe) => {
    if (!user) {
      setSavedError("Log in to save recipes.");
      return;
    }
    if (!recipe?.title) return;
    const alreadySaved = savedRecipes.some((r) => r.title === recipe.title);
    if (alreadySaved) return;
    try {
      const resp = await fetch("/api/saved-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients || [],
          directions: recipe.steps || recipe.directions || [],
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to save recipe");
      setSavedRecipes((prev) => [
        ...prev.filter((r) => r.title !== recipe.title),
        json.recipe,
      ]);
    } catch (e) {
      setSavedError(e?.message || "Failed to save recipe");
    }
  };

  const removeRecipe = async (title) => {
    if (!user || !title) return;
    try {
      const resp = await fetch("/api/saved-recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to remove recipe");
      setSavedRecipes((prev) => prev.filter((r) => r.title !== title));
    } catch (e) {
      setSavedError(e?.message || "Failed to remove recipe");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 text-gray-800 dark:text-white">
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 text-white pb-14">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-blue-300/30 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-white/15 border border-white/10 flex items-center justify-center text-xl font-semibold shadow-inner">
                🍳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">Cooker</h1>
                </div>
                <p className="text-sm text-white/80">
                  Fridge-to-fork ideas powered by AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-sm font-semibold">{user.name ?? user.email}</span>
                    <span className="text-xs text-white/70">Signed in</span>
                  </div>
                  <a
                    href="/auth/logout"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold shadow-sm hover:bg-blue-50 transition"
                  >
                    Log out
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80 hidden sm:inline">Welcome back</span>
                  <LoginButton />
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="space-y-5">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight drop-shadow-sm">
                Turn fridge photos into recipes in seconds.
              </h2>
              <p className="text-lg text-white/85 max-w-2xl">
                Upload what you have, tell us what you crave, and Cooker drafts ready-to-cook recipes with nutrition, timing, and step-by-step guidance.
              </p>

              <div className="flex flex-wrap gap-3">
                {["Smart ingredient detection", "Prompt-friendly text box", "Save for later"].map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-full bg-white/15 border border-white/20"
                  >
                    <FiCheckCircle className="h-4 w-4" /> {pill}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartPhoto}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-700 font-semibold shadow-lg hover:-translate-y-0.5 transition transform"
                >
                  Start with your photo
                  <FiUpload />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-blue-500/20 dark:bg-blue-500/10 rotate-3" />
              <div
                id="upload-card"
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-white/40 dark:ring-gray-800 p-6"
              >
                <div className="flex flex-col items-center">
                  {preview ? (
                    <div className="mb-6 relative group w-full">
                      <img
                        src={preview}
                        alt="Uploaded ingredients"
                        className="w-full max-h-64 rounded-xl object-contain border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-950"
                      />
                      <label
                        htmlFor="file-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity cursor-pointer"
                      >
                        <span className="text-white flex items-center font-semibold">
                          <FiUpload className="mr-2" /> Change image
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="mb-6 w-full">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 hover:border-blue-400 dark:hover:border-blue-400 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FiUpload className="w-12 h-12 mb-3 text-blue-500" />
                          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold">Drop a fridge photo</span> or click to upload
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            PNG, JPG (max 10MB)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  <form onSubmit={handleGenerate} className="w-full">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block mb-2">
                      What are you hoping to make?
                    </label>
                    <div className="relative flex items-center mb-4">
                      <input
                        type="text"
                        placeholder="e.g. High protein pasta with what’s in the fridge"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="w-full py-4 pl-4 pr-16 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-950 dark:text-white"
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white transition-colors"
                        title={user ? "Generate recipes" : "Log in to save recipes (generation works without login)"}
                      >
                        {loading ? (
                          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <FiSearch className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                  </form>

                  {error && (
                    <div className="w-full mt-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  {loading && (
                    <div className="w-full mt-5 flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                      <p className="text-gray-600 dark:text-gray-400 mt-3">
                        Analyzing ingredients and generating recipes...
                      </p>
                    </div>
                  )}

                  {appUser && (
                    <div className="w-full mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                      Synced to Supabase user <span className="font-mono">{appUser.id}</span>
                    </div>
                  )}
                  {appUserError && (
                    <div className="w-full mt-2 text-xs text-red-100 text-center">
                      {appUserError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="h-10 bg-gradient-to-b from-blue-500/25 via-blue-100/50 to-transparent dark:from-blue-900/30 dark:via-gray-900/60 dark:to-transparent" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Ingredient intelligence",
              desc: "Computer vision spots what’s in your photo so prompts stay short.",
              icon: <FiZap className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
            },
            {
              title: "Nutrition-aware outputs",
              desc: "Calories, macros, and timing baked into every recipe suggestion.",
              icon: <FiShield className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
            },
            {
              title: "Save & revisit",
              desc: "Logged-in users can save recipes for later cooking sessions.",
              icon: <FiHeart className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        {textOutput?.recipes && (
          <section id="recipes" className="mb-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Delicious Recipe Suggestions
              </span>
            </h2>
            <div>
              {textOutput.recipes.map((recipe, i) => (
                <RecipeBlock
                  key={i}
                  recipe={recipe}
                  onSave={saveRecipe}
                  onRemove={removeRecipe}
                  isSaved={savedRecipes.some((r) => r.title === recipe.title)}
                  canSave={!!user}
                />
              ))}
            </div>
          </section>
        )}

        {user && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Saved recipes</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaved((v) => !v)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {showSaved ? "Hide list" : "Show list"}
                </button>
                <button
                  type="button"
                  onClick={fetchSavedRecipes}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            {savedError && (
              <div className="text-sm text-red-600 dark:text-red-400">{savedError}</div>
            )}

            {showSaved && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
                {savedLoading && <div className="text-sm text-gray-600 dark:text-gray-400">Loading saved recipes…</div>}
                {!savedLoading && savedRecipes.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No saved recipes yet.</div>
                )}
                {!savedLoading &&
                  savedRecipes.map((recipe, i) => (
                    <RecipeBlock
                      key={`saved-${recipe.title}-${i}`}
                      recipe={{
                        title: recipe.title,
                        ingredients: recipe.ingredients || [],
                        steps: recipe.directions || recipe.steps || [],
                        nutrition: {},
                        time_to_make: recipe.time_to_make || "—",
                      }}
                      onSave={saveRecipe}
                      onRemove={removeRecipe}
                      isSaved
                      canSave={!!user}
                    />
                  ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
