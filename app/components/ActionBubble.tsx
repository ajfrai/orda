'use client';

interface ActionBubbleProps {
  onChatClick: () => void;
  onSearchClick: () => void;
  onAddMenuPageClick: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

export default function ActionBubble({
  onChatClick,
  onSearchClick,
  onAddMenuPageClick,
  isMenuOpen,
  onToggleMenu,
}: ActionBubbleProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Popup Menu */}
      {isMenuOpen && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 mb-2 min-w-[180px]">
          <button
            onClick={() => {
              onAddMenuPageClick();
              onToggleMenu();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onAddMenuPageClick();
              onToggleMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="font-medium">Add Menu Page</span>
          </button>
          <button
            onClick={() => {
              onChatClick();
              onToggleMenu();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onChatClick();
              onToggleMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-medium">Chat</span>
          </button>
          <button
            onClick={() => {
              onSearchClick();
              onToggleMenu();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onSearchClick();
              onToggleMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="font-medium">Search</span>
          </button>
        </div>
      )}

      {/* Main Action Bubble - Sparkle + Plus Icon */}
      <button
        onClick={onToggleMenu}
        onTouchEnd={(e) => {
          e.preventDefault();
          onToggleMenu();
        }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 touch-manipulation ${
          isMenuOpen
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
        }`}
        aria-label="Open menu"
        title="Menu actions"
      >
        {isMenuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Sparkle + Plus combo icon */
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Sparkle (top right) */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 4l.5 1.5L17 6l-1.5.5L15 8l-.5-1.5L13 6l1.5-.5L15 4z"
            />
            {/* Plus (center-left) */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h8m-4-4v8"
            />
            {/* Small sparkle (bottom right) */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 14l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3.3-.9z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
