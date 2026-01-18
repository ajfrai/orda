'use client';

import { useState, useEffect } from 'react';
import { MenuItem } from '@/types';

interface EditMenuItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (originalItem: MenuItem, updatedItem: MenuItem) => void;
}

export default function EditMenuItemModal({ item, isOpen, onClose, onSave }: EditMenuItemModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [chipsInput, setChipsInput] = useState('');
  const [isEstimate, setIsEstimate] = useState(false);

  // Reset state when modal opens with new item
  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
      setDescription(item.description || '');
      setPrice(item.price.toFixed(2));
      setCategory(item.category);
      setChipsInput(item.chips?.join(', ') || '');
      setIsEstimate(item.is_estimate);
    }
  }, [isOpen, item]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      alert('Please enter a valid price');
      return;
    }

    if (!name.trim() || !category.trim()) {
      alert('Name and category are required');
      return;
    }

    const chips = chipsInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const updatedItem: MenuItem = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: priceValue,
      category: category.trim(),
      chips: chips.length > 0 ? chips : undefined,
      is_estimate: isEstimate,
    };

    onSave(item, updatedItem);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2
            id="edit-modal-title"
            className="text-xl font-bold text-white"
          >
            Edit Menu Item
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Item Name */}
          <div className="space-y-2">
            <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Item Name *
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
              placeholder="Item name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description (optional)"
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Price *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category *
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
              placeholder="e.g., Appetizers, Entrees, Desserts"
            />
          </div>

          {/* Dietary Tags & Regional Chips */}
          <div className="space-y-2">
            <label htmlFor="chips" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags & Specialties
            </label>
            <input
              id="chips"
              type="text"
              value={chipsInput}
              onChange={(e) => setChipsInput(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
              placeholder="Spicy, Vegetarian, Oaxacan, Hyderabadi (comma-separated)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Include dietary tags (Spicy, Vegetarian, Vegan) and regional specialties (Oaxacan, Sichuan, etc.)
            </p>
          </div>

          {/* Is Estimate Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="is-estimate"
              type="checkbox"
              checked={isEstimate}
              onChange={(e) => setIsEstimate(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 dark:focus:ring-amber-400 dark:ring-offset-gray-800 focus:ring-2"
            />
            <label htmlFor="is-estimate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Price is an estimate
            </label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
