'use client';

import { useState, useEffect } from 'react';

interface EditRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { restaurantName: string; city: string; state: string }) => void;
  currentData: {
    restaurantName: string;
    city: string;
    state: string;
  };
}

export default function EditRestaurantModal({
  isOpen,
  onClose,
  onSave,
  currentData
}: EditRestaurantModalProps) {
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when currentData changes
  useEffect(() => {
    setRestaurantName(currentData.restaurantName === 'Your Order' ? '' : currentData.restaurantName);
    setCity(currentData.city === 'Unknown' ? '' : currentData.city);
    setState(currentData.state === 'Unknown' ? '' : currentData.state);
  }, [currentData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one field is filled
    if (!restaurantName.trim() && !city.trim() && !state.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        restaurantName: restaurantName.trim() || currentData.restaurantName,
        city: city.trim() || currentData.city,
        state: state.trim() || currentData.state,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Edit Restaurant Details
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Update the restaurant name and location
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter restaurant name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter state (e.g., CA, NY)"
              maxLength={2}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
