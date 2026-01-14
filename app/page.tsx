'use client';

import { useState, useRef } from 'react';

type InputMode = 'upload' | 'url';

export default function Home() {
  const [mode, setMode] = useState<InputMode>('upload');
  const [menuUrl, setMenuUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [progressStages, setProgressStages] = useState({
    downloading: false,
    parsing: false,
    streaming: false,
  });
  const [streamingCart, setStreamingCart] = useState<{
    cartId: string;
    restaurantName: string;
    location?: { city?: string; state?: string };
    items: Array<{ item: any; category: string }>;
    isComplete: boolean;
  } | null>(null);
  const cartCreatedRef = useRef(false);
  const metadataRef = useRef<{ restaurantName: string; location?: { city?: string; state?: string } } | null>(null);

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
    setIsLoading(true);
    setErrorDetails(null);
    setProgressStages({ downloading: false, parsing: false, streaming: false });
    setStreamingCart(null);
    cartCreatedRef.current = false;
    metadataRef.current = null;

    try {
      let body: any;
      let headers: HeadersInit = {
        'Accept': 'text/event-stream', // Request streaming
      };

      if (mode === 'url') {
        // Send URL as JSON
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ pdfUrl: menuUrl });
      } else {
        // Send file as FormData
        if (!selectedFile) {
          setErrorDetails('No file selected');
          setIsLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        body = formData;
        // Don't set Content-Type header for FormData - browser will set it with boundary
        delete headers['Content-Type'];
      }

      console.log('[DEBUG] Sending streaming request to /api/parse-menu');
      console.log('[DEBUG] Mode:', mode);

      let response;
      try {
        response = await fetch('/api/parse-menu', {
          method: 'POST',
          headers,
          body,
        });
      } catch (fetchError) {
        // Network error - fetch itself failed
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';

        // Provide more helpful error message for common cases
        if (errorMsg.includes('Failed to fetch') || errorMsg === 'Load failed') {
          throw new Error(
            `Network request failed. This is usually temporary and could be:\n` +
            `• Rate limiting by the server (too many requests)\n` +
            `• Network connectivity issues\n` +
            `• Server temporarily unavailable\n` +
            `• Request timeout\n\n` +
            `Try:\n` +
            `• Wait a minute and try again\n` +
            `• Upload the file directly instead\n` +
            `• Check if the URL still works in your browser`
          );
        }

        throw new Error(`Network request failed: ${errorMsg}`);
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Try to parse error as JSON for better error messages
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Not JSON, use raw text
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

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (!hasReceivedData) {
            throw new Error('Stream ended without receiving any data');
          }
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            hasReceivedData = true;
            const data = JSON.parse(line.substring(6));

            // Handle different event types
            if (data.error) {
              throw new Error(data.error);
            }

            // Update progress stages based on status messages
            if (data.message) {
              const msg = data.message.toLowerCase();

              if (msg.includes('fetching') || msg.includes('retrying')) {
                // Downloading from URL
                setProgressStages(prev => ({ ...prev, downloading: false, parsing: false, streaming: false }));
              } else if (msg.includes('preparing') || msg.includes('sending to claude') || msg.includes('analyzing')) {
                // For uploads, skip downloading stage; for URLs, mark downloading complete
                setProgressStages(prev => ({ downloading: true, parsing: false, streaming: false }));
              } else if (msg.includes('parsing results')) {
                // Parsing complete
                setProgressStages(prev => ({ downloading: true, parsing: true, streaming: false }));
              } else if (msg.includes('creating cart') || msg.includes('finalizing')) {
                // Creating cart
                setProgressStages({ downloading: true, parsing: true, streaming: true });
              }
            }

            // Handle metadata
            if (data.restaurantName && !data.cartId && !data.item) {
              console.log('[DEBUG] Received metadata:', data.restaurantName);
              metadataRef.current = {
                restaurantName: data.restaurantName,
                location: data.location,
              };
            }

            // Handle first item - create cart view
            if (data.cartId && !cartCreatedRef.current) {
              console.log('[DEBUG] First item received, showing cart:', data.cartId);
              cartCreatedRef.current = true;
              setProgressStages({ downloading: true, parsing: true, streaming: true });
              setStreamingCart({
                cartId: data.cartId,
                restaurantName: data.restaurantName || metadataRef.current?.restaurantName || 'Menu',
                location: metadataRef.current?.location,
                items: data.item ? [{ item: data.item, category: data.category }] : [],
                isComplete: false,
              });
            }
            // Handle subsequent items
            else if (data.item && data.category && cartCreatedRef.current) {
              console.log('[DEBUG] New item received:', data.item.name);
              setStreamingCart(prev => prev ? {
                ...prev,
                items: [...prev.items, { item: data.item, category: data.category }],
              } : null);
            }

            // Handle completion event
            if (data.cartId && data.restaurantName && !data.item && !data.message) {
              console.log('[DEBUG] Streaming complete, received complete event');
              setStreamingCart(prev => prev ? { ...prev, isComplete: true } : null);

              // Navigate to final cart page after a brief delay
              setTimeout(() => {
                window.location.href = `/cart/${data.cartId}`;
              }, 1500);
            }
          }
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error creating cart:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';

      const debugInfo = `
Caught Exception: ${errorMessage}

Stack trace:
${stack}

Request details:
- Mode: ${mode}
- ${mode === 'upload' ? `File: ${selectedFile?.name} (${selectedFile?.type}, ${(selectedFile?.size || 0) / 1024} KB)` : `URL: ${menuUrl}`}
      `.trim();

      setErrorDetails(debugInfo);
      setIsLoading(false);
    }
  };

  // Group items by category for streaming cart display
  const groupedStreamingItems = streamingCart?.items.reduce((acc, { item, category }) => {
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <main className="w-full max-w-xl px-6 py-12">
        {!streamingCart && (
          <>
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
          {/* Tab switcher */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('upload')}
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                mode === 'upload'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                mode === 'url'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Paste URL
            </button>
          </div>

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
            {mode === 'upload' ? (
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
            ) : (
              <div>
                <label
                  htmlFor="menu-url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Menu URL (PDF or Image)
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
            )}

            <button
              type="submit"
              disabled={isLoading || (mode === 'url' && !menuUrl) || (mode === 'upload' && !selectedFile)}
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
                'Create Cart'
              )}
            </button>

            {isLoading && (
              <div className="mt-4 space-y-2 text-sm">
                <div className={`flex items-center gap-2 transition-all ${progressStages.downloading ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {progressStages.downloading ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>Downloading menu</span>
                </div>
                <div className={`flex items-center gap-2 transition-all ${progressStages.parsing ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {progressStages.parsing ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>Parsing with AI</span>
                </div>
                <div className={`flex items-center gap-2 transition-all ${progressStages.streaming ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {progressStages.streaming ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>Creating cart</span>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              How it works:
            </h3>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">1.</span>
                <span>Upload a menu image or paste a PDF/image URL</span>
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
          </>
        )}

        {/* Streaming Cart View */}
        {streamingCart && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {streamingCart.restaurantName}
              </h1>
              {!streamingCart.isComplete && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                  <span>Loading menu items...</span>
                </div>
              )}
              {streamingCart.isComplete && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete! Redirecting...</span>
                </div>
              )}
            </div>

            {/* Menu Items by Category */}
            <div className="space-y-6">
              {groupedStreamingItems && Object.keys(groupedStreamingItems).sort().map((category) => (
                <div key={category}>
                  <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                    {category}
                  </h2>
                  <div className="space-y-2">
                    {groupedStreamingItems[category].map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 menu-item-card"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 ml-3">
                            ${item.price?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {streamingCart.items.length} items loaded
            </div>
          </div>
        )}

        {!streamingCart && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
            Powered by Claude AI for intelligent menu parsing
          </p>
        )}
      </main>
    </div>
  );
}
