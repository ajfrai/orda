'use client';

import { MenuItem } from '@/types';

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  onAddToCart?: (item: MenuItem) => void;
  onEdit?: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, index, onAddToCart, onEdit }: MenuItemCardProps) {
  const handleClick = () => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (onEdit) {
      onEdit(item);
    }
  };

  return (
    <div
      className="menu-item-card opacity-0 group"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        className="flex justify-between items-start p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 cursor-pointer relative"
        onClick={handleClick}
      >
        {/* Edit Button - Always visible on mobile, hover-only on desktop */}
        {onEdit && (
          <button
            onClick={handleEdit}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all md:opacity-0 md:group-hover:opacity-100"
            aria-label="Edit menu item"
            title="Edit menu item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          {/* Item Name */}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
            {item.name}
          </h3>

          {/* Dietary/Attribute Chips */}
          {item.chips && item.chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.chips.map((chip, chipIndex) => (
                <span
                  key={chipIndex}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Price Section */}
        <div className="text-right ml-4 flex-shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            ${item.price.toFixed(2)}
          </p>
          {item.is_estimate && (
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
              estimate
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
