'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ProgressStage = 'downloading' | 'parsing' | 'extracting' | 'complete';

export default function CreatingCartPage() {
  const router = useRouter();
  const [progressStage, setProgressStage] = useState<ProgressStage>('downloading');
  const [error, setError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [debugText, setDebugText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [streamedItems, setStreamedItems] = useState<Array<{ item: any; category: string }>>([]);

  const handleCopyDebug = async () => {
    if (!debugText) return;
    try {
      await navigator.clipboard.writeText(debugText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    async function createCart() {
      try {
        // Get upload data from sessionStorage
        const uploadDataStr = sessionStorage.getItem('menuUpload');
        if (!uploadDataStr) {
          setError('No upload data found. Please try again.');
          return;
        }

        const uploadData = JSON.parse(uploadDataStr);
        let body: any;
        let headers: HeadersInit = {
          'Accept': 'text/event-stream',
        };

        if (uploadData.mode === 'url') {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({ pdfUrl: uploadData.url });
        } else if (uploadData.mode === 'upload') {
          // Convert base64 back to blob
          const response = await fetch(uploadData.fileData);
          const blob = await response.blob();
          const file = new File([blob], uploadData.fileName, { type: uploadData.fileType });

          const formData = new FormData();
          formData.append('file', file);
          body = formData;
        }

        console.log('[DEBUG] Starting cart creation:', uploadData.mode);
        setProgressStage('downloading');

        const response = await fetch('/api/parse-menu', {
          method: 'POST',
          headers,
          body,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Server error: ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          throw new Error(errorMessage);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let hasReceivedData = false;
        let cartId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (!hasReceivedData) {
              throw new Error('Stream ended without receiving any data');
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              hasReceivedData = true;
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                throw new Error(data.error);
              }

              // Update progress based on messages
              if (data.message) {
                const msg = data.message.toLowerCase();
                if (msg.includes('analyzing') || msg.includes('sending to claude')) {
                  setProgressStage('parsing');
                }
              }

              // DEBUG: Show only item JSON (not progress/status messages)
              if (data.item) {
                setDebugText(JSON.stringify(data.item, null, 2));
              }

              // Handle cart creation and items
              if (data.cartId) {
                cartId = data.cartId;
                if (data.item) {
                  // Item received - add to streamed items and show card
                  setStreamedItems(prev => [...prev, { item: data.item, category: data.category }]);
                  setProgressStage('extracting');
                  setItemCount(prev => prev + 1);
                } else if (!data.item && !data.message) {
                  // Complete event
                  setProgressStage('complete');
                  // Clean up sessionStorage
                  sessionStorage.removeItem('menuUpload');
                  // Redirect to actual cart page
                  console.log('[DEBUG] Redirecting to cart:', cartId);
                  window.location.href = `/cart/${cartId}`;
                  return;
                }
              } else if (data.item && cartId) {
                // Subsequent items
                setStreamedItems(prev => [...prev, { item: data.item, category: data.category }]);
                setItemCount(prev => prev + 1);
              }
            }
          }
        }

        // If we got here without a cart ID, something went wrong
        if (!cartId) {
          throw new Error('Cart was not created');
        }

      } catch (err) {
        console.error('[DEBUG] Error creating cart:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      }
    }

    createCart();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Creating Your Cart
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Please wait while we process your menu...
                </p>
              </div>

              {/* Progress Indicators */}
              <div className="space-y-3 text-sm">
                {/* Downloading menu */}
                <div className={`flex items-center gap-2 transition-all ${
                  progressStage === 'downloading'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : progressStage === 'parsing' || progressStage === 'extracting' || progressStage === 'complete'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {progressStage === 'downloading' ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className="font-medium">Downloading menu</span>
                </div>

                {/* Sending to Claude */}
                <div className={`flex items-center gap-2 transition-all ${
                  progressStage === 'parsing'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : progressStage === 'extracting' || progressStage === 'complete'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {progressStage === 'parsing' ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : progressStage === 'extracting' || progressStage === 'complete' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 animate-spin opacity-0" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span className="font-medium">Sending menu to Claude</span>
                </div>

                {/* Extracting menu items */}
                <div className={`flex items-center gap-2 transition-all ${
                  progressStage === 'extracting'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : progressStage === 'complete'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {progressStage === 'extracting' ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : progressStage === 'complete' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 animate-spin opacity-0" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span className="font-medium">
                    Extracting menu items
                    {progressStage === 'extracting' && itemCount > 0 ? ` (${itemCount} found)` : ''}
                  </span>
                </div>

                {progressStage === 'complete' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-600 dark:text-green-400 font-medium">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Menu loaded successfully! Redirecting...</span>
                  </div>
                )}
              </div>

              {/* Debug Output */}
              {progressStage === 'extracting' && (
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Debug: Current Item JSON
                    </h3>
                    <button
                      onClick={handleCopyDebug}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition"
                    >
                      {isCopied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    {debugText || 'Waiting for next item...'}
                  </pre>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Shows the JSON for each item as it streams in. Container persists, text updates.
                  </p>
                </div>
              )}

              {/* Streamed Items */}
              {streamedItems.length > 0 && (
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Menu Items ({streamedItems.length})
                  </h3>
                  <div className="space-y-3">
                    {streamedItems.map((itemData, idx) => (
                      <div
                        key={`${itemData.item.name}-${idx}`}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300 ease-in"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {itemData.item.name}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {itemData.category}
                              </span>
                            </div>
                            {itemData.item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {itemData.item.description}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 ml-3">
                            ${itemData.item.price?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
