'use client';

import { MenuItem } from '@/types';

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  onAddToCart?: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, index, onAddToCart }: MenuItemCardProps) {
  return (
    <div
      className="menu-item-card opacity-0"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex justify-between items-start p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 cursor-pointer">
        <div className="flex-1">
          {/* Item Name with Dietary Indicators */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              {item.name}
            </h3>
            {(item.is_spicy || item.is_vegetarian || item.is_vegan || item.is_gluten_free || item.is_kosher) && (
              <div className="flex gap-1 text-sm">
                {item.is_spicy && (
                  <span title="Spicy" className="hover:scale-125 transition-transform">
                    🌶️
                  </span>
                )}
                {item.is_vegetarian && (
                  <span title="Vegetarian" className="hover:scale-125 transition-transform">
                    🥬
                  </span>
                )}
                {item.is_vegan && (
                  <span title="Vegan" className="hover:scale-125 transition-transform">
                    🌱
                  </span>
                )}
                {item.is_gluten_free && (
                  <span title="Gluten Free" className="hover:scale-125 transition-transform">
                    🌾
                  </span>
                )}
                {item.is_kosher && (
                  <span title="Kosher" className="hover:scale-125 transition-transform">
                    ✡️
                  </span>
                )}
              </div>
            )}
          </div>

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
