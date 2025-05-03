import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ShoppingBag, Clock, GraduationCap, Trophy, BookOpen, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Progress } from '@/components/ui/progress';

const StudentDashboard = () => {
  const { user } = useAuth();
  
  // Sample data - in a real app, this would come from your API
  const studentData = {
    points: 145,
    level: 3,
    levelProgress: 65,
    upcomingQuizzes: [
      {
        id: 1,
        title: 'Algebra Fundamentals',
        teacher: 'Mrs. Rodriguez',
        date: '2025-05-01T14:00:00',
        subject: 'Math',
        difficulty: 'Medium',
        estimatedTime: '30 minutes'
      },
      {
        id: 2,
        title: 'World History: Ancient Civilizations',
        teacher: 'Mr. Peterson',
        date: '2025-05-03T10:30:00',
        subject: 'History',
        difficulty: 'Easy',
        estimatedTime: '20 minutes'
      }
    ],
    recentGrades: [
      {
        id: 1,
        quizTitle: 'Geometry Basics',
        score: 85,
        total: 100,
        date: '2025-04-25',
        subject: 'Math',
        feedback: 'Great job! Keep practicing the Pythagorean theorem.'
      },
      {
        id: 2,
        quizTitle: 'Chemistry Lab',
        score: 92,
        total: 100,
        date: '2025-04-20',
        subject: 'Science',
        feedback: 'Excellent work on the chemical reactions section!'
      }
    ],
    achievements: [
      { id: 1, title: 'Quick Learner', icon: '⚡', description: 'Completed 5 quizzes in under 30 minutes' },
      { id: 2, title: 'Perfect Score', icon: '🎯', description: 'Scored 100% on 3 quizzes' },
      { id: 3, title: 'Consistent Performer', icon: '📈', description: 'Maintained above 90% for 5 quizzes' }
    ]
  };

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

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-transparent bg-clip-text">
              Welcome back, {user?.user_metadata.name || user?.email}
            </h1>
            <p className="text-gray-600">Here's what's happening in your learning world</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Points and Level Card */}
              <Card className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Your Progress</CardTitle>
                      <CardDescription className="text-white/80">Level {studentData.level}</CardDescription>
                    </div>
                    <Trophy className="h-12 w-12 text-white/20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline mb-2">
                    <span className="text-4xl font-bold">{studentData.points}</span>
                    <span className="ml-2 text-white/80">total points</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Level Progress</span>
                      <span>{studentData.levelProgress}%</span>
                    </div>
                    <Progress value={studentData.levelProgress} className="h-2 bg-white/20" />
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

              {/* Upcoming Quizzes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upcoming Quizzes</CardTitle>
                    <Link to="/quizzes" className="text-sm text-cyan-600 hover:underline font-medium">
                      View all
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentData.upcomingQuizzes.length > 0 ? (
                    <div className="space-y-4">
                      {studentData.upcomingQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="border border-gray-200 hover:border-cyan-200 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{quiz.title}</h3>
                                <p className="text-sm text-gray-500">By {quiz.teacher}</p>
                                <div className="flex items-center mt-2 space-x-2">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {quiz.subject}
                                  </Badge>
                                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                                    {quiz.difficulty}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  <span>{formatDate(quiz.date)}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{quiz.estimatedTime}</p>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="py-3 border-t border-gray-100">
                            <Button className="w-full" asChild>
                              <Link to={`/quiz/${quiz.id}`}>
                                <BookOpen className="h-4 w-4 mr-2" /> View Details
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No upcoming quizzes</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Grades */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studentData.recentGrades.map((grade) => (
                      <Card key={grade.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{grade.quizTitle}</h3>
                              <p className="text-sm text-gray-500">{grade.subject}</p>
                              <p className="text-sm text-gray-500 mt-1">{grade.feedback}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${getGradeColor(grade.score)}`}>
                                {grade.score}/{grade.total}
                              </Badge>
                              <p className="text-xs text-gray-400 mt-1">{grade.date}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start bg-cyan-500 hover:bg-cyan-600" asChild>
                    <Link to="/join-quiz">
                      <GraduationCap className="h-4 w-4 mr-2" /> Join a Quiz
                    </Link>
                  </Button>
                  <Button className="w-full justify-start bg-blue-500 hover:bg-blue-600" asChild>
                    <Link to="/forum/new">
                      <MessageCircle className="h-4 w-4 mr-2" /> Ask a Question
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studentData.achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xl">
                          {achievement.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-gray-500">{achievement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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

export default StudentDashboard; 