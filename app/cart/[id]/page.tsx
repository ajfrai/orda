'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import type { Menu, MenuItem, Cart, CartItem } from '@/types';
import MenuItemCard from '@/app/components/MenuItemCard';

interface CartResponse {
  cart: Cart;
  menu: Menu;
  cartItems: CartItem[];
}

export default function CartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const cartId = params?.id as string;
  const isStreaming = searchParams?.get('streaming') === 'true';

  const [data, setData] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingComplete, setStreamingComplete] = useState(false);
  const previousItemCount = useRef(0);
  const noChangeCount = useRef(0);
  const [progressStage, setProgressStage] = useState<'downloading' | 'parsing' | 'extracting' | 'complete'>('downloading');

  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await fetch(`/api/cart/${cartId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch cart');
        }
        const cartData = await response.json();
        setData(cartData);
        previousItemCount.current = cartData.menu.items.length;

        // Update progress stage based on item count
        if (isStreaming) {
          if (cartData.menu.items.length === 0) {
            setProgressStage('parsing');
          } else if (cartData.menu.items.length > 0) {
            setProgressStage('extracting');
          }
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    if (cartId) {
      fetchCart();
    }
  }, [cartId, isStreaming]);

  // Poll for updates when streaming
  useEffect(() => {
    if (!isStreaming || streamingComplete || !cartId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/cart/${cartId}`);
        if (!response.ok) return;

        const cartData = await response.json();

        // Check if we have new items
        const currentItemCount = cartData.menu.items.length;
        if (currentItemCount > previousItemCount.current) {
          console.log('[DEBUG] New items detected:', currentItemCount, 'vs', previousItemCount.current);
          setData(cartData);
          previousItemCount.current = currentItemCount;
          noChangeCount.current = 0; // Reset no-change counter

          // Update progress stage
          if (currentItemCount > 0) {
            setProgressStage('extracting');
          }
        } else {
          noChangeCount.current += 1;

          // Stop polling if no changes for 10 consecutive polls (5 seconds)
          if (noChangeCount.current >= 10) {
            console.log('[DEBUG] No new items for 5 seconds, streaming complete');
            setStreamingComplete(true);
            setProgressStage('complete');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
      }
    }, 500); // Poll every 500ms

    // Stop polling after 60 seconds as fallback
    const timeout = setTimeout(() => {
      console.log('[DEBUG] Stopping polling after timeout');
      setStreamingComplete(true);
      clearInterval(pollInterval);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [cartId, isStreaming, streamingComplete]);

  // Group items by category
  const groupedItems = data?.menu.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = groupedItems ? Object.keys(groupedItems).sort() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                {isStreaming ? 'Setting up your cart...' : 'Loading cart...'}
              </p>
              {isStreaming && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Menu items will appear as they're parsed by AI
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {data && (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {data.menu.restaurant_name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {data.menu.location.city}, {data.menu.location.state} • Tax Rate: {(data.menu.tax_rate * 100).toFixed(2)}%
                </p>
                {data.menu.pdf_url && (
                  <a
                    href={data.menu.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View original menu
                  </a>
                )}
                {isStreaming && (
                  <div className="mt-4 space-y-2 text-sm">
                    {/* Downloading menu */}
                    <div className={`flex items-center gap-2 transition-all ${
                      progressStage === 'downloading'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : progressStage === 'parsing' || progressStage === 'extracting' || progressStage === 'complete'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {progressStage === 'downloading' ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span>Downloading menu</span>
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
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : progressStage === 'extracting' || progressStage === 'complete' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 animate-spin opacity-0" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>Sending menu to Claude</span>
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
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : progressStage === 'complete' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 animate-spin opacity-0" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>
                        Extracting menu items
                        {progressStage === 'extracting' && data?.menu.items.length ? ` (${data.menu.items.length} found)` : ''}
                      </span>
                    </div>

                    {streamingComplete && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-600 dark:text-green-400 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Menu loaded successfully</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu Items by Category */}
              <div className="space-y-8">
                {categories.map((category) => {
                  // Calculate the starting index for this category
                  const previousCategories = categories.slice(0, categories.indexOf(category));
                  const globalStartIndex = previousCategories.reduce(
                    (sum, cat) => sum + groupedItems![cat].length,
                    0
                  );

                  return (
                    <div key={category}>
                      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                        {category}
                      </h2>
                      <div className="space-y-3">
                        {groupedItems![category].map((item, idx) => (
                          <MenuItemCard
                            key={`${item.name}-${idx}`}
                            item={item}
                            index={globalStartIndex + idx}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Items Section */}
              {data.cartItems.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Current Orders
                  </h2>
                  <div className="space-y-2">
                    {data.cartItems.map((cartItem) => (
                      <div
                        key={cartItem.id}
                        className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {cartItem.user_name}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 mx-2">•</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {cartItem.quantity}x {cartItem.item_name}
                          </span>
                          {cartItem.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Note: {cartItem.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ${(cartItem.item_price * cartItem.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Total Items:</span> {data.menu.items.length}
                  </div>
                  <div>
                    <span className="font-medium">Categories:</span> {categories.length}
                  </div>
                  <div>
                    <span className="font-medium">Cart ID:</span>{' '}
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                      {cartId}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Tip:</span> {data.cart.tip_percentage}%
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
