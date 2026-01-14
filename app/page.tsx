'use client';

import { useState } from 'react';

export default function Home() {
  const [menuUrl, setMenuUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Painted door: Show that backend isn't connected yet
    setTimeout(() => {
      alert('Backend not connected yet! The /api/parse-menu endpoint needs to be implemented.');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <main className="w-full max-w-xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Orda
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Order together, split the bill effortlessly
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share a menu, build a cart with friends, and split costs automatically
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="menu-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Restaurant Menu PDF URL
              </label>
              <input
                id="menu-url"
                type="url"
                value={menuUrl}
                onChange={(e) => setMenuUrl(e.target.value)}
                placeholder="https://example.com/menu.pdf"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !menuUrl}
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Cart...
                </span>
              ) : (
                'Create Cart'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              How it works:
            </h3>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">1.</span>
                <span>Paste a link to a restaurant menu PDF</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">2.</span>
                <span>Get a shareable cart link for your group</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">3.</span>
                <span>Everyone adds their items in real-time</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">4.</span>
                <span>See the total split automatically with tax & tip</span>
              </li>
            </ol>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          Powered by Claude AI for intelligent menu parsing
        </p>
      </main>
    </div>
  );
}
