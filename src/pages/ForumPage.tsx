import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Check } from 'lucide-react';

// Sample forum data
const forumData = {
  recent: [
    {
      id: 1,
      title: 'Help with trigonometry problem',
      content: 'I\'m having trouble solving this equation: sin(2x) + cos(x) = 0. Can someone help me work through the steps?',
      author: 'Sarah M.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'math',
      createdAt: '2025-04-24T15:30:00',
      replies: 3,
      solved: false
    },
    {
      id: 2,
      title: 'Pythagorean theorem application in real life',
      content: 'I understand the formula a² + b² = c², but I\'m looking for interesting real-world applications of this theorem. Any examples?',
      author: 'Alex J.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'math',
      createdAt: '2025-04-23T10:15:00',
      replies: 5,
      solved: true
    },
    {
      id: 3,
      title: 'Help analyzing this poem by Robert Frost',
      content: 'I need help understanding the symbolism in "The Road Not Taken" by Robert Frost. What does the diverging road represent?',
      author: 'Emma L.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'english',
      createdAt: '2025-04-22T14:45:00',
      replies: 4,
      solved: false
    }
  ],
  popular: [
    {
      id: 4,
      title: 'Tips for remembering chemical elements',
      content: 'I\'m having trouble memorizing the periodic table. Does anyone have any good mnemonics or study techniques?',
      author: 'Michael P.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'science',
      createdAt: '2025-04-20T09:30:00',
      replies: 12,
      solved: true
    },
    {
      id: 5,
      title: 'How to structure an argumentative essay?',
      content: 'I need to write an argumentative essay for my English class. What\'s the best way to structure it for maximum impact?',
      author: 'Jessica T.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'english',
      createdAt: '2025-04-19T16:20:00',
      replies: 8,
      solved: true
    }
  ],
  unanswered: [
    {
      id: 6,
      title: 'Question about photosynthesis process',
      content: 'Can someone explain the light-dependent and light-independent reactions in photosynthesis? I\'m confused about the differences.',
      author: 'Ryan H.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'science',
      createdAt: '2025-04-24T11:45:00',
      replies: 0,
      solved: false
    },
    {
      id: 7,
      title: 'Need help with history research topic',
      content: 'I need to choose a topic for my history research paper. Looking for interesting angles on the Industrial Revolution.',
      author: 'Sophia K.',
      authorRole: 'student',
      authorAvatar: '',
      category: 'history',
      createdAt: '2025-04-23T13:10:00',
      replies: 0,
      solved: false
    }
  ]
};

// Sample categories
const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'math', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'computer', label: 'Computer Science' }
];

const ForumPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Learning Forum</h1>
              <p className="text-gray-600">Ask questions, share knowledge, help others learn</p>
            </div>
            
            <Button asChild>
              <Link to="/forum/new">
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask a Question
              </Link>
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="recent" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="recent">Recent Questions</TabsTrigger>
              <TabsTrigger value="popular">Popular Questions</TabsTrigger>
              <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent">
              <div className="space-y-4">
                {forumData.recent.map((post) => (
                  <ForumPostCard key={post.id} post={post} formatDate={formatDate} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="popular">
              <div className="space-y-4">
                {forumData.popular.map((post) => (
                  <ForumPostCard key={post.id} post={post} formatDate={formatDate} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="unanswered">
              <div className="space-y-4">
                {forumData.unanswered.map((post) => (
                  <ForumPostCard key={post.id} post={post} formatDate={formatDate} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

interface ForumPostCardProps {
  post: {
    id: number;
    title: string;
    content: string;
    author: string;
    authorRole: string;
    authorAvatar: string;
    category: string;
    createdAt: string;
    replies: number;
    solved: boolean;
  };
  formatDate: (dateString: string) => string;
}

const ForumPostCard = ({ post, formatDate }: ForumPostCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className={
                post.authorRole === 'teacher' ? 'bg-edu-blue-500' : 'bg-edu-purple-500'
              }>
                {post.author.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium">{post.author}</span>
              <div className="text-xs text-gray-500 capitalize">{post.authorRole}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {post.solved && (
              <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Solved
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {post.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <Link to={`/forum/${post.id}`} className="block">
          <h3 className="font-semibold text-lg hover:text-edu-purple-700 transition-colors mb-2">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {post.content}
          </p>
        </Link>
      </CardContent>
      
      <CardFooter className="border-t bg-gray-50 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{formatDate(post.createdAt)}</span>
        <div className="flex items-center">
          <MessageCircle className="h-4 w-4 text-gray-400 mr-1" />
          <span>{post.replies} {post.replies === 1 ? 'reply' : 'replies'}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ForumPage;
