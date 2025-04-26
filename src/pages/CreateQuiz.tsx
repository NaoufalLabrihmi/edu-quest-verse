
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctOption?: number;
  answer?: boolean | string;
  points: number;
  timeLimit: number;
}

const CreateQuiz = () => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [accessCode, setAccessCode] = useState(
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: Date.now().toString(),
    type: 'multiple_choice',
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    points: 1,
    timeLimit: 30,
  });
  
  const { toast } = useToast();

  const handleAddQuestion = () => {
    // Validate question
    if (!currentQuestion.text) {
      toast({
        title: "Question text required",
        description: "Please enter the question text.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentQuestion.type === 'multiple_choice' && 
        currentQuestion.options?.some(option => !option.trim())) {
      toast({
        title: "Invalid options",
        description: "All options must have content.",
        variant: "destructive",
      });
      return;
    }
    
    // Add question to list
    setQuestions([...questions, currentQuestion]);
    
    // Reset current question based on the current type
    setCurrentQuestion({
      id: Date.now().toString(),
      type: currentQuestion.type,
      text: '',
      options: currentQuestion.type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctOption: currentQuestion.type === 'multiple_choice' ? 0 : undefined,
      answer: currentQuestion.type === 'true_false' ? true : 
              currentQuestion.type === 'short_answer' ? '' : undefined,
      points: 1,
      timeLimit: 30,
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleOptionChange = (index: number, value: string) => {
    if (currentQuestion.options) {
      const newOptions = [...currentQuestion.options];
      newOptions[index] = value;
      setCurrentQuestion({ ...currentQuestion, options: newOptions });
    }
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    // Reset the current question with the appropriate structure for the new type
    setCurrentQuestion({
      id: Date.now().toString(),
      type,
      text: currentQuestion.text,
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctOption: type === 'multiple_choice' ? 0 : undefined,
      answer: type === 'true_false' ? true : 
              type === 'short_answer' ? '' : undefined,
      points: currentQuestion.points,
      timeLimit: currentQuestion.timeLimit,
    });
  };

  const handleSaveQuiz = () => {
    // Validate quiz
    if (!title || !subject || questions.length === 0) {
      toast({
        title: "Unable to save quiz",
        description: "Please fill in all required fields and add at least one question.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would save to Supabase
    toast({
      title: "Quiz created!",
      description: `Your quiz "${title}" has been created with access code: ${accessCode}`,
    });
    
    // Reset form
    setTitle('');
    setSubject('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setAccessCode(Math.floor(100000 + Math.random() * 900000).toString());
    setQuestions([]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation isLoggedIn={true} userRole="teacher" userName="Teacher" userPoints={100} />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create a New Quiz</h1>
            <p className="text-gray-600">Design your interactive quiz with questions and schedules</p>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Quiz Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="title">Quiz Title*</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Algebra Fundamentals"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Subject*</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className="mt-1">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="geography">Geography</SelectItem>
                    <SelectItem value="computer">Computer Science</SelectItem>
                    <SelectItem value="art">Art</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="pe">Physical Education</SelectItem>
                    <SelectItem value="language">Foreign Language</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a brief description of your quiz"
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="date">Scheduled Date (optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="time">Scheduled Time (optional)</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="access-code">Access Code</Label>
                <div className="flex mt-1">
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    maxLength={6}
                    className="text-center font-mono text-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => setAccessCode(Math.floor(100000 + Math.random() * 900000).toString())}
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Students will use this code to access your quiz
                </p>
              </div>
            </div>
          </div>
          
          {/* Questions Section */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Quiz Questions</h2>
            
            {questions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3">Added Questions ({questions.length})</h3>
                
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="bg-edu-purple-500 text-white h-6 w-6 rounded-full flex items-center justify-center text-sm font-medium mr-2">
                                {index + 1}
                              </span>
                              <span className="font-medium">{question.text}</span>
                            </div>
                            
                            <div className="pl-8 text-sm text-gray-500">
                              <span className="capitalize">{question.type.replace('_', ' ')}</span>
                              <span className="mx-2">•</span>
                              <span>{question.points} {question.points === 1 ? 'point' : 'points'}</span>
                              <span className="mx-2">•</span>
                              <span>{question.timeLimit} seconds</span>
                            </div>
                            
                            {question.type === 'multiple_choice' && question.options && (
                              <div className="pl-8 mt-2 space-y-1">
                                {question.options.map((option, i) => (
                                  <div key={i} className="flex items-center">
                                    {i === question.correctOption && (
                                      <Check className="h-4 w-4 text-green-500 mr-1" />
                                    )}
                                    <span className={i === question.correctOption ? "text-green-700 font-medium" : "text-gray-600"}>
                                      {option}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'true_false' && (
                              <div className="pl-8 mt-2">
                                <span className="text-green-700 font-medium">
                                  Correct answer: {question.answer ? 'True' : 'False'}
                                </span>
                              </div>
                            )}
                            
                            {question.type === 'short_answer' && question.answer && (
                              <div className="pl-8 mt-2">
                                <span className="text-green-700 font-medium">
                                  Expected answer: {question.answer}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => handleRemoveQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Add New Question</h3>
              
              <Tabs value={currentQuestion.type} onValueChange={(v) => handleQuestionTypeChange(v as QuestionType)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="multiple_choice">Multiple Choice</TabsTrigger>
                  <TabsTrigger value="true_false">True/False</TabsTrigger>
                  <TabsTrigger value="short_answer">Short Answer</TabsTrigger>
                </TabsList>
                
                <div className="mb-4">
                  <Label htmlFor="question-text">Question Text*</Label>
                  <Textarea
                    id="question-text"
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                    placeholder="Enter your question here"
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
                
                <TabsContent value="multiple_choice" className="mt-0">
                  <div className="space-y-3">
                    <Label>Options (select the correct one)</Label>
                    
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center">
                        <RadioGroup
                          value={currentQuestion.correctOption?.toString()}
                          onValueChange={(value) => setCurrentQuestion({ 
                            ...currentQuestion, 
                            correctOption: parseInt(value) 
                          })}
                          className="mr-2"
                        >
                          <RadioGroupItem 
                            value={index.toString()} 
                            id={`option-${index}`}
                            className="mt-0"
                          />
                        </RadioGroup>
                        
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="true_false" className="mt-0">
                  <div>
                    <Label>Correct Answer</Label>
                    <RadioGroup
                      value={currentQuestion.answer ? "true" : "false"}
                      onValueChange={(value) => setCurrentQuestion({ 
                        ...currentQuestion, 
                        answer: value === "true" 
                      })}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>
                
                <TabsContent value="short_answer" className="mt-0">
                  <div>
                    <Label htmlFor="correct-answer">Correct Answer</Label>
                    <Input
                      id="correct-answer"
                      value={currentQuestion.answer as string || ''}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                      placeholder="Enter the correct answer"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Student answers will be marked correct if they match exactly (case insensitive)
                    </p>
                  </div>
                </TabsContent>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Select 
                      value={currentQuestion.points.toString()} 
                      onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, points: parseInt(v) })}
                    >
                      <SelectTrigger id="points" className="mt-1">
                        <SelectValue placeholder="Select points" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 point</SelectItem>
                        <SelectItem value="2">2 points</SelectItem>
                        <SelectItem value="3">3 points</SelectItem>
                        <SelectItem value="5">5 points</SelectItem>
                        <SelectItem value="10">10 points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="time-limit">Time Limit (seconds)</Label>
                    <Select 
                      value={currentQuestion.timeLimit.toString()} 
                      onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, timeLimit: parseInt(v) })}
                    >
                      <SelectTrigger id="time-limit" className="mt-1">
                        <SelectValue placeholder="Select time limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="20">20 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="45">45 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button onClick={handleAddQuestion} className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add This Question
                  </Button>
                </div>
              </Tabs>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSaveQuiz} disabled={!title || !subject || questions.length === 0}>
              Save Quiz
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CreateQuiz;
