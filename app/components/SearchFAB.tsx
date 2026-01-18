'use client';

interface SearchFABProps {
  onClick: () => void;
  isActive: boolean;
}

export default function SearchFAB({ onClick, isActive }: SearchFABProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      aria-label="Search menu"
      title="Search menu"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isActive ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        )}
      </svg>
    </button>
  );
}
