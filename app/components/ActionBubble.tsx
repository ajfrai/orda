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
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 mb-2 whitespace-nowrap">
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
            <span className="font-medium">Add Page</span>
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
            {/* Sparkle icon for AI chat */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
            <span className="font-medium">AI Chat</span>
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

      {/* Main Action Bubble - Original Sparkle Icon */}
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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
