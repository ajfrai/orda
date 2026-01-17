'use client';

import { useState } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorDetails(`Invalid file type: ${file.type}\nAccepted types: ${validTypes.join(', ')}`);
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorDetails(`File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB\nMaximum size: 10 MB`);
        return;
      }
      setSelectedFile(file);
      setErrorDetails(null);
    }
  };

  const handleCopyError = async () => {
    if (!errorDetails) return;

    try {
      await navigator.clipboard.writeText(errorDetails);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate file is selected
    if (!selectedFile) {
      setErrorDetails('Please select a file');
      return;
    }

    try {
      setIsLoading(true);

      // Create empty cart first
      const cartResponse = await fetch('/api/cart/create', {
        method: 'POST',
      });

      if (!cartResponse.ok) {
        throw new Error('Failed to create cart');
      }

      const { cartId } = await cartResponse.json();

      // Convert file to base64 for sessionStorage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        sessionStorage.setItem('menuUpload', JSON.stringify({
          mode: 'upload',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64
        }));
        // Redirect to cart page with streaming enabled
        window.location.href = `/cart/${cartId}?streaming=true`;
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('[DEBUG] Error preparing upload:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrorDetails(`Failed to prepare upload: ${errorMessage}`);
      setIsLoading(false);
    }
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
                Share a menu, build an order with friends, and split costs automatically
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {errorDetails && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    Debug Information (will be removed in production)
                  </h4>
                  <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {errorDetails}
                  </pre>
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={handleCopyError}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      {isCopied ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setErrorDetails(null)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="menu-file"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Restaurant Menu (PDF or Image)
              </label>
              <div className="relative">
                <input
                  id="menu-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <label
                  htmlFor="menu-file"
                  className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-center">
                    {selectedFile ? (
                      <>
                        <div className="text-indigo-600 dark:text-indigo-400 mb-1">✓ {selectedFile.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-gray-600 dark:text-gray-400 mb-1">
                          Click to select or drag and drop
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          PDF, JPG, PNG, GIF, WebP (max 10MB)
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedFile}
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
                  Processing...
                </span>
              ) : (
                'Generate Menu'
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
                <span>Upload a restaurant menu (PDF or image)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">2.</span>
                <span>Get a shareable order link for your group</span>
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
