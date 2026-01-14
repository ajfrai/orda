'use client';

import { useParams } from 'next/navigation';

export default function CartPage() {
  const params = useParams();
  const cartId = params?.id as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Cart Page
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Cart ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cartId}</code>
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              🚧 This cart page is under construction. The full cart UI with menu browsing, real-time collaboration, and cost splitting is coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
