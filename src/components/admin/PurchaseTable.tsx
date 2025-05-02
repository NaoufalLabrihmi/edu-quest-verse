import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Package, ChevronDown, Loader2, CheckCircle2, XCircle, Clock, Trash2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import debounce from 'lodash/debounce';
import { PurchaseStatusBadge } from './PurchaseStatusBadge';

const ITEMS_PER_PAGE = 8;

type PurchaseStatus = 'pending' | 'completed' | 'cancelled';
type StatusFilter = PurchaseStatus | 'all';

interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  status: PurchaseStatus;
  points_spent: number;
  created_at: string;
  profiles: { username: string };
  products: { name: string; image_url: string | null };
}

const PurchaseTable = () => {
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('purchases')
        .select(`
          *,
          profiles:profiles!purchases_user_id_fkey (
            username
          ),
          products:products!purchases_product_id_fkey (
            name,
            image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data
      const transformedData = (data || []).map((purchase: any) => ({
        id: purchase.id,
        user_id: purchase.user_id,
        product_id: purchase.product_id,
        status: purchase.status as PurchaseStatus,
        points_spent: purchase.points_spent,
        created_at: purchase.created_at,
        profiles: {
          username: purchase.profiles.username
        },
        products: {
          name: purchase.products.name,
          image_url: purchase.products.image_url
        }
      }));

      setAllPurchases(transformedData);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast({
        variant: "destructive",
        title: "Error fetching purchases",
        description: "Please try again later."
      });
      setAllPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  // Filter and paginate purchases on the frontend
  const filteredPurchases = useMemo(() => {
    let result = [...allPurchases];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim().toLowerCase();
      result = result.filter(purchase => 
        purchase.products.name.toLowerCase().includes(searchTerm)
      );
    }
    
    return result;
  }, [allPurchases, searchQuery]);

  // Calculate pagination
  const filteredItemsCount = filteredPurchases.length;
  const totalPages = Math.ceil(filteredItemsCount / ITEMS_PER_PAGE);
  
  // Get current page items
  const currentPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPurchases.slice(startIndex, endIndex);
  }, [filteredPurchases, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const updatePurchaseStatus = async (purchaseId: string, newStatus: PurchaseStatus) => {
    setUpdatingId(purchaseId);
    try {
      if (newStatus === 'cancelled') {
        // Call the new function to cancel and refund
        const { error } = await supabase.rpc('cancel_purchase_and_refund', { purchase_id: purchaseId });
        if (error) throw error;
        // Update local state
        setAllPurchases(prevPurchases => 
          prevPurchases.map(purchase => 
            purchase.id === purchaseId 
              ? { ...purchase, status: 'cancelled' }
              : purchase
          )
        );
        toast({
          title: 'Purchase Cancelled',
          description: 'Points have been refunded to the student.',
          variant: 'success',
        });
      } else {
        // Normal status update
        const { error } = await supabase
          .from('purchases')
          .update({ status: newStatus })
          .eq('id', purchaseId);
        if (error) throw error;
        setAllPurchases(prevPurchases => 
          prevPurchases.map(purchase => 
            purchase.id === purchaseId 
              ? { ...purchase, status: newStatus }
              : purchase
          )
        );
        toast({
          title: 'Status Updated',
          description: `Purchase status successfully updated to ${newStatus}`,
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update purchase status. Please try again.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteClick = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    
    setDeletingId(purchaseToDelete.id);
    try {
      // First check if the purchase exists
      const { data: existingPurchase, error: checkError } = await supabase
        .from('purchases')
        .select('id')
        .eq('id', purchaseToDelete.id)
        .single();

      if (checkError) throw checkError;
      if (!existingPurchase) {
        throw new Error('Purchase not found');
      }

      // Perform the delete
      const { error: deleteError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseToDelete.id);

      if (deleteError) throw deleteError;

      // Fetch fresh data instead of updating state directly
      await fetchPurchases();

      toast({
        title: "Purchase Deleted",
        description: "The purchase has been successfully deleted.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete the purchase. Please try again.",
      });
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setPurchaseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setPurchaseToDelete(null);
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
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
        Purchase Management
      </h1>
      
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-purple-950/50 border-purple-800/50 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-700"
          />
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-gray-900/70 border-gray-800 text-white hover:bg-purple-900/40 focus:ring-purple-700 focus:ring-offset-0">
            <div className="flex items-center gap-2">
              {(() => {
                switch (statusFilter) {
                  case 'pending':
                    return <Clock className="w-4 h-4 text-yellow-400" />;
                  case 'completed':
                    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
                  case 'cancelled':
                    return <XCircle className="w-4 h-4 text-red-400" />;
                  default:
                    return <Package className="w-4 h-4 text-purple-400" />;
                }
              })()}
              <span>
                {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-gray-900/95 border border-gray-800 text-gray-200 shadow-xl backdrop-blur-xl">
            <SelectItem value="all" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                <span>All Status</span>
              </div>
            </SelectItem>
            <SelectItem value="pending" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>Pending</span>
              </div>
            </SelectItem>
            <SelectItem value="completed" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Completed</span>
              </div>
            </SelectItem>
            <SelectItem value="cancelled" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span>Cancelled</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70">
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-800">
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[200px]">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Package className="h-8 w-8 mb-2" />
                      <p className="text-lg font-medium">No purchases found</p>
                      <p className="text-sm">
                        {searchQuery.trim() 
                          ? `No matches found for "${searchQuery}"`
                          : statusFilter === 'all' 
                            ? 'There are no purchases in the system yet.'
                            : `No purchases with status "${statusFilter}" found.`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="group hover:bg-purple-900/20 transition-all">
                    <TableCell className="font-mono text-sm text-gray-400">
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
                        <span className="font-medium text-white">{purchase.products.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-purple-300">{purchase.points_spent}</span>
                    </TableCell>
                    <TableCell>
                      <PurchaseStatusBadge status={purchase.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={purchase.status}
                          onValueChange={(value: PurchaseStatus) => {
                            if (updatingId) return;
                            updatePurchaseStatus(purchase.id, value);
                          }}
                          disabled={updatingId === purchase.id || deletingId === purchase.id || purchase.status === 'cancelled'}
                        >
                          <SelectTrigger 
                            className={`w-[130px] bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-purple-900/40 focus:ring-purple-700 focus:ring-offset-0 ${
                              (updatingId === purchase.id || deletingId === purchase.id) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {updatingId === purchase.id ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Update status" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/95 border border-gray-800 text-gray-200 shadow-xl backdrop-blur-xl">
                            <SelectItem value="pending" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span>Pending</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="completed" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Completed</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled" className="hover:bg-purple-800/30 focus:bg-purple-800/30 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span>Cancelled</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 bg-gray-800/60 border border-gray-700 hover:bg-red-900/50 hover:text-red-400"
                          onClick={() => handleDeleteClick(purchase)}
                          disabled={deletingId === purchase.id || updatingId === purchase.id}
                        >
                          {deletingId === purchase.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
          <div className="text-sm text-gray-400">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItemsCount)} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredItemsCount)} of {filteredItemsCount} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3 && currentPage < totalPages - 2) {
                  pageNum = i === 0 ? 1 
                    : i === 1 ? currentPage - 1
                    : i === 2 ? currentPage
                    : i === 3 ? currentPage + 1
                    : totalPages;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                }
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={isLoading}
                  className={pageNum === currentPage 
                    ? "bg-purple-600 hover:bg-purple-700 text-white border-none"
                    : "bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900/95 border border-gray-800 text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-purple-300">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this purchase?<br />
              {purchaseToDelete && (
                <span className="text-sm mt-2 block text-gray-400">
                  Product: {purchaseToDelete.products.name}<br />
                  User: {purchaseToDelete.profiles.username}<br />
                  Points: {purchaseToDelete.points_spent}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
              onClick={handleDeleteCancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default PurchaseTable; 