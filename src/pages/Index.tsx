import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { GraduationCap, MessageCircle, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

const Index = () => {
  const [enteredCode, setEnteredCode] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify the quiz code and navigate to the quiz
    console.log('Joining quiz with code:', enteredCode);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="hero-gradient py-20 md:py-28">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Learn, Quiz, Earn Rewards
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-10">
              Join EduQuestVerse - the interactive learning platform where knowledge earns rewards. 
              Create quizzes, earn points, and participate in meaningful educational discussions.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4 max-w-md mx-auto">
              <Button 
                size="lg" 
                className="bg-white text-edu-purple-500 hover:bg-gray-100"
                asChild
              >
                <Link to="/register">Sign up</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
                asChild
              >
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Join Quiz Section */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                  Join a Quiz
                </h2>
                <form onSubmit={handleJoinQuiz} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      placeholder="Enter quiz code"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-edu-purple-500 focus:border-transparent text-center text-2xl font-medium tracking-wider placeholder:text-gray-400"
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-edu-purple-500 hover:bg-edu-purple-600 text-lg"
                    disabled={!enteredCode}
                  >
                    Enter
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Quiz Feature */}
              <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                <div className="w-16 h-16 bg-edu-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-edu-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Interactive Quizzes</h3>
                <p className="text-gray-600">
                  Teachers create engaging quizzes with multiple-choice, true/false, and short answer questions. Students join with a unique access code.
                </p>
              </div>
              
              {/* Points Feature */}
              <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                <div className="w-16 h-16 bg-edu-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-edu-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Points & Rewards</h3>
                <p className="text-gray-600">
                  Earn points by performing well on quizzes. Top performers get more points. Redeem them in the shop for exciting rewards.
                </p>
              </div>
              
              {/* Forum Feature */}
              <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                <div className="w-16 h-16 bg-edu-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-edu-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Learning Forum</h3>
                <p className="text-gray-600">
                  Ask questions, share knowledge, and help others. The community-driven forum connects students and teachers.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials/Users */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-2">Who Uses EduQuestVerse</h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Join thousands of teachers and students already enhancing their educational experience
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Teacher Testimonial */}
              <div className="bg-gradient-to-br from-edu-blue-50 to-edu-purple-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-start mb-4">
                  <div className="bg-edu-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    T
                  </div>
                  <div>
                    <h4 className="font-semibold">Emily Rodriguez</h4>
                    <p className="text-sm text-gray-600">Math Teacher</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  "EduQuestVerse has transformed my classroom. Creating interactive quizzes keeps my students engaged, and the point system motivates them to participate actively."
                </p>
              </div>
              
              {/* Student Testimonial */}
              <div className="bg-gradient-to-br from-edu-orange-50 to-edu-pink-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-start mb-4">
                  <div className="bg-edu-orange-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    S
                  </div>
                  <div>
                    <h4 className="font-semibold">Alex Johnson</h4>
                    <p className="text-sm text-gray-600">High School Student</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  "I love competing in quizzes and earning points! The forum helps me when I'm stuck on homework, and I've already redeemed points for some cool prizes."
                </p>
              </div>
              
              {/* Admin Testimonial */}
              <div className="bg-gradient-to-br from-edu-purple-50 to-edu-pink-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-start mb-4">
                  <div className="bg-edu-purple-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    A
                  </div>
                  <div>
                    <h4 className="font-semibold">Michael Thompson</h4>
                    <p className="text-sm text-gray-600">School Administrator</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  "As an administrator, I appreciate how EduQuestVerse provides valuable insights into student engagement and performance while making learning fun."
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="bg-edu-purple-500 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Learning Experience?</h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg">
              Join EduQuestVerse today and discover a new way to teach, learn, and be rewarded.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-edu-purple-500 hover:bg-gray-100 px-8"
              asChild
            >
              <Link to="/register">Get Started Now</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
