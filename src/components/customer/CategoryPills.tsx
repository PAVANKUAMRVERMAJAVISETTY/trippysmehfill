import React from 'react';
import { MenuItem, OFFICIAL_CATEGORIES } from '../../types';
import { Utensils } from 'lucide-react';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  items?: MenuItem[];
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  items = []
}) => {
  // Only include available items
  const availableItems = items.filter(item => item.is_available);

  // Filter OFFICIAL_CATEGORIES to only those with at least 1 available item
  const visibleCategories = OFFICIAL_CATEGORIES.filter(cat => {
    // If no items list is passed, default to showing official categories
    if (items.length === 0) return true;

    return availableItems.some(item => {
      const itemCat = (item.category || '').trim().toLowerCase();
      const catName = cat.name.toLowerCase();
      const catDisplay = cat.display.toLowerCase();
      return itemCat === catName || itemCat === catDisplay || itemCat === cat.id.toLowerCase();
    });
  });

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-3 min-w-max justify-start sm:justify-center">
        {/* 'All' category button */}
        <button
          onClick={() => onSelectCategory('All')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer border ${
            selectedCategory === 'All'
              ? 'bg-[#B8862D] text-white font-extrabold border-[#8F691F] shadow-md scale-105'
              : 'bg-white text-[#1F2933] hover:bg-[#F0E8D8] border-[#DDD6C8] hover:border-[#9F988A]'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>All</span>
        </button>

        {/* Dynamic Category Buttons */}
        {visibleCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase() || selectedCategory === cat.display;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer border px-4 py-2.5 ${
                isSelected
                  ? 'bg-[#B8862D] text-white font-extrabold border-[#8F691F] shadow-md scale-105'
                  : 'bg-white text-[#1F2933] hover:bg-[#F0E8D8] border-[#DDD6C8] hover:border-[#9F988A]'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
