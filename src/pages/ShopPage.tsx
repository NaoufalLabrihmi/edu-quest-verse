import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ShoppingBag, Gift, User, Loader2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/integrations/supabase/client';

const ShopPage = () => {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError('');
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) setProductsError('Failed to load products');
      else setProducts(data || []);
      setProductsLoading(false);
    };
    fetchProducts();
  }, []);

  // Debug print for troubleshooting
  console.log('Loaded profile:', profile);

  if (loading || productsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <span className="text-lg font-semibold animate-pulse">Loading...</span>
        </main>
        <Footer />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="bg-purple-900/80 border border-purple-700 rounded-2xl shadow-2xl p-10 text-center max-w-md mx-auto">
            <Gift className="mx-auto mb-4 h-10 w-10 text-purple-300" />
            <h2 className="text-2xl font-bold mb-4 text-purple-200">Error Loading Products</h2>
            <p className="text-white/80 text-base mb-2">{productsError}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile || profile.role !== 'student') {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="bg-purple-900/80 border border-purple-700 rounded-2xl shadow-2xl p-10 text-center max-w-md mx-auto">
            <Gift className="mx-auto mb-4 h-10 w-10 text-purple-300" />
            <h2 className="text-2xl font-bold mb-4 text-purple-200">Shop Access Restricted</h2>
            <p className="text-white/80 text-base mb-2">Only students can access the rewards shop.</p>
            <p className="text-white/60 text-sm">If you are a student, please log in with your student account.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handlePurchase = async (item: any) => {
    if (profile.points < item.points_required) {
      toast({
        title: 'Not enough points',
        description: `You need ${item.points_required - profile.points} more points to purchase this item.`,
        variant: 'destructive',
      });
      return;
    }

    setPurchaseLoading(true);
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: profile.id,
          product_id: item.id,
          points_spent: item.points_required
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Update user's points
      const newPoints = profile.points - item.points_required;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // First close the popup
      setSelectedItem(null);
      setPurchaseLoading(false);

      // Then update local state
      profile.points = newPoints;

      // Finally show success message
      setTimeout(() => {
        toast({
          variant: "success",
          title: "🎉 Purchase Complete!",
          description: `Successfully purchased ${item.name} for ${item.points_required} points. Your new balance: ${newPoints} points`,
        });
      }, 100);

    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseLoading(false);
    toast({
        variant: "destructive",
        title: 'Purchase Failed',
        description: 'There was an error processing your purchase. Please try again.',
    });
    }
  };

  const totalPages = Math.ceil(products.length / pageSize);
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-2 max-w-6xl">
          {/* Header: Shop Title (left) and User Profile (right) */}
          <div className="flex flex-row items-center justify-between mb-10 gap-4">
            {/* Left: Shop Title and Subtitle */}
            <div className="flex-1 flex flex-col items-start justify-center">
              <h1 className="text-4xl font-extrabold mb-2 text-purple-200 drop-shadow">Rewards Shop</h1>
              <p className="text-white/80 text-lg">Redeem your points for exclusive rewards!</p>
            </div>
            {/* Right: User Profile */}
            <div className="flex items-center gap-4 bg-gray-900 rounded-2xl px-6 py-4 shadow-lg border border-gray-800">
              <Avatar className="h-16 w-16 border-4 border-purple-300 bg-gray-950">
                <User className="h-10 w-10 text-purple-200" />
                <AvatarFallback>{profile.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-end">
                <div className="text-lg font-semibold text-purple-100">{profile.username}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white drop-shadow">{profile.points}</span>
                  <span className="text-purple-200 font-medium">points</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 justify-center">
            {paginatedProducts.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-12">No products available.</div>
            ) : (
              paginatedProducts.map((item) => (
                <Card key={item.id} className="relative group overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-gray-800 rounded-2xl w-[350px] h-[420px] mx-auto bg-gray-900 hover:scale-[1.025] flex flex-col">
                  <div className="h-44 bg-gray-950 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-14 w-14 text-purple-400" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold text-purple-200 leading-tight">{item.name}</CardTitle>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-base px-3 py-1">{item.points_required} pts</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    <p className="text-gray-300 text-sm mb-2 min-h-[40px] leading-snug">{item.description}</p>
                    {item.stock !== undefined && (
                      <div className="mt-2 text-xs text-gray-500">
                        Stock: {typeof item.stock === 'number' ? `${item.stock} left` : item.stock}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t bg-gray-950 pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full text-base"
                          variant={profile.points >= item.points_required ? 'default' : 'outline'}
                          disabled={profile.points < item.points_required}
                          onClick={() => setSelectedItem(item)}
                        >
                          {profile.points >= item.points_required ? 'Redeem' : `Need ${item.points_required - profile.points} more points`}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 border border-purple-500/50 shadow-xl max-w-md w-full p-0 rounded-2xl overflow-hidden [&>button:first-child]:hidden">
                        {/* Close Button */}
                        <DialogClose asChild>
                          <button className="absolute right-5 top-5 z-50 rounded-full p-4 bg-purple-400/90 hover:bg-purple-300/90 backdrop-blur-sm border-2 border-purple-300/50 transition-all duration-200">
                            <X className="h-7 w-7 text-white" strokeWidth={2} />
                          </button>
                        </DialogClose>

                        {/* Product Image with Gradient Overlay */}
                        <div className="relative h-64 w-full">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-900">
                              <ShoppingBag className="w-16 h-16 text-purple-400/80" />
                            </div>
                          )}
                          {/* Dark gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
                          
                          {/* Product Title on Image */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h2 className="text-2xl font-bold text-white mb-2">{item.name}</h2>
                            <p className="text-gray-300 text-sm line-clamp-2">{item.description}</p>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 pt-4">
                          {/* Points Display */}
                          <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                  <Gift className="w-5 h-5 text-purple-300" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-purple-200">Cost</p>
                                  <p className="text-xl font-bold text-white">{item.points_required} points</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-purple-200">Your Balance</p>
                                <p className="text-xl font-bold text-white">{profile.points} points</p>
              </div>
              </div>
              </div>

                          {/* Confirmation Message */}
                          <p className="text-center text-gray-400 text-sm my-4">
                            Are you sure you want to purchase this item?
                          </p>

                          {/* Purchase Button */}
                          <Button
                            type="button"
                            onClick={() => handlePurchase(item)}
                            disabled={purchaseLoading || profile.points < item.points_required}
                            className={`w-full py-6 text-lg font-semibold ${
                              profile.points >= item.points_required
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {purchaseLoading ? (
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </div>
                            ) : profile.points >= item.points_required ? (
                              'Confirm Purchase'
                            ) : (
                              'Insufficient Points'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                className="bg-purple-700 text-white border-2 border-purple-500 font-bold px-6 py-2 rounded-lg shadow hover:bg-purple-800 focus:ring-2 focus:ring-purple-400 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-purple-200 font-semibold">Page {page} of {totalPages}</span>
              <Button
                className="bg-purple-700 text-white border-2 border-purple-500 font-bold px-6 py-2 rounded-lg shadow hover:bg-purple-800 focus:ring-2 focus:ring-purple-400 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* How to Earn More Points */}
          <div className="bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800 mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-purple-200 flex items-center gap-2">
              <Gift className="h-6 w-6 text-purple-300" /> How to Earn More Points
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 bg-gray-950 rounded-lg">
                <h3 className="font-semibold text-purple-200 mb-2">Participate in Quizzes</h3>
                <p className="text-white/80 text-sm">Join quizzes and score well to earn points. Top performers get bonus points!</p>
              </div>
              <div className="p-6 bg-gray-950 rounded-lg">
                <h3 className="font-semibold text-purple-200 mb-2">Help Others in the Forum</h3>
                <p className="text-white/80 text-sm">Answer questions in the forum. Get points when your answers are marked helpful.</p>
              </div>
              <div className="p-6 bg-gray-950 rounded-lg">
                <h3 className="font-semibold text-purple-200 mb-2">Daily Login Streaks</h3>
                <p className="text-white/80 text-sm">Login daily to maintain your streak. Longer streaks mean more bonus points!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShopPage;
