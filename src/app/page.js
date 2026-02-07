"use client";
import { useState, useRef, useCallback } from 'react';
import { FiUpload, FiArrowRight, FiChevronDown, FiChevronUp, FiClock, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiX, FiVolume2, FiCamera } from 'react-icons/fi';

/* ─── Cooking Guide Modal ─── */
const CookingGuide = ({ recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef(null);
  const totalSteps = recipe.steps.length;

  const speakStep = useCallback(async (stepIndex) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setLoadingAudio(true);
    setIsPlaying(true);

    const stepText = stepIndex === -1
      ? `Let's start cooking ${recipe.title}. You'll need: ${recipe.ingredients.join(', ')}. When you're ready, move to step 1.`
      : `Step ${stepIndex + 1} of ${totalSteps}. ${recipe.steps[stepIndex]}`;

    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: stepText }),
      });
      if (!resp.ok) throw new Error('TTS request failed');

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      setLoadingAudio(false);
      await audio.play();
    } catch (err) {
      console.error('Speech error:', err);
      setLoadingAudio(false);
      setIsPlaying(false);
    }
  }, [recipe, totalSteps]);

  const handlePlayPause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      speakStep(currentStep === 0 ? -1 : currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      speakStep(nextStep - 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      speakStep(prevStep === 0 ? -1 : prevStep - 1);
    }
  };

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-[var(--card)] rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-fade-up border border-[var(--card-border)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-1">Cooking Guide</p>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">{recipe.title}</h3>
          </div>
          <button onClick={handleClose} className="text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="mx-6 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[200px] flex flex-col justify-center">
          {currentStep === 0 ? (
            <div>
              <h4 className="font-medium text-[var(--foreground)] mb-4">Gather your ingredients</h4>
              <ul className="space-y-2.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start text-sm text-[var(--muted)]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 mr-3 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-sm font-semibold mb-3">
                {currentStep}
              </span>
              <p className="text-[var(--foreground)] leading-relaxed">{recipe.steps[currentStep - 1]}</p>
              <p className="text-xs text-[var(--muted)] mt-3">Step {currentStep} of {totalSteps}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-[var(--card-border)] px-6 py-4">
          <div className="flex items-center justify-center gap-3">
            <button onClick={handlePrev} disabled={currentStep === 0}
              className="p-2.5 rounded-full text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
              <FiSkipBack className="w-5 h-5" />
            </button>
            <button onClick={handlePlayPause} disabled={loadingAudio}
              className="p-3.5 rounded-full bg-[var(--foreground)] text-[var(--background)] hover:opacity-80 disabled:opacity-50 shadow-sm transition-all">
              {loadingAudio ? (
                <div className="animate-spin h-5 w-5 border-2 border-[var(--background)] border-t-transparent rounded-full" />
              ) : isPlaying ? <FiPause className="w-5 h-5" /> : <FiPlay className="w-5 h-5" />}
            </button>
            <button onClick={handleNext} disabled={currentStep >= totalSteps}
              className="p-2.5 rounded-full text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
              <FiSkipForward className="w-5 h-5" />
            </button>
          </div>
          {currentStep === totalSteps && (
            <p className="text-center text-[var(--success)] text-sm font-medium mt-3">All done — enjoy your meal!</p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Recipe Card ─── */
const RecipeBlock = ({ recipe, onStartCooking, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <button
        className="w-full flex justify-between items-center p-5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-[var(--foreground)]">{recipe.title}</h3>
        <div className="flex items-center gap-3 text-sm text-[var(--muted)] flex-shrink-0 ml-4">
          <span className="flex items-center gap-1">
            <FiClock className="w-3.5 h-3.5" />
            {recipe.time_to_make}
          </span>
          <span>{recipe.nutrition.calories}</span>
          {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[var(--card-border)]">
          <div className="grid md:grid-cols-2 gap-6 pt-5">
            {/* Ingredients */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-3">Ingredients</h4>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 mr-3 flex-shrink-0" />
                    <span className="text-[var(--foreground)]">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nutrition */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-3">Nutrition</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calories', value: recipe.nutrition.calories },
                  { label: 'Protein', value: recipe.nutrition.protein },
                  { label: 'Fat', value: recipe.nutrition.fat },
                  { label: 'Carbs', value: recipe.nutrition.carbohydrates || recipe.nutrition.carbs },
                ].map((item, i) => (
                  <div key={i} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{item.label}</div>
                    <div className="text-sm font-semibold text-[var(--foreground)] mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-6">
            <h4 className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-3">Steps</h4>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex text-sm">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-xs font-semibold mr-3 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[var(--foreground)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Voice guide button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onStartCooking(recipe); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-full hover:opacity-80 shadow-sm transition-all"
            >
              <FiVolume2 className="w-4 h-4" />
              Start Voice Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
export default function Home() {
  const [preview, setPreview] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState(null);
  const [cookingRecipe, setCookingRecipe] = useState(null);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async e => {
    e.preventDefault();
    setError('');
    setTextOutput(null);
    if (!preview) { setError('Upload an image of your fridge first'); return; }
    setLoading(true);

    try {
      const base64Data = preview.split(',')[1];
      const roboflowResp = await fetch(
        'https://serverless.roboflow.com/infer/workflows/dataquest-ijnlj/custom-workflow',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.NEXT_PUBLIC_ROBOFLOW,
            inputs: { image: { type: 'base64', value: base64Data } }
          }),
          signal: AbortSignal.timeout(45000)
        }
      );
      if (!roboflowResp.ok) {
        const txt = await roboflowResp.text().catch(() => '');
        throw new Error(`Detection failed ${roboflowResp.status}: ${txt}`);
      }
      const rfJson = await roboflowResp.json();
      const preds = rfJson.outputs?.[0]?.predictions;
      const detectedIngredients = Array.isArray(preds) ? preds.map(p => p.class) : [];

      const genResp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textInput, ingredients: detectedIngredients }),
        signal: AbortSignal.timeout(60000)
      });
      if (!genResp.ok) {
        const { error: genError } = (await genResp.json().catch(() => ({})));
        throw new Error(genError || `Generate failed ${genResp.status}`);
      }
      const { result } = await genResp.json();
      setTextOutput(typeof result === 'string' ? JSON.parse(result) : result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ─── Header ─── */}
      <header className="border-b border-[var(--card-border)]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-light)]">
              <FiCamera className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Meal Snap</h1>
              <p className="text-sm text-[var(--muted)]">Snap your fridge, discover recipes</p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Upload & Input Card */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 mb-10">
          {/* Image upload */}
          {preview ? (
            <div className="mb-5 relative group">
              <img
                src={preview}
                alt="Uploaded ingredients"
                className="w-full max-h-56 rounded-xl object-contain bg-stone-50 dark:bg-stone-900 border border-[var(--card-border)]"
              />
              <label
                htmlFor="file-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity cursor-pointer"
              >
                <span className="text-white text-sm flex items-center gap-2">
                  <FiUpload className="w-4 h-4" /> Change image
                </span>
              </label>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl cursor-pointer bg-stone-50 dark:bg-stone-900 hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors mb-5 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3 group-hover:bg-[var(--accent-light)] transition-colors">
                  <FiUpload className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Upload a photo of your fridge</p>
                <p className="text-xs text-[var(--muted)] mt-1">PNG or JPG up to 10 MB</p>
              </div>
            </label>
          )}

          {/* Text input + submit */}
          <form onSubmit={handleGenerate} className="flex gap-3">
            <input
              type="text"
              placeholder="Any preferences? (e.g. quick, healthy, pasta...)"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              className="flex-1 py-3 px-4 text-sm rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center px-5 py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-medium hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-[var(--background)] border-t-transparent rounded-full" />
              ) : (
                <FiArrowRight className="w-4 h-4" />
              )}
            </button>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-sm animate-fade-up">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 animate-fade-up">
            <div className="w-10 h-10 border-[3px] border-stone-200 dark:border-stone-700 border-t-[var(--accent)] rounded-full animate-spin" />
            <p className="text-sm text-[var(--muted)] mt-4">Analyzing your ingredients…</p>
          </div>
        )}

        {/* Recipes */}
        {textOutput?.recipes && (
          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-5">
              {textOutput.recipes.length} Recipes Found
            </h2>
            <div className="space-y-3">
              {textOutput.recipes.map((recipe, i) => (
                <RecipeBlock key={i} recipe={recipe} index={i} onStartCooking={setCookingRecipe} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] mt-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <p className="text-xs text-[var(--muted)] text-center">Powered by AI — recipes are suggestions, always use your best judgment.</p>
        </div>
      </footer>

      {/* Cooking Guide Overlay */}
      {cookingRecipe && (
        <CookingGuide recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} />
      )}
    </div>
  );
}
