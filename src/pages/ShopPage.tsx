import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
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
  const pageSize = 6;

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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-cyan-900 via-blue-950 to-gray-900 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="bg-cyan-900/80 border border-cyan-700 rounded-2xl shadow-2xl p-10 text-center max-w-md mx-auto">
            <Gift className="mx-auto mb-4 h-10 w-10 text-cyan-300" />
            <h2 className="text-2xl font-bold mb-4 text-cyan-200">Error Loading Products</h2>
            <p className="text-white/80 text-base mb-2">{productsError}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile || profile.role !== 'student') {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-cyan-900 via-blue-950 to-gray-900 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="bg-cyan-900/80 border border-cyan-700 rounded-2xl shadow-2xl p-10 text-center max-w-md mx-auto">
            <Gift className="mx-auto mb-4 h-10 w-10 text-cyan-300" />
            <h2 className="text-2xl font-bold mb-4 text-cyan-200">Shop Access Restricted</h2>
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
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      {/* Gaming-inspired, dark and subtle background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <circle cx="350" cy="350" r="180" fill="url(#shop-grad1)" className="animate-blob1 blur-2xl opacity-30" />
          <circle cx="1550" cy="250" r="120" fill="url(#shop-grad2)" className="animate-blob2 blur-2xl opacity-20" />
          <circle cx="900" cy="850" r="100" fill="url(#shop-grad3)" className="animate-blob3 blur-xl opacity-15" />
          <defs>
            <radialGradient id="shop-grad1" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#0ea5e9" />
              <stop offset="1" stopColor="#0a1626" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="shop-grad2" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#818cf8" />
              <stop offset="1" stopColor="#0a1626" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="shop-grad3" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#0a1626" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
        {/* Very faint grid overlay */}
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
          <g className="animate-gridwave" style={{ opacity: 0.04 }}>
            {[...Array(32)].map((_, i) => (
              <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="1080" stroke="#334155" strokeWidth="0.5" />
            ))}
            {[...Array(19)].map((_, i) => (
              <line key={i} x1="0" y1={i * 60} x2="1920" y2={i * 60} stroke="#334155" strokeWidth="0.5" />
            ))}
          </g>
          <style>{`
            @keyframes gridwave { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
            .animate-gridwave{animation:gridwave 16s ease-in-out infinite;}
            @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(40px,20px) scale(1.05);} 66%{transform:translate(-30px,-15px) scale(0.97);} }
            @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-50px,30px) scale(1.03);} 66%{transform:translate(60px,-20px) scale(0.95);} }
            @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(30px,-40px) scale(1.04);} 66%{transform:translate(-45px,25px) scale(0.96);} }
            .animate-blob1{animation:blob1 18s ease-in-out infinite;}
            .animate-blob2{animation:blob2 22s ease-in-out infinite;}
            .animate-blob3{animation:blob3 20s ease-in-out infinite;}
          `}</style>
        </svg>
      </div>
      <div className="relative z-20 flex flex-col min-h-screen bg-transparent text-white">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-2 max-w-6xl">
          {/* Header: Shop Title (left) and User Profile (right) */}
          <div className="flex flex-row items-center justify-between mb-14 gap-4">
            {/* Left: Shop Title and Subtitle */}
            <div className="flex-1 flex flex-col items-start justify-center">
              <h1 className="text-5xl font-extrabold mb-2 text-cyan-200 drop-shadow-cyan relative">
                Rewards Shop
                <span className="block h-1 w-16 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 rounded-full mt-2 animate-pulse absolute left-0 -bottom-3" />
              </h1>
              <p className="text-white/80 text-lg">Redeem your points for exclusive rewards!</p>
            </div>
            {/* Right: User Profile */}
            <div className="flex items-center gap-4 bg-cyan-900/80 rounded-2xl px-8 py-6 shadow-2xl border-2 border-cyan-400/40 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl animate-pulse" />
              <Avatar className="h-20 w-20 border-4 border-cyan-300 bg-gray-950 shadow-cyan-glow">
                <User className="h-12 w-12 text-cyan-200" />
                <AvatarFallback>{profile.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-end">
                <div className="text-xl font-semibold text-cyan-100">{profile.username}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white drop-shadow-cyan animate-pulse">{profile.points}</span>
                  <span className="text-cyan-200 font-medium">points</span>
                </div>
              </div>
            </div>
          </div>
          {/* Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10 justify-center py-2">
            {paginatedProducts.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-12">No products available.</div>
            ) : (
              paginatedProducts.map((item) => (
                <Card
                  key={item.id}
                  className="relative group overflow-hidden shadow-2xl hover:shadow-cyan-glow transition-all border-2 border-cyan-700/60 rounded-3xl w-[340px] h-[350px] mx-auto bg-cyan-900/70 hover:scale-[1.035] flex flex-col backdrop-blur-xl before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-400/10 before:to-blue-900/10 before:blur-2xl before:opacity-60 before:pointer-events-none"
                  style={{ boxShadow: '0 8px 32px 0 rgba(14,165,233,0.18), 0 1.5px 8px 0 rgba(34,211,238,0.10)' }}
                >
                  {/* Floating Points Badge */}
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 text-cyan-900 font-bold px-4 py-2 rounded-full shadow-cyan-glow text-lg border-2 border-cyan-200 animate-pulse">
                      {item.points_required} pts
                    </span>
                  </div>
                  <div className="h-44 bg-cyan-950 flex items-center justify-center relative overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <ShoppingBag className="h-16 w-16 text-cyan-400" />
                    )}
                    {/* Subtle gradient overlay for glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/60 via-transparent to-transparent pointer-events-none" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold text-cyan-200 leading-tight tracking-tight">
                        {item.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    <p className="text-gray-300 text-base mb-2 min-h-[40px] leading-snug font-medium">
                      {item.description}
                    </p>
                    {item.stock !== undefined && (
                      <div className="mt-2 text-xs text-cyan-400">
                        Stock: {typeof item.stock === 'number' ? `${item.stock} left` : item.stock}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t bg-cyan-950 pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full text-base font-bold shadow-cyan-glow"
                          variant={profile.points >= item.points_required ? 'default' : 'outline'}
                          disabled={profile.points < item.points_required}
                          onClick={() => setSelectedItem(item)}
                        >
                          {profile.points >= item.points_required ? 'Redeem' : `Need ${item.points_required - profile.points} more points`}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gradient-to-br from-cyan-900 via-blue-950 to-gray-900 border border-cyan-500/50 shadow-xl max-w-md w-full p-0 rounded-2xl overflow-hidden [&>button:first-child]:hidden">
                        {/* Accessibility: Hidden DialogTitle and Description */}
                        <DialogTitle className="sr-only">Purchase Confirmation</DialogTitle>
                        <DialogDescription className="sr-only">
                          Confirm your purchase of {item.name} for {item.points_required} points.
                        </DialogDescription>
                        {/* Product Image with Gradient Overlay */}
                        <div className="relative h-64 w-full">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/50 to-gray-900">
                              <ShoppingBag className="w-16 h-16 text-cyan-400/80" />
                            </div>
                          )}
                          {/* Dark gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
                          {/* Product Title on Image */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-cyan">
                              {item.name}
                            </h2>
                            <p className="text-gray-300 text-sm line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {/* Content Section */}
                        <div className="p-6 pt-4">
                          {/* Points Display */}
                          <div className="bg-cyan-900/20 rounded-xl p-4 border border-cyan-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-500/20">
                                  <Gift className="w-5 h-5 text-cyan-300" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-cyan-200">Cost</p>
                                  <p className="text-xl font-bold text-white">{item.points_required} points</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-cyan-200">Your Balance</p>
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
                                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
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
                  className="bg-cyan-700 text-white border-2 border-cyan-500 font-bold px-6 py-2 rounded-lg shadow hover:bg-cyan-800 focus:ring-2 focus:ring-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
                <span className="text-cyan-200 font-semibold">Page {page} of {totalPages}</span>
              <Button
                  className="bg-cyan-700 text-white border-2 border-cyan-500 font-bold px-6 py-2 rounded-lg shadow hover:bg-cyan-800 focus:ring-2 focus:ring-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
          {/* How to Earn More Points */}
            <div className="bg-cyan-900/80 p-8 rounded-2xl shadow-xl border border-cyan-700/60 mt-12 backdrop-blur-md">
              <h2 className="text-2xl font-semibold mb-6 text-cyan-200 flex items-center gap-2">
                <Gift className="h-6 w-6 text-cyan-300" /> How to Earn More Points
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 bg-cyan-950 rounded-lg">
                  <h3 className="font-semibold text-cyan-200 mb-2">Participate in Quizzes</h3>
                <p className="text-white/80 text-sm">Join quizzes and score well to earn points. Top performers get bonus points!</p>
              </div>
                <div className="p-6 bg-cyan-950 rounded-lg">
                  <h3 className="font-semibold text-cyan-200 mb-2">Help Others in the Forum</h3>
                <p className="text-white/80 text-sm">Answer questions in the forum. Get points when your answers are marked helpful.</p>
              </div>
                <div className="p-6 bg-cyan-950 rounded-lg">
                  <h3 className="font-semibold text-cyan-200 mb-2">Daily Login Streaks</h3>
                <p className="text-white/80 text-sm">Login daily to maintain your streak. Longer streaks mean more bonus points!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default ShopPage;
