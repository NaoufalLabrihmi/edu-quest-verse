import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShoppingBag, Gift, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

// Modern shop items data (could be fetched from DB in real app)
const shopItems = {
  supplies: [
    {
      id: 1,
      name: 'Premium Calculator',
      description: 'Scientific calculator with advanced functions',
      points: 120,
      image: '',
      stock: 10
    },
    {
      id: 2,
      name: 'Deluxe Notebook Set',
      description: 'Set of 3 high-quality notebooks',
      points: 75,
      image: '',
      stock: 15
    },
    {
      id: 3,
      name: 'Ergonomic Pen Pack',
      description: 'Pack of 5 comfortable grip pens',
      points: 50,
      image: '',
      stock: 20
    }
  ],
  courses: [
    {
      id: 4,
      name: 'Advanced Math Masterclass',
      description: 'Online course covering advanced mathematical concepts',
      points: 300,
      image: '',
      stock: 5
    },
    {
      id: 5,
      name: 'Creative Writing Workshop',
      description: 'Interactive workshop to improve your writing skills',
      points: 250,
      image: '',
      stock: 8
    }
  ],
  digital: [
    {
      id: 6,
      name: 'Study Planner App - Premium',
      description: '3-month premium subscription',
      points: 150,
      image: '',
      stock: 'unlimited'
    },
    {
      id: 7,
      name: 'E-book Bundle',
      description: 'Collection of 5 educational e-books',
      points: 200,
      image: '',
      stock: 'unlimited'
    },
    {
      id: 8,
      name: 'Profile Badge: Brain Genius',
      description: 'Exclusive profile badge to show off your knowledge',
      points: 100,
      image: '',
      stock: 'unlimited'
    }
  ]
};

type ShopCategory = keyof typeof shopItems;

const ShopPage = () => {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ShopCategory>('supplies');

  // Debug print for troubleshooting
  console.log('Loaded profile:', profile);

  if (loading) {
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
    if (profile.points < item.points) {
      toast({
        title: 'Not enough points',
        description: `You need ${item.points - profile.points} more points to purchase this item.`,
        variant: 'destructive',
      });
      return;
    }
    setPurchaseLoading(true);
    // Simulate purchase (replace with real DB update in production)
    setTimeout(() => {
      setPurchaseLoading(false);
      toast({
        title: 'Purchase successful!',
        description: `You have purchased ${item.name} for ${item.points} points.`,
      });
      setSelectedItem(null);
    }, 1200);
  };

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

          {/* Shop Tabs */}
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={v => setActiveTab(v as ShopCategory)} className="mb-10">
            <TabsList className="mb-8 bg-gray-800 border border-gray-700 rounded-xl">
              <TabsTrigger value="supplies">School Supplies</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="digital">Digital Rewards</TabsTrigger>
            </TabsList>
            {(['supplies', 'courses', 'digital'] as ShopCategory[]).map(category => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 justify-center">
                  {shopItems[category].map(item => (
                    <Card key={item.id} className="relative group overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-gray-800 rounded-2xl w-[350px] h-[420px] mx-auto bg-gray-900 hover:scale-[1.025] flex flex-col">
                      <div className="h-44 bg-gray-950 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <ShoppingBag className="h-14 w-14 text-purple-400" />
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-bold text-purple-200 leading-tight">{item.name}</CardTitle>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-base px-3 py-1">{item.points} pts</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4 flex-1">
                        <p className="text-gray-300 text-sm mb-2 min-h-[40px] leading-snug">{item.description}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          Stock: {typeof item.stock === 'number' ? `${item.stock} left` : item.stock}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-gray-950 pt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full text-base"
                              variant={profile.points >= item.points ? 'default' : 'outline'}
                              disabled={profile.points < item.points}
                              onClick={() => setSelectedItem(item)}
                            >
                              {profile.points >= item.points ? 'Redeem' : `Need ${item.points - profile.points} more points`}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border border-gray-800">
                            <DialogHeader>
                              <DialogTitle>Confirm Purchase</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                              <ShoppingBag className="h-10 w-10 text-purple-400" />
                              <div className="text-lg font-semibold">{item.name}</div>
                              <div className="text-purple-600 text-sm mb-2">{item.description}</div>
                              <div className="text-purple-700 font-bold">Cost: {item.points} points</div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedItem(null)}
                                disabled={purchaseLoading}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handlePurchase(item)}
                                disabled={purchaseLoading}
                                className="bg-purple-700 hover:bg-purple-800"
                              >
                                {purchaseLoading ? 'Processing...' : 'Confirm'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

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
