'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import type { Menu, MenuItem, Cart, CartItem } from '@/types';
import { TIP_PRESETS } from '@/types';
import MenuItemCard from '@/app/components/MenuItemCard';
import AddItemModal from '@/app/components/add-item-modal';
import EditItemModal from '@/app/components/edit-item-modal';
import AuthModal from '@/app/components/AuthModal';

interface CartResponse {
  cart: Cart;
  menu: Menu;
  cartItems: CartItem[];
}

type ProgressStage = 'setup' | 'parsing' | 'complete';

export default function CartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const cartId = params?.id as string;
  const isStreaming = searchParams?.get('streaming') === 'true';

  const [data, setData] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingComplete, setStreamingComplete] = useState(false);
  const previousItemCount = useRef(0);
  const noChangeCount = useRef(0);
  const [progressStage, setProgressStage] = useState<ProgressStage>('setup');
  const [streamText, setStreamText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const parseMenuStarted = useRef(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'menu' | 'order'>('menu');

  // Swipe state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [hasMetDragThreshold, setHasMetDragThreshold] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Drag threshold in pixels - must drag this far before it's considered a swipe
  const DRAG_THRESHOLD = 10;

  // Tax and tip state
  const [taxRate, setTaxRate] = useState<number>(0);
  const [tipPercentage, setTipPercentage] = useState<number>(18);
  const [customTip, setCustomTip] = useState<string>('');
  const [taxInputValue, setTaxInputValue] = useState<string>('');
  const taxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user name from localStorage on mount and show modal if not set
  useEffect(() => {
    const savedName = localStorage.getItem('orda_user_name');
    if (savedName) {
      setUserName(savedName);
    } else {
      // Automatically show name prompt if no name is set
      setShowAuthModal(true);
    }
  }, []);

  // Sync tax rate and tip percentage when data loads
  useEffect(() => {
    if (data) {
      setTaxRate(data.menu.tax_rate);
      setTipPercentage(data.cart.tip_percentage);
      // Only populate input if it's empty (first load)
      if (taxInputValue === '') {
        setTaxInputValue(data.menu.tax_rate > 0 ? String(data.menu.tax_rate * 100) : '');
      }
    }
  }, [data, taxInputValue]);

  const handleCopyStreamData = async () => {
    if (!streamText) return;
    try {
      await navigator.clipboard.writeText(streamText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareCart = async () => {
    try {
      const shareUrl = window.location.href.split('?')[0]; // Remove query params

      // Try native share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: data?.menu.restaurant_name || 'Join my order',
          text: 'Add your items to our group order!',
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard (desktop)
        await navigator.clipboard.writeText(shareUrl);
        setIsShareCopied(true);
        setTimeout(() => setIsShareCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled or share failed, ignore
      console.error('Failed to share:', err);
    }
  };

  const handleNameSubmit = (name: string) => {
    localStorage.setItem('orda_user_name', name);
    setUserName(name);
  };

  const handleChangeName = () => {
    setUserName(null);
    localStorage.removeItem('orda_user_name');
    setShowAuthModal(true);
  };

  // Tax rate handler with debouncing
  const handleTaxInputChange = (value: string) => {
    setTaxInputValue(value);

    // Clear existing timeout
    if (taxTimeoutRef.current) {
      clearTimeout(taxTimeoutRef.current);
    }

    // Parse and validate
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }

    // Debounce API call
    taxTimeoutRef.current = setTimeout(() => {
      updateTaxRate(numValue);
    }, 800);
  };

  const updateTaxRate = async (percentageValue: number) => {
    if (!data) return;

    try {
      const decimalValue = percentageValue / 100;

      const response = await fetch(`/api/menu/${data.menu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tax_rate: decimalValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tax rate');
      }

      setTaxRate(decimalValue);

      // Refresh cart data
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error updating tax rate:', err);
      // Keep user's input as-is on error
    }
  };

  // Tip percentage handlers
  const handleTipPresetClick = async (preset: number) => {
    try {
      const response = await fetch(`/api/cart/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip_percentage: preset }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tip');
      }

      setTipPercentage(preset);
      setCustomTip('');

      // Refresh cart data
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error updating tip:', err);
      alert('Failed to update tip');
    }
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);

    // Clear existing timeout
    if (tipTimeoutRef.current) {
      clearTimeout(tipTimeoutRef.current);
    }

    const tipValue = parseFloat(value);
    if (isNaN(tipValue) || tipValue < 0 || tipValue > 100) {
      return;
    }

    // Debounce API call
    tipTimeoutRef.current = setTimeout(() => {
      updateTipPercentage(tipValue);
    }, 800);
  };

  const updateTipPercentage = async (tipValue: number) => {
    try {
      const response = await fetch(`/api/cart/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip_percentage: tipValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tip');
      }

      setTipPercentage(tipValue);

      // Refresh cart data
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error updating tip:', err);
      setCustomTip('');
    }
  };

  // Modal handlers
  const handleItemClick = (item: MenuItem) => {
    if (!userName) {
      setShowAuthModal(true);
      return;
    }
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleAddToCart = async (item: MenuItem, quantity: number, notes: string) => {
    if (!userName) {
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/cart/${cartId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName,
          item_name: item.name,
          item_price: item.price,
          is_price_estimate: item.is_estimate,
          quantity,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item to cart');
      }

      // Refresh cart data to show the new item
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error adding item to cart:', err);
      alert(err instanceof Error ? err.message : 'Failed to add item to cart');
    }
  };

  const handleEditCartItem = (item: CartItem) => {
    setSelectedCartItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedCartItem(null);
  };

  const handleUpdateCartItem = async (itemId: string, quantity: number, notes: string) => {
    try {
      const response = await fetch(`/api/cart/${cartId}/items?itemId=${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      // Refresh cart data to show the updated item
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error updating cart item:', err);
      alert(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const handleDeleteCartItem = async (itemId: string) => {
    // Confirm deletion
    if (!confirm('Are you sure you want to remove this item from your order?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cart/${cartId}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      // Refresh cart data to remove the deleted item
      const cartResponse = await fetch(`/api/cart/${cartId}`);
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        setData(cartData);
      }
    } catch (err) {
      console.error('Error deleting cart item:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
    setHasMetDragThreshold(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    const absDiff = Math.abs(diff);

    // Only start dragging if we've moved past the threshold
    if (!hasMetDragThreshold && absDiff < DRAG_THRESHOLD) {
      return;
    }

    // Mark that we've met the drag threshold
    if (!hasMetDragThreshold && absDiff >= DRAG_THRESHOLD) {
      setHasMetDragThreshold(true);
    }

    // Limit drag to screen width
    const maxDrag = window.innerWidth;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));

    // Apply drag direction logic:
    // - On Menu tab: only allow left swipe (negative offset) to peek Order
    // - On Order tab: only allow right swipe (positive offset) to peek Menu
    if (activeTab === 'menu' && limitedDiff < 0) {
      setDragOffset(limitedDiff);
    } else if (activeTab === 'order' && limitedDiff > 0) {
      setDragOffset(limitedDiff);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    setIsDragging(false);
    setHasMetDragThreshold(false);

    const threshold = window.innerWidth * 0.3; // 30% of screen width

    // Switch tabs if dragged past threshold
    if (activeTab === 'menu' && dragOffset < -threshold) {
      setActiveTab('order');
    } else if (activeTab === 'order' && dragOffset > threshold) {
      setActiveTab('menu');
    }

    // Reset offset with animation
    setDragOffset(0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMobile) return;
    setStartX(e.clientX);
    setIsDragging(true);
    setHasMetDragThreshold(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isMobile || !isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - startX;
    const absDiff = Math.abs(diff);

    // Only start dragging if we've moved past the threshold
    if (!hasMetDragThreshold && absDiff < DRAG_THRESHOLD) {
      return;
    }

    // Mark that we've met the drag threshold
    if (!hasMetDragThreshold && absDiff >= DRAG_THRESHOLD) {
      setHasMetDragThreshold(true);
    }

    const maxDrag = window.innerWidth;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));

    if (activeTab === 'menu' && limitedDiff < 0) {
      setDragOffset(limitedDiff);
    } else if (activeTab === 'order' && limitedDiff > 0) {
      setDragOffset(limitedDiff);
    }
  };

  const handlePointerUp = () => {
    if (!isMobile || !isDragging) return;
    setIsDragging(false);
    setHasMetDragThreshold(false);

    const threshold = window.innerWidth * 0.3;

    if (activeTab === 'menu' && dragOffset < -threshold) {
      setActiveTab('order');
    } else if (activeTab === 'order' && dragOffset > threshold) {
      setActiveTab('menu');
    }

    setDragOffset(0);
  };

  // Start parse-menu streaming when streaming=true
  useEffect(() => {
    async function startParsing() {
      if (!isStreaming || parseMenuStarted.current || !cartId) return;

      // Get upload data from sessionStorage
      const uploadDataStr = sessionStorage.getItem('menuUpload');
      if (!uploadDataStr) {
        // If no upload data but cart already has menu data, just skip streaming
        // This happens when user refreshes after streaming completes
        if (data && data.menu && data.menu.items && data.menu.items.length > 0) {
          setStreamingComplete(true);
          setProgressStage('complete');
          return;
        }

        // Otherwise show error
        setError('No upload data found. Please try uploading your menu again from the home page.');
        setLoading(false);
        return;
      }

      parseMenuStarted.current = true;

      try {
        const uploadData = JSON.parse(uploadDataStr);

        // Convert base64 back to blob
        const fileResponse = await fetch(uploadData.fileData);
        const blob = await fileResponse.blob();
        const file = new File([blob], uploadData.fileName, { type: uploadData.fileType });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('cartId', cartId);

        const headers: HeadersInit = {
          'Accept': 'text/event-stream',
        };

        console.log('[DEBUG] Starting parse-menu streaming');

        // Transition from setup to parsing phase
        setProgressStage('parsing');

        const response = await fetch('/api/parse-menu', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Server error: ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          throw new Error(errorMessage);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let hasReceivedData = false;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (!hasReceivedData) {
              throw new Error('Stream ended without receiving any data');
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              hasReceivedData = true;
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                throw new Error(data.error);
              }

              // Update debug text with item JSON
              if (data.item) {
                // Console log each streamed menu item received on client
                console.log(`[${new Date().toISOString()}] Received streamed menu item:`, {
                  name: data.item.name,
                  category: data.category,
                  price: data.item.price,
                  isEstimate: data.item.isEstimate,
                  chips: data.item.chips,
                });
                setStreamText(JSON.stringify(data.item, null, 2));
              }

              // Detect end-of-stream indicator and stop polling
              if (data.type === 'menu_extraction_end' && data.status === 'complete') {
                console.log(`[${new Date().toISOString()}] End-of-stream indicator received - menu extraction complete`);
                setStreamingComplete(true);
                setProgressStage('complete');
                sessionStorage.removeItem('menuUpload');
              }

              // When complete, mark as done
              if (data.complete) {
                console.log('[DEBUG] Streaming complete');
                setStreamingComplete(true);
                setProgressStage('complete');
                sessionStorage.removeItem('menuUpload');
              }
            }
          }
        }
      } catch (err) {
        console.error('[DEBUG] Error parsing menu:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      }
    }

    startParsing();
  }, [cartId, isStreaming, progressStage]);

  // Fetch cart data initially
  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await fetch(`/api/cart/${cartId}`);
        if (!response.ok) {
          // If cart doesn't have menu yet (during streaming), that's okay
          if (isStreaming) {
            setData({
              cart: { id: cartId, menu_id: null, tip_percentage: 18, created_at: new Date().toISOString() },
              menu: { id: '', restaurant_name: '', items: [], location: { city: '', state: '' }, tax_rate: 0, pdf_url: null, created_at: new Date().toISOString() },
              cartItems: [],
            });
            setLoading(false);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch cart');
        }
        const cartData = await response.json();
        setData(cartData);
        previousItemCount.current = cartData.menu.items.length;

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    if (cartId) {
      fetchCart();
    }
  }, [cartId, isStreaming]);

  // Poll for updates when streaming
  useEffect(() => {
    if (!isStreaming || streamingComplete || !cartId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/cart/${cartId}`);
        if (!response.ok) return;

        const cartData = await response.json();

        // Check if we have new items
        const currentItemCount = cartData.menu.items.length;
        if (currentItemCount > previousItemCount.current) {
          console.log('[DEBUG] New items detected:', currentItemCount, 'vs', previousItemCount.current);
          setData(cartData);

          // Update debug text with the latest item
          const latestItem = cartData.menu.items[cartData.menu.items.length - 1];
          if (latestItem) {
            setStreamText(JSON.stringify(latestItem, null, 2));
          }

          previousItemCount.current = currentItemCount;
          noChangeCount.current = 0; // Reset no-change counter
        } else {
          noChangeCount.current += 1;

          // Stop polling if no changes for 10 consecutive polls (5 seconds)
          if (noChangeCount.current >= 10) {
            console.log('[DEBUG] No new items for 5 seconds, streaming complete');
            setStreamingComplete(true);
            setProgressStage('complete');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
      }
    }, 500); // Poll every 500ms

    // Stop polling after 60 seconds as fallback
    const timeout = setTimeout(() => {
      console.log('[DEBUG] Stopping polling after timeout');
      setStreamingComplete(true);
      clearInterval(pollInterval);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [cartId, isStreaming, streamingComplete]);

  // Group items by category
  const groupedItems = data?.menu.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = groupedItems ? Object.keys(groupedItems).sort() : [];

  // Calculate totals
  const subtotal = data?.cartItems.reduce((sum, item) => sum + (item.item_price * item.quantity), 0) || 0;
  const taxAmount = subtotal * taxRate;
  const tipAmount = subtotal * (tipPercentage / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSubmit={handleNameSubmit}
      />

      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                {isStreaming ? 'Setting up your cart...' : 'Loading cart...'}
              </p>
              {isStreaming && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Menu items will appear as they're parsed by AI
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {data && (
            <>
              {/* Header */}
              <div className="mb-6">
                {/* Share Button - Prominent at top */}
                <button
                  onClick={handleShareCart}
                  className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isShareCopied ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Share Cart with Friends</span>
                    </>
                  )}
                </button>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {data.menu.restaurant_name || 'Your Order'}
                    </h1>
                  </div>

                  {/* User Menu */}
                  <div className="flex items-center gap-3">
                    {userName ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {userName}
                        </span>
                        <button
                          onClick={handleChangeName}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition"
                        >
                          Change Name
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition"
                      >
                        Enter Your Name
                      </button>
                    )}
                  </div>
                </div>
                {data.menu.restaurant_name && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {data.menu.location.city}, {data.menu.location.state}
                  </p>
                )}
                {data.menu.pdf_url && (
                  <a
                    href={data.menu.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View original menu
                  </a>
                )}

                {/* Tab Navigation */}
                <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`relative px-6 py-3 font-semibold transition-all cursor-pointer ${
                      activeTab === 'menu'
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Menu
                  </button>
                  <button
                    onClick={() => setActiveTab('order')}
                    className={`relative px-6 py-3 font-semibold transition-all cursor-pointer ${
                      activeTab === 'order'
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Order
                    {data.cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {data.cartItems.length}
                      </span>
                    )}
                  </button>
                </div>
                {isStreaming && !streamingComplete && (
                  <div className="mt-4 space-y-2 text-sm">
                    {/* Setup phase */}
                    <div className={`flex items-center gap-2 transition-all ${
                      progressStage === 'setup'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {progressStage === 'setup' ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span>Setting up...</span>
                    </div>

                    {/* Parsing phase */}
                    <div className={`flex items-center gap-2 transition-all ${
                      progressStage === 'parsing'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : progressStage === 'setup'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {progressStage === 'parsing' ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : progressStage === 'complete' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                      <span>
                        Parsing menu items
                        {progressStage === 'parsing' && data?.menu.items.length ? ` (${data.menu.items.length} found)` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Parsing View */}
                {isStreaming && progressStage === 'parsing' && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Real-time Menu Extraction
                      </h3>
                      <button
                        onClick={handleCopyStreamData}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition"
                      >
                        {isCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {streamText || 'Waiting for next item...'}
                    </pre>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Items are being extracted and added to the menu below in real-time.
                    </p>
                  </div>
                )}
              </div>

              {/* Tab Content Container with Swipe Support */}
              <div
                className="relative overflow-hidden touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <div
                  ref={contentRef}
                  className={`flex transition-transform ${hasMetDragThreshold ? 'duration-0' : 'duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]'}`}
                  style={{
                    transform: `translateX(calc(${activeTab === 'menu' ? '0%' : '-100%'} + ${dragOffset}px))`,
                  }}
                >
                  {/* Menu Tab Content */}
                  <div
                    className="w-full flex-shrink-0 space-y-8"
                    style={{
                      pointerEvents: activeTab === 'menu' && !hasMetDragThreshold ? 'auto' : 'none',
                      opacity: hasMetDragThreshold && activeTab === 'order' && dragOffset > 0 ? 0.98 : 1,
                      transform: hasMetDragThreshold && activeTab === 'order' && dragOffset > 0 ? 'scale(0.98)' : 'scale(1)',
                    }}
                  >
                    {categories.map((category) => {
                      const previousCategories = categories.slice(0, categories.indexOf(category));
                      const globalStartIndex = previousCategories.reduce(
                        (sum, cat) => sum + groupedItems![cat].length,
                        0
                      );

                      return (
                        <div key={category}>
                          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {category}
                          </h2>
                          <div className="space-y-3">
                            {groupedItems![category].map((item, idx) => (
                              <MenuItemCard
                                key={`${item.name}-${idx}`}
                                item={item}
                                index={globalStartIndex + idx}
                                onAddToCart={handleItemClick}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Tab Content */}
                  <div
                    className="w-full flex-shrink-0 space-y-8 pl-6"
                    style={{
                      pointerEvents: activeTab === 'order' && !hasMetDragThreshold ? 'auto' : 'none',
                      opacity: hasMetDragThreshold && activeTab === 'menu' && dragOffset < 0 ? 0.98 : 1,
                      transform: hasMetDragThreshold && activeTab === 'menu' && dragOffset < 0 ? 'scale(0.98)' : 'scale(1)',
                    }}
                  >
                    {/* Cart Items Section */}
                    {data.cartItems.length > 0 ? (
                      <div>
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                          Current Orders
                        </h2>
                        <div className="space-y-2">
                          {data.cartItems.map((cartItem) => (
                            <div
                              key={cartItem.id}
                              className="flex justify-between items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                            >
                              <div className="flex-1">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {cartItem.user_name}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 mx-2">•</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {cartItem.quantity}x {cartItem.item_name}
                                </span>
                                {cartItem.notes && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Note: {cartItem.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  ${(cartItem.item_price * cartItem.quantity).toFixed(2)}
                                </span>
                                <button
                                  onClick={() => handleEditCartItem(cartItem)}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                                  aria-label="Edit item"
                                  title="Edit item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteCartItem(cartItem.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                  aria-label="Delete item"
                                  title="Delete item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No items in order yet. Browse the menu to add items!</p>
                      </div>
                    )}

                    {/* Tax and Tip Settings */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
                        Tax & Tip
                      </h2>

                      <div className="space-y-6">
                        {/* Tax Rate Input */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Tax Rate
                            </label>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              ${taxAmount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              value={taxInputValue}
                              onChange={(e) => handleTaxInputChange(e.target.value)}
                              className="w-28 px-4 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                            />
                            <span className="text-base font-medium text-gray-600 dark:text-gray-400">%</span>
                          </div>
                        </div>

                        {/* Tip Percentage */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Tip
                            </label>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              ${tipAmount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            {/* Preset buttons */}
                            {TIP_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                onClick={() => handleTipPresetClick(preset)}
                                className={`min-w-[60px] px-4 py-3 text-base font-semibold rounded-xl transition-all ${
                                  tipPercentage === preset && !customTip
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                {preset}%
                              </button>
                            ))}

                            {/* Custom tip input */}
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Other"
                                value={customTip}
                                onChange={(e) => handleCustomTipChange(e.target.value)}
                                className="w-24 px-4 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                              />
                              <span className="text-base font-medium text-gray-600 dark:text-gray-400">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Total Items:</span> {data.menu.items.length}
                        </div>
                        <div>
                          <span className="font-medium">Categories:</span> {categories.length}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Cart ID:</span>{' '}
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                            {cartId}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddToCart}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        item={selectedCartItem}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdateCartItem}
      />
    </div>
  );
}
