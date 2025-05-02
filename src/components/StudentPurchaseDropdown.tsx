import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ShoppingBag, X } from 'lucide-react';
import { PurchaseStatusBadge, PurchaseStatus } from './admin/PurchaseStatusBadge';

const TABS: { label: string; value: 'all' | PurchaseStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function StudentPurchaseDropdown({
  purchases,
  loading,
  onClose,
}: {
  purchases: any[];
  loading: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'all' | PurchaseStatus>('all');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof MouseEvent && ref.current && !ref.current.contains(e.target as Node)) onClose();
      if (e instanceof KeyboardEvent && e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handle);
    };
  }, [onClose]);

  const filtered = tab === 'all' ? purchases : purchases.filter(p => p.status === tab);

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-96 max-w-[95vw] rounded-2xl shadow-2xl z-50 p-0 overflow-hidden animate-in fade-in bg-gradient-to-br from-purple-900/80 via-gray-900/90 to-gray-950/90 border border-purple-700/60 backdrop-blur-xl"
      style={{ minWidth: 320 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-800 bg-gradient-to-r from-purple-900/80 to-gray-900 flex items-center justify-between">
        <span className="text-lg font-bold text-purple-200 tracking-wide">Your Purchases</span>
        <button onClick={onClose} className="text-gray-400 hover:text-purple-300 transition"><X className="w-5 h-5" /></button>
      </div>
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t.value}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500/60
              ${tab === t.value ? 'bg-purple-700/80 text-white shadow' : 'bg-gray-900/60 text-purple-200 hover:bg-purple-800/30'}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-800 bg-gradient-to-br from-transparent to-gray-900/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-purple-200 animate-pulse">
            <Loader2 className="animate-spin mb-2" />
            Loading your purchases...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ShoppingBag className="h-10 w-10 mb-2 text-purple-400/60" />
            <div className="text-lg font-semibold mb-1">No purchases</div>
            <div className="text-sm">You haven't redeemed any rewards yet.</div>
          </div>
        ) : (
          filtered.map((purchase) => (
            <div key={purchase.id} className="flex items-center gap-3 px-4 py-4 hover:bg-purple-900/20 transition group">
              {/* Product image */}
              {purchase.products?.image_url ? (
                <img src={purchase.products.image_url} alt={purchase.products.name} className="w-14 h-14 rounded-xl object-cover bg-gray-800 border-2 border-purple-800/40 shadow group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center border-2 border-purple-800/40">
                  <ShoppingBag className="w-7 h-7 text-gray-400" />
                </div>
              )}
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-purple-100 truncate text-base">{purchase.products?.name}</div>
                <div className="text-xs text-gray-400 font-mono">{new Date(purchase.created_at).toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-purple-300 font-bold text-sm">-{purchase.points_spent} pts</span>
                  <PurchaseStatusBadge status={purchase.status} />
                  {purchase.status === 'pending' && <span className="ml-1 animate-pulse text-yellow-300 text-xs">• processing</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 