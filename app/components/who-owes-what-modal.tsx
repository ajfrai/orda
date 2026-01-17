'use client';

import { useState } from 'react';
import type { CartItem } from '@/types';

interface PersonBreakdown {
  name: string;
  items: CartItem[];
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
}

interface WhoOwesWhatModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  taxRate: number;
  tipPercentage: number;
  restaurantName: string;
}

export default function WhoOwesWhatModal({
  isOpen,
  onClose,
  cartItems,
  taxRate,
  tipPercentage,
  restaurantName,
}: WhoOwesWhatModalProps) {
  const [copiedPerson, setCopiedPerson] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate group subtotal
  const groupSubtotal = cartItems.reduce(
    (sum, item) => sum + item.item_price * item.quantity,
    0
  );

  // Calculate total tax and tip for the group
  const totalTax = groupSubtotal * taxRate;
  const totalTip = groupSubtotal * (tipPercentage / 100);

  // Group items by person and calculate their breakdown
  const personBreakdowns: PersonBreakdown[] = [];
  const itemsByPerson: Record<string, CartItem[]> = {};

  // Group cart items by person
  cartItems.forEach((item) => {
    if (!itemsByPerson[item.user_name]) {
      itemsByPerson[item.user_name] = [];
    }
    itemsByPerson[item.user_name].push(item);
  });

  // Calculate breakdown for each person
  Object.entries(itemsByPerson).forEach(([name, items]) => {
    const personSubtotal = items.reduce(
      (sum, item) => sum + item.item_price * item.quantity,
      0
    );

    // Proportional tax and tip
    const personTaxShare = (personSubtotal / groupSubtotal) * totalTax;
    const personTipShare = (personSubtotal / groupSubtotal) * totalTip;
    const personTotal = personSubtotal + personTaxShare + personTipShare;

    personBreakdowns.push({
      name,
      items,
      subtotal: personSubtotal,
      taxShare: personTaxShare,
      tipShare: personTipShare,
      total: personTotal,
    });
  });

  // Sort alphabetically by name
  personBreakdowns.sort((a, b) => a.name.localeCompare(b.name));

  const handleCopy = async (person: PersonBreakdown) => {
    const text = `${person.name} owes $${person.total.toFixed(2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPerson(person.name);
      setTimeout(() => setCopiedPerson(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Who Owes What
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {restaurantName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4">
            {personBreakdowns.map((person) => (
              <div
                key={person.name}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 border border-indigo-100 dark:border-gray-600 rounded-xl p-5 shadow-sm"
              >
                {/* Person Name */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {person.name}
                  </h3>
                  <button
                    onClick={() => handleCopy(person)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-500 flex items-center gap-2"
                  >
                    {copiedPerson === person.name ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Items List */}
                <div className="mb-3 space-y-1">
                  {person.items.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-medium">
                        {item.quantity}x
                      </span>{' '}
                      {item.item_name}
                      {item.notes && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({item.notes})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="border-t border-indigo-200 dark:border-gray-600 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      ${person.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Tax share</span>
                    <span>${person.taxShare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Tip share</span>
                    <span>${person.tipShare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-indigo-200 dark:border-gray-600">
                    <span>Total owed</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      ${person.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
