import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Package, ChevronDown, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  points_spent: number;
  created_at: string;
  profiles: { username: string };
  products: { name: string; image_url: string | null };
}

const PurchaseTable = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Purchase['status']>('all');
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const query = supabase
        .from('purchases')
        .select(`
          id,
          user_id,
          product_id,
          status,
          points_spent,
          created_at,
          profiles!purchases_user_id_fkey (
            username
          ),
          products!purchases_product_id_fkey (
            name,
            image_url
          )
        `);

      if (statusFilter !== 'all') {
        query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Purchase interface
      const transformedData = data.map((purchase: any) => ({
        ...purchase,
        profiles: purchase.profiles,
        products: purchase.products
      }));

      setPurchases(transformedData as Purchase[]);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        variant: "destructive",
        title: "Error fetching purchases",
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  const updatePurchaseStatus = async (purchaseId: string, newStatus: Purchase['status']) => {
    setUpdatingId(purchaseId);
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

      if (error) throw error;
      
      await fetchPurchases();

      toast({
        variant: "success",
        title: "Status Updated",
        description: `Purchase status successfully updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast({
        variant: "destructive",
        title: 'Update Failed',
        description: 'Failed to update purchase status.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: Purchase['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30', icon: Clock },
      completed: { color: 'bg-green-500/20 text-green-200 border-green-500/30', icon: CheckCircle2 },
      cancelled: { color: 'bg-red-500/20 text-red-200 border-red-500/30', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1 px-2 py-1`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <span className="text-purple-300">Loading purchases...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
          Purchase Management
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-gray-900/70 border border-gray-800">
              <span className="mr-2">Filter by Status</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44 bg-gray-900/90 border border-gray-800">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('completed')}>Completed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Package className="h-8 w-8 mb-2" />
                      <p className="text-lg font-medium">No purchases found</p>
                      <p className="text-sm">
                        {statusFilter === 'all' 
                          ? 'There are no purchases in the system yet.'
                          : `No purchases with status "${statusFilter}" found.`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} className="group">
                    <TableCell className="font-mono text-sm">
                      {format(new Date(purchase.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-purple-200">{purchase.profiles.username}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {purchase.products.image_url ? (
                          <img 
                            src={purchase.products.image_url} 
                            alt={purchase.products.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium">{purchase.products.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-purple-300">{purchase.points_spent}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        defaultValue={purchase.status}
                        onValueChange={(value) => 
                          updatePurchaseStatus(purchase.id, value as Purchase['status'])
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PurchaseTable; 