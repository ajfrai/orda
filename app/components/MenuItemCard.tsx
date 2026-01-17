'use client';

import { MenuItem } from '@/types';

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  onAddToCart?: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, index, onAddToCart }: MenuItemCardProps) {
  const handleClick = () => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  return (
    <div
      className="menu-item-card opacity-0"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        className="flex justify-between items-start p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 cursor-pointer relative"
        onClick={handleClick}
      >
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
