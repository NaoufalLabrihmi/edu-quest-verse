import React from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type PurchaseStatus = 'pending' | 'completed' | 'cancelled';

export const PurchaseStatusBadge: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30', icon: Clock },
    completed: { color: 'bg-green-500/20 text-green-200 border-green-500/30', icon: CheckCircle2 },
    cancelled: { color: 'bg-red-500/20 text-red-200 border-red-500/30', icon: XCircle },
  };
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} flex items-center gap-1 px-2 py-1 text-xs font-semibold`}> 
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}; 