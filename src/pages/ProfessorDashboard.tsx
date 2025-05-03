import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, BarChart2, FileText, GraduationCap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Progress } from '@/components/ui/progress';

const ProfessorDashboard = () => {
  const { user } = useAuth();
  
  // Sample data - in a real app, this would come from your API
  const professorData = {
    stats: {
      totalQuizzes: 12,
      activeQuizzes: 3,
      totalStudents: 145,
      averageCompletionRate: 85
    },
    activeQuizzes: [
      {
        id: 1,
        title: 'Algebra Fundamentals',
        totalStudents: 45,
        completedStudents: 38,
        averageScore: 78,
        completionRate: '85%',
        subject: 'Math',
        difficulty: 'Medium',
        dueDate: '2025-05-01T14:00:00'
      },
      {
        id: 2,
        title: 'World History: Ancient Civilizations',
        totalStudents: 32,
        completedStudents: 29,
        averageScore: 82,
        completionRate: '90%',
        subject: 'History',
        difficulty: 'Easy',
        dueDate: '2025-05-03T10:30:00'
      }
    ],
    recentSubmissions: [
      {
        id: 1,
        studentName: 'Sarah Johnson',
        quizTitle: 'Algebra Fundamentals',
        status: 'Submitted',
        time: '2 hours ago',
        score: 92,
        total: 100
      },
      {
        id: 2,
        studentName: 'Michael Chen',
        quizTitle: 'World History',
        status: 'Graded',
        time: '1 day ago',
        score: 85,
        total: 100
      }
    ],
    quickStats: [
      { title: 'Total Quizzes', value: '12', icon: BookOpen, color: 'text-edu-blue-500' },
      { title: 'Active Students', value: '145', icon: Users, color: 'text-cyan-500' },
      { title: 'Completion Rate', value: '85%', icon: BarChart2, color: 'text-edu-green-500' }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Graded':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
            <p className="text-gray-600">Here's what's happening in your teaching world</p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {professorData.quickStats.map((stat, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full bg-opacity-10 ${stat.color.replace('text-', 'bg-')}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Quizzes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Quizzes</CardTitle>
                    <Link to="/quizzes" className="text-sm text-cyan-600 hover:underline font-medium">
                      View all
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {professorData.activeQuizzes.length > 0 ? (
                    <div className="space-y-4">
                      {professorData.activeQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="border border-gray-200 hover:border-cyan-200 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{quiz.title}</h3>
                                <p className="text-sm text-gray-500">{quiz.subject}</p>
                                <div className="flex items-center mt-2 space-x-2">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {quiz.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                                    {quiz.completionRate} completed
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  <span>{formatDate(quiz.dueDate)}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{quiz.completedStudents}/{quiz.totalStudents} students</p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Average Score</span>
                                <span>{quiz.averageScore}%</span>
                              </div>
                              <Progress value={quiz.averageScore} className="h-2" />
                            </div>
                          </CardContent>
                          <CardFooter className="py-3 border-t border-gray-100">
                            <Button className="w-full" asChild>
                              <Link to={`/quiz/${quiz.id}/results`}>
                                <BarChart2 className="h-4 w-4 mr-2" /> View Results
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No active quizzes</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {professorData.recentSubmissions.map((submission) => (
                      <Card key={submission.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{submission.studentName}</h3>
                              <p className="text-sm text-gray-500">{submission.quizTitle}</p>
                              <div className="flex items-center mt-2">
                                {submission.status === 'Graded' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                                )}
                                <span className="text-sm text-gray-500">{submission.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusColor(submission.status)}>
                                {submission.score}/{submission.total}
                              </Badge>
                              <p className="text-xs text-gray-400 mt-1">{submission.time}</p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="py-3 border-t border-gray-100">
                          <Button variant="outline" className="w-full" asChild>
                            <Link to={`/submission/${submission.id}`}>
                              <FileText className="h-4 w-4 mr-2" /> Review
                            </Link>
                          </Button>
                        </CardFooter>
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
                  <Button className="w-full justify-start bg-blue-500 hover:bg-blue-600" asChild>
                    <Link to="/create-quiz">
                      <BookOpen className="h-4 w-4 mr-2" /> Create Quiz
                    </Link>
                  </Button>
                  <Button className="w-full justify-start bg-cyan-500 hover:bg-cyan-600" asChild>
                    <Link to="/quizzes">
                      <GraduationCap className="h-4 w-4 mr-2" /> Manage Quizzes
                    </Link>
                  </Button>
                  <Button className="w-full justify-start bg-green-500 hover:bg-green-600" asChild>
                    <Link to="/analytics">
                      <BarChart2 className="h-4 w-4 mr-2" /> View Analytics
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Overall Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quiz Completion Rate</span>
                        <span>{professorData.stats.averageCompletionRate}%</span>
                      </div>
                      <Progress value={professorData.stats.averageCompletionRate} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{professorData.stats.totalQuizzes}</p>
                        <p className="text-sm text-gray-500">Total Quizzes</p>
                      </div>
                      <div className="text-center p-4 bg-cyan-50 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-600">{professorData.stats.totalStudents}</p>
                        <p className="text-sm text-gray-500">Total Students</p>
                      </div>
                    </div>
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

export default ProfessorDashboard; 