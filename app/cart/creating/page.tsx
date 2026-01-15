'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ProgressStage = 'downloading' | 'parsing' | 'extracting' | 'complete';

export default function CreatingCartPage() {
  const router = useRouter();
  const [progressStage, setProgressStage] = useState<ProgressStage>('downloading');
  const [error, setError] = useState<string | null>(null);

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

              // Handle cart creation - redirect immediately when we get cart ID
              if (data.cartId && !cartId) {
                cartId = data.cartId;
                console.log('[DEBUG] Cart created, redirecting immediately to:', cartId);
                // Clean up sessionStorage
                sessionStorage.removeItem('menuUpload');
                // Redirect to cart page where streaming will continue
                window.location.href = `/cart/${cartId}?streaming=true`;
                return;
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

                {/* Creating cart */}
                <div className={`flex items-center gap-2 transition-all ${
                  progressStage === 'parsing'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-medium">Creating cart...</span>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
