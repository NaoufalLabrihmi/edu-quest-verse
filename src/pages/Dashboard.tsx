
import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ShoppingBag, Clock, GraduationCap } from 'lucide-react';

const Dashboard = () => {
  // Sample user data - in a real app, this would come from your auth system
  const user = {
    name: 'Alex Johnson',
    role: 'student',
    points: 145,
    avatarUrl: '',
  };
  
  // Sample quiz data
  const upcomingQuizzes = [
    {
      id: 1,
      title: 'Algebra Fundamentals',
      teacher: 'Mrs. Rodriguez',
      date: '2025-05-01T14:00:00',
      subject: 'Math'
    },
    {
      id: 2,
      title: 'World History: Ancient Civilizations',
      teacher: 'Mr. Peterson',
      date: '2025-05-03T10:30:00',
      subject: 'History'
    }
  ];
  
  // Sample forum activity
  const recentForumActivity = [
    {
      id: 1,
      title: 'Help with trigonometry problem',
      author: 'Sarah M.',
      time: '2 hours ago',
      replies: 3
    },
    {
      id: 2,
      title: 'Question about the Pythagorean theorem',
      author: 'You',
      time: '1 day ago',
      replies: 5
    }
  ];
  
  // Sample shop items
  const featuredShopItems = [
    {
      id: 1,
      title: 'Premium Calculator',
      points: 120,
      image: ''
    },
    {
      id: 2,
      title: 'Study Guide Bundle',
      points: 75,
      image: ''
    }
  ];
  
  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation isLoggedIn={true} userRole={user.role as 'student' | 'teacher' | 'admin'} userName={user.name} userPoints={user.points} />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h1>
            <p className="text-gray-600">Here's what's happening in your learning world</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Content - 2/3 width on medium screens and up */}
            <div className="md:col-span-2 space-y-6">
              {/* Upcoming Quizzes */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Upcoming Quizzes</h2>
                  <Link to="/quizzes" className="text-sm text-edu-purple-600 hover:underline font-medium">
                    View all
                  </Link>
                </div>
                
                {upcomingQuizzes.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingQuizzes.map((quiz) => (
                      <Card key={quiz.id}>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>{quiz.title}</CardTitle>
                              <CardDescription>By {quiz.teacher}</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-edu-blue-50 text-edu-blue-700 border-edu-blue-200">
                              {quiz.subject}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardFooter className="py-3 flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDate(quiz.date)}</span>
                          </div>
                          <Button asChild>
                            <Link to={`/quiz/${quiz.id}`}>
                              {new Date(quiz.date) < new Date() ? 'Start Quiz' : 'View Details'}
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-gray-500">No upcoming quizzes</p>
                      <Button className="mt-4" asChild>
                        <Link to="/join-quiz">Join a Quiz</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </section>
              
              {/* Recent Forum Activity */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Recent Forum Activity</h2>
                  <Link to="/forum" className="text-sm text-edu-purple-600 hover:underline font-medium">
                    View forum
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {recentForumActivity.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <CardHeader className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{post.title}</CardTitle>
                            <CardDescription>
                              Posted by {post.author === 'You' ? (
                                <span className="font-medium text-edu-purple-600">You</span>
                              ) : post.author} · {post.time}
                            </CardDescription>
                          </div>
                          <Badge className="bg-edu-purple-100 text-edu-purple-700 border-edu-purple-200 hover:bg-edu-purple-200">
                            {post.replies} {post.replies === 1 ? 'reply' : 'replies'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardFooter className="py-3 border-t bg-gray-50">
                        <Button variant="ghost" size="sm" className="ml-auto" asChild>
                          <Link to={`/forum/post/${post.id}`}>
                            <MessageCircle className="h-4 w-4 mr-1" /> View Discussion
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
            
            {/* Sidebar - 1/3 width on medium screens and up */}
            <div className="space-y-6">
              {/* Points Card */}
              <Card className="bg-gradient-to-br from-edu-purple-500 to-edu-blue-600 text-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white">Your Points</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{user.points}</span>
                    <span className="ml-2 text-white/80">total points</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-white/20 hover:bg-white/30 text-white" asChild>
                    <Link to="/shop">
                      <ShoppingBag className="h-4 w-4 mr-2" /> Visit Shop
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Shop Featured Items */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Shop Featured</h2>
                </div>
                
                <div className="space-y-3">
                  {featuredShopItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-16 w-16 flex items-center justify-center bg-edu-orange-100 rounded-lg">
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="h-12 w-12 object-cover" />
                            ) : (
                              <ShoppingBag className="h-6 w-6 text-edu-orange-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{item.title}</h3>
                            <div className="flex items-center mt-1">
                              <span className="text-sm font-semibold text-edu-purple-700">{item.points} pts</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <Button variant="ghost" asChild>
                    <Link to="/shop">Browse all rewards</Link>
                  </Button>
                </div>
              </section>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start bg-edu-blue-500 hover:bg-edu-blue-600" asChild>
                    <Link to="/join-quiz">
                      <GraduationCap className="h-4 w-4 mr-2" /> Join a Quiz
                    </Link>
                  </Button>
                  <Button className="w-full justify-start bg-edu-purple-500 hover:bg-edu-purple-600" asChild>
                    <Link to="/forum/new">
                      <MessageCircle className="h-4 w-4 mr-2" /> Ask a Question
                    </Link>
                  </Button>
                  {user.role === 'teacher' && (
                    <Button className="w-full justify-start bg-edu-pink-500 hover:bg-edu-pink-600" asChild>
                      <Link to="/create-quiz">
                        <GraduationCap className="h-4 w-4 mr-2" /> Create Quiz
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
