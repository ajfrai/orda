'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Menu, MenuItem, Cart, CartItem } from '@/types';
import MenuItemCard from '@/app/components/MenuItemCard';

interface CartResponse {
  cart: Cart;
  menu: Menu;
  cartItems: CartItem[];
}

export default function CartPage() {
  const params = useParams();
  const cartId = params?.id as string;
  const [data, setData] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (cartId) {
      fetchCart();
    }
  }, [cartId]);

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
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading cart...</p>
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
