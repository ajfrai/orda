'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchPanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close search"
      />

      {/* Full-screen modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Menu
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            aria-label="Close search"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search items, descriptions..."
              className="w-full px-4 py-3 pl-12 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Searches item names, descriptions, categories, and ingredients
          </p>
        </div>

        {/* Content area (can show search results here in the future) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          {searchQuery ? (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
              <p>Filtering menu items as you type...</p>
              <p className="text-xs mt-2">Results will appear in the menu below</p>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
              <p>Start typing to search the menu</p>
              <div className="text-left space-y-2 text-xs max-w-sm mx-auto mt-4">
                <p className="font-medium text-gray-600 dark:text-gray-300">Search for:</p>
                <p>• Item names (e.g., "lamb", "pizza")</p>
                <p>• Descriptions and ingredients</p>
                <p>• Categories (e.g., "appetizer", "vegan")</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
