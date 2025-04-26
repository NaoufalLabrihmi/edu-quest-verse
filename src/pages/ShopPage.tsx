
import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingBag } from 'lucide-react';

// Sample shop items data
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

const ShopPage = () => {
  // Sample user data - in a real app, this would come from your auth system
  const user = {
    name: 'Alex Johnson',
    role: 'student',
    points: 145,
  };
  
  const { toast } = useToast();
  
  const handlePurchase = (item: any) => {
    if (user.points < item.points) {
      toast({
        title: "Not enough points",
        description: `You need ${item.points - user.points} more points to purchase this item.`,
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would update the database
    toast({
      title: "Purchase successful!",
      description: `You have purchased ${item.name} for ${item.points} points.`,
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation isLoggedIn={true} userRole="student" userName={user.name} userPoints={user.points} />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Rewards Shop</h1>
              <p className="text-gray-600">Redeem your hard-earned points for exciting rewards!</p>
            </div>
            
            <div className="bg-gradient-to-r from-edu-purple-500 to-edu-blue-600 rounded-lg px-6 py-3 text-white shadow-md">
              <p className="text-sm font-medium">Your Balance</p>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold">{user.points}</span>
                <span className="ml-1">points</span>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="supplies" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="supplies">School Supplies</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="digital">Digital Rewards</TabsTrigger>
            </TabsList>
            
            <TabsContent value="supplies">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopItems.supplies.map((item) => (
                  <ShopItemCard key={item.id} item={item} onPurchase={handlePurchase} userPoints={user.points} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="courses">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopItems.courses.map((item) => (
                  <ShopItemCard key={item.id} item={item} onPurchase={handlePurchase} userPoints={user.points} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="digital">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopItems.digital.map((item) => (
                  <ShopItemCard key={item.id} item={item} onPurchase={handlePurchase} userPoints={user.points} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">How to Earn More Points</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-edu-purple-50 rounded-lg">
                <h3 className="font-semibold text-edu-purple-700 mb-2">
                  Participate in Quizzes
                </h3>
                <p className="text-gray-600 text-sm">
                  Join quizzes and score well to earn points. Top performers get bonus points!
                </p>
              </div>
              
              <div className="p-4 bg-edu-blue-50 rounded-lg">
                <h3 className="font-semibold text-edu-blue-700 mb-2">
                  Help Others in the Forum
                </h3>
                <p className="text-gray-600 text-sm">
                  Answer questions in the forum. Get points when your answers are marked helpful.
                </p>
              </div>
              
              <div className="p-4 bg-edu-orange-50 rounded-lg">
                <h3 className="font-semibold text-edu-orange-700 mb-2">
                  Daily Login Streaks
                </h3>
                <p className="text-gray-600 text-sm">
                  Login daily to maintain your streak. Longer streaks mean more bonus points!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

interface ShopItemCardProps {
  item: {
    id: number;
    name: string;
    description: string;
    points: number;
    image: string;
    stock: number | string;
  };
  onPurchase: (item: any) => void;
  userPoints: number;
}

const ShopItemCard = ({ item, onPurchase, userPoints }: ShopItemCardProps) => {
  const canAfford = userPoints >= item.points;
  
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${!canAfford ? 'opacity-75' : ''}`}>
      <div className="h-48 bg-gray-100 flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="h-12 w-12 text-gray-400" />
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{item.name}</CardTitle>
          <Badge className="bg-edu-purple-100 text-edu-purple-700 border-edu-purple-200">
            {item.points} pts
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <p className="text-gray-600 text-sm">{item.description}</p>
        
        <div className="mt-2 text-sm">
          <span className="text-gray-500">
            Stock: {typeof item.stock === 'number' ? `${item.stock} left` : item.stock}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="border-t bg-gray-50 pt-4">
        <Button 
          className="w-full"
          variant={canAfford ? "default" : "outline"}
          onClick={() => onPurchase(item)}
          disabled={!canAfford}
        >
          {canAfford ? 'Redeem' : `Need ${item.points - userPoints} more points`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ShopPage;
