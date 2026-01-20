'use client';

import { useState, useRef, useEffect } from 'react';

const MAX_PAGES = 6;
const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate previews when files change
  useEffect(() => {
    const newPreviews: string[] = [];

    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
      } else {
        // PDF - use placeholder
        newPreviews.push('pdf');
      }
    });

    setPreviews(newPreviews);

    // Cleanup URLs on unmount
    return () => {
      newPreviews.forEach((url) => {
        if (url !== 'pdf') {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [selectedFiles]);

  const validateFile = (file: File): string | null => {
    if (!VALID_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB (max 10MB)`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total count
    if (selectedFiles.length + files.length > MAX_PAGES) {
      setErrorDetails(`Maximum ${MAX_PAGES} pages allowed. You have ${selectedFiles.length}, trying to add ${files.length}.`);
      return;
    }

    // Validate each file
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setErrorDetails(error);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    setErrorDetails(null);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

    if (selectedFiles.length === 0) {
      setErrorDetails('Please select at least one file');
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

      // Convert all files to base64 for sessionStorage
      const fileDataPromises = selectedFiles.map((file) => {
        return new Promise<{ fileName: string; fileType: string; fileData: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileType: file.type,
              fileData: reader.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(fileDataPromises);

      sessionStorage.setItem('menuUpload', JSON.stringify({
        mode: 'upload',
        files: filesData,
      }));

      // Redirect to cart page with streaming enabled
      window.location.href = `/cart/${cartId}?streaming=true`;
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
            Orden
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
                Restaurant Menu (PDF or Images)
              </label>

              {/* Thumbnails Row */}
              {selectedFiles.length > 0 && (
                <div className="mb-4 flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative flex-shrink-0 w-20 h-20 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 overflow-hidden bg-gray-100 dark:bg-gray-700"
                    >
                      {previews[index] === 'pdf' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h2v5h-2v-5zm-2 3h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={previews[index]}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Page number badge */}
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                        aria-label={`Remove page ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add More Button */}
                  {selectedFiles.length < MAX_PAGES && (
                    <label
                      htmlFor="menu-file"
                      className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </label>
                  )}
                </div>
              )}

              <div className="relative">
                <input
                  ref={fileInputRef}
                  id="menu-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  multiple
                  className="hidden"
                />
                {selectedFiles.length === 0 && (
                  <label
                    htmlFor="menu-file"
                    className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-center">
                      <div className="text-gray-600 dark:text-gray-400 mb-1">
                        Click to select or drag and drop
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, JPG, PNG, GIF, WebP (max 10MB each, up to {MAX_PAGES} pages)
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {selectedFiles.length > 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'page' : 'pages'} selected
                  {selectedFiles.length < MAX_PAGES && ' • Tap + to add more'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || selectedFiles.length === 0}
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
                <span>Upload a restaurant menu (PDF or images)</span>
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
