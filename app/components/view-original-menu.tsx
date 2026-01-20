'use client';

import { useState, useEffect, useMemo } from 'react';

interface ViewOriginalMenuProps {
  pdfUrl: string | null;
  restaurantName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ViewOriginalMenu({ pdfUrl, restaurantName, isOpen: externalIsOpen, onClose }: ViewOriginalMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Parse pdfUrl - could be single URL string or JSON array of URLs
  const imageUrls = useMemo(() => {
    if (!pdfUrl) return [];

    // Try to parse as JSON array
    if (pdfUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(pdfUrl);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not valid JSON, treat as single URL
      }
    }

    // Single URL
    return [pdfUrl];
  }, [pdfUrl]);

  // Use external control if provided, otherwise use internal state
  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Reset to first image when opening
  useEffect(() => {
    if (isModalOpen) {
      setCurrentIndex(0);
    }
  }, [isModalOpen]);

  // Close on Escape key, navigate with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      if (e.key === 'Escape') {
        if (onClose) {
          onClose();
        } else {
          setInternalIsOpen(false);
        }
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < imageUrls.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, onClose, currentIndex, imageUrls.length]);

  if (imageUrls.length === 0) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (onClose) {
        onClose();
      } else {
        setInternalIsOpen(false);
      }
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const currentUrl = imageUrls[currentIndex];
  const isPdf = currentUrl.toLowerCase().endsWith('.pdf');
  const hasMultiple = imageUrls.length > 1;

  return (
    <>
      {/* Subtle button at the bottom of the menu - only show in uncontrolled mode */}
      {externalIsOpen === undefined && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setInternalIsOpen(true)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View original menu {hasMultiple && `(${imageUrls.length} pages)`}
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="original-menu-title"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 flex justify-between items-center">
              <h2
                id="original-menu-title"
                className="text-xl font-bold text-white"
              >
                Original Menu - {restaurantName}
                {hasMultiple && (
                  <span className="ml-2 text-white/80 font-normal text-base">
                    ({currentIndex + 1} of {imageUrls.length})
                  </span>
                )}
              </h2>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 relative">
              {isPdf ? (
                <iframe
                  src={currentUrl}
                  className="w-full h-full min-h-[600px] rounded-lg"
                  title={`Original Menu PDF${hasMultiple ? ` - Page ${currentIndex + 1}` : ''}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <img
                    src={currentUrl}
                    alt={`Original Menu${hasMultiple ? ` - Page ${currentIndex + 1}` : ''}`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Navigation Arrows */}
              {hasMultiple && (
                <>
                  {currentIndex > 0 && (
                    <button
                      onClick={() => setCurrentIndex(currentIndex - 1)}
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-700/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 transition-colors"
                      aria-label="Previous page"
                    >
                      <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {currentIndex < imageUrls.length - 1 && (
                    <button
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-700/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 transition-colors"
                      aria-label="Next page"
                    >
                      <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail strip for multiple images */}
            {hasMultiple && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentIndex
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      {url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z"/>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="sr-only">Page {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in new tab
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
