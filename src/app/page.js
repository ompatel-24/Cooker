"use client";
import { useState, useRef, useCallback } from 'react';
import { FiUpload, FiSearch, FiChevronDown, FiChevronUp, FiClock, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiX, FiVolume2 } from 'react-icons/fi';

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

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Cooking Guide</p>
            <h3 className="text-white text-xl font-bold mt-1">{recipe.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5">
          <div
            className="bg-blue-500 h-1.5 transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[200px] flex flex-col justify-center">
          {currentStep === 0 ? (
            <div>
              <h4 className="font-semibold text-lg text-gray-800 dark:text-white mb-3">
                Gather Your Ingredients
              </h4>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start text-gray-600 dark:text-gray-300">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold mr-3">
                  {currentStep}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-lg leading-relaxed">
                {recipe.steps[currentStep - 1]}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="p-3 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FiSkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={loadingAudio}
              className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-lg transition-colors"
            >
              {loadingAudio ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <FiPause className="w-6 h-6" />
              ) : (
                <FiPlay className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep >= totalSteps}
              className="p-3 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FiSkipForward className="w-5 h-5" />
            </button>
          </div>

          {currentStep === totalSteps && (
            <p className="text-center text-green-600 dark:text-green-400 font-medium mt-3">
              You&apos;re done! Enjoy your meal.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const RecipeBlock = ({ recipe, onStartCooking }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl my-4 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      <div
        className="flex justify-between items-center p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xl font-medium text-gray-800 dark:text-white">
          {recipe.title}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="flex items-center text-gray-500 dark:text-gray-300 text-sm">
            <span className="font-medium">{recipe.nutrition.calories}</span>
          </span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="flex items-center text-gray-500 dark:text-gray-300 text-sm">
            <FiClock className="mr-1" /> {recipe.time_to_make}
          </span>
          {isExpanded ? (
            <FiChevronUp className="text-blue-500" />
          ) : (
            <FiChevronDown className="text-blue-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-lg mb-3 text-gray-700 dark:text-gray-200">
                Ingredients
              </h4>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-2" />
                    <span className="text-gray-600 dark:text-gray-400">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-lg mb-3 text-gray-700 dark:text-gray-200">
                Nutrition
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Calories
                  </div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {recipe.nutrition.calories}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Protein
                  </div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {recipe.nutrition.protein}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Fat
                  </div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {recipe.nutrition.fat}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Carbs
                  </div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {recipe.nutrition.carbohydrates || recipe.nutrition.carbs}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-lg mb-3 text-gray-700 dark:text-gray-200">
              Preparation Steps
            </h4>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 text-sm font-medium mr-3">
                    {i + 1}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Cook This button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartCooking(recipe);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <FiVolume2 className="w-5 h-5" />
              Cook This — Voice Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
    if (!preview) {
      setError('Please upload an image first');
      return;
    }
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
        throw new Error(`Roboflow failed ${roboflowResp.status}: ${txt}`);
      }
      const rfJson = await roboflowResp.json();
      const preds = rfJson.outputs?.[0]?.predictions;
      const detectedIngredients = Array.isArray(preds)
        ? preds.map(p => p.class)
        : [];

      const genResp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textInput,
          ingredients: detectedIngredients
        }),
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 text-gray-800 dark:text-white">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            Meal Snap
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Upload an image of your fridge and let AI suggest delicious recipes
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex flex-col items-center">
              {preview ? (
                <div className="mb-6 relative group">
                  <img
                    src={preview}
                    alt="Uploaded ingredients"
                    className="max-h-64 rounded-lg object-contain border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900"
                  />
                  <label
                    htmlFor="file-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity cursor-pointer"
                  >
                    <span className="text-white flex items-center">
                      <FiUpload className="mr-2" /> Change image
                    </span>
                  </label>
                </div>
              ) : (
                <div className="mb-6 w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiUpload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag
                        and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG (MAX. 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <form onSubmit={handleGenerate} className="w-full">
                <div className="relative flex items-center mb-6">
                  <input
                    type="text"
                    placeholder="What would you like to cook today?"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    className="w-full py-4 pl-4 pr-16 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white transition-colors"
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
                <div className="w-full mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              {loading && (
                <div className="w-full mt-6 flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 mt-4">
                    Analyzing ingredients and generating recipes...
                  </p>
                </div>
              )}
            </div>
          </div>

          {textOutput?.recipes && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-center mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                  Delicious Recipe Suggestions
                </span>
              </h2>
              <div>
                {textOutput.recipes.map((recipe, i) => (
                  <RecipeBlock key={i} recipe={recipe} onStartCooking={setCookingRecipe} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {cookingRecipe && (
        <CookingGuide
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
        />
      )}
    </div>
  );
}
