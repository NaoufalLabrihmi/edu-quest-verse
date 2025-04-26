import React, { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
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
import { Check, Plus, Trash2, Edit2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase as baseSupabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
const supabase: any = baseSupabase;

// Question types as in DB
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
];

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
  pointMultiplier: number;
}

const defaultQuestion = (): Question => ({
  id: Date.now().toString(),
  type: 'multiple_choice',
  text: '',
  options: ['', '', '', ''],
  correctOption: 0,
  answer: '',
  points: 5,
  timeLimit: 30,
  pointMultiplier: 1,
});

const CreateQuiz = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessCode, setAccessCode] = useState(
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(defaultQuestion());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // --- UI helpers ---
  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast({ title: 'Access code copied!' });
  };

  // --- Question logic ---
  const handleAddOrEditQuestion = () => {
    if (!currentQuestion.text.trim()) {
      toast({ title: 'Question text required', variant: 'destructive' });
      return;
    }
    if (
      currentQuestion.type === 'multiple_choice' &&
      currentQuestion.options?.some((opt) => !opt.trim())
    ) {
      toast({ title: 'All options must have content', variant: 'destructive' });
      return;
    }
    let questionToSave = { ...currentQuestion };
    if (currentQuestion.type === 'true_false') {
      questionToSave.answer = currentQuestion.answer === true ? true : false;
    }
    if (editingIndex !== null) {
      setQuestions((prev) =>
        prev.map((q, i) => (i === editingIndex ? { ...questionToSave } : q))
      );
      setEditingIndex(null);
    } else {
      setQuestions([...questions, { ...questionToSave }]);
    }
    setCurrentQuestion(defaultQuestion());
  };

  const handleEditQuestion = (index: number) => {
    setCurrentQuestion({ ...questions[index] });
    setEditingIndex(index);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (editingIndex !== null) setEditingIndex(null);
    setCurrentQuestion(defaultQuestion());
  };

  const handleOptionChange = (index: number, value: string) => {
    if (currentQuestion.options) {
      const newOptions = [...currentQuestion.options];
      newOptions[index] = value;
      setCurrentQuestion({ ...currentQuestion, options: newOptions });
    }
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    setCurrentQuestion({
      ...defaultQuestion(),
      type,
      text: currentQuestion.text,
      points: currentQuestion.points,
      timeLimit: currentQuestion.timeLimit,
      pointMultiplier: currentQuestion.pointMultiplier,
      answer: type === 'true_false' ? true : type === 'short_answer' ? '' : '',
    });
  };

  // --- Save Quiz ---
  const handleSaveQuiz = async () => {
    if (!title.trim() || questions.length === 0) {
      toast({
        title: 'Unable to save quiz',
        description: 'Please fill in all required fields and add at least one question.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({ title: 'You must be logged in to create a quiz', variant: 'destructive' });
      return;
    }
    // Defensive: check all questions for valid points, timeLimit, pointMultiplier
    for (const q of questions) {
      if (
        typeof q.points !== 'number' || q.points < 1 || q.points > 10 ||
        typeof q.timeLimit !== 'number' || q.timeLimit < 1 || q.timeLimit > 120 ||
        typeof q.pointMultiplier !== 'number' || ![1, 2].includes(q.pointMultiplier)
      ) {
        toast({
          title: 'Invalid question values',
          description: 'Check points, time limit, and point multiplier for all questions.',
          variant: 'destructive',
        });
        return;
      }
    }
    setIsSaving(true);
    try {
      // 1. Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          {
            title,
            description,
            access_code: accessCode,
            status: 'draft',
            created_by: user.id,
          },
        ])
        .select()
        .single();
      if (quizError || !quiz) throw quizError || new Error('Quiz not created');
      // 2. Create questions
      const questionInserts = questions.map((q, idx) => ({
        quiz_id: quiz.id,
        question_text: q.text,
        question_type: q.type,
        correct_answer:
          q.type === 'multiple_choice'
            ? (q.options && q.options[q.correctOption || 0]) || ''
            : q.type === 'true_false'
            ? q.answer === true ? 'true' : 'false'
            : String(q.answer),
        options: q.type === 'multiple_choice' ? q.options : null,
        points: q.points,
        time_limit: q.timeLimit,
        point_multiplier: q.pointMultiplier,
        order_number: idx + 1,
      }));
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionInserts);
      if (questionsError) throw questionsError;
      toast({
        title: 'Quiz created!',
        description: `Your quiz "${title}" has been created.`,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setAccessCode(Math.random().toString(36).substring(2, 8).toUpperCase());
      setQuestions([]);
      setCurrentQuestion(defaultQuestion());
      setEditingIndex(null);
      
      // Navigate to dashboard after successful creation
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Error creating quiz',
        description: err.message || (err?.details ?? 'Something went wrong'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI ---
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">Create a New Quiz</h1>
            <p className="text-lg text-gray-300">Design your interactive quiz with questions and launch it for your class!</p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl rounded-2xl p-8 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-indigo-300">Quiz Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="title">Quiz Title*</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Algebra Fundamentals"
                  className="mt-1 bg-gray-900 border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="access-code">Access Code</Label>
                <div className="flex items-center mt-1 space-x-2">
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center font-mono text-lg bg-gray-900 border-indigo-500 text-indigo-300 tracking-widest shadow-inner"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-indigo-500 text-indigo-300 hover:bg-indigo-900"
                    onClick={handleCopyCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2 border-indigo-500 text-indigo-300 hover:bg-indigo-900"
                    onClick={() => setAccessCode(Math.random().toString(36).substring(2, 8).toUpperCase())}
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Students will use this code to access your quiz</p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a brief description of your quiz"
                  className="mt-1 resize-none bg-gray-900 border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>
          </div>
          {/* Questions Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl rounded-2xl p-8 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-pink-300">Quiz Questions</h2>
            {questions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-indigo-200">Added Questions ({questions.length})</h3>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="overflow-hidden bg-gray-900 border border-gray-700">
                      <CardContent className="p-4 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold mr-2">
                              {index + 1}
                            </span>
                            <span className="font-semibold text-lg text-white">{question.text}</span>
                          </div>
                          <div className="pl-8 text-sm text-gray-400">
                            <span className="capitalize">{QUESTION_TYPES.find(t => t.value === question.type)?.label}</span>
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
                                    <Check className="h-4 w-4 text-green-400 mr-1" />
                                  )}
                                  <span className={i === question.correctOption ? 'text-green-300 font-semibold' : 'text-gray-300'}>
                                    {option}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === 'true_false' && (
                            <div className="pl-8 mt-2">
                              <span className="text-green-300 font-semibold">
                                Correct answer: {question.answer ? 'True' : 'False'}
                              </span>
                            </div>
                          )}
                          {question.type === 'short_answer' && question.answer && (
                            <div className="pl-8 mt-2">
                              <span className="text-green-300 font-semibold">
                                Expected answer: {question.answer}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-indigo-300 border-indigo-500 hover:bg-indigo-900"
                            onClick={() => handleEditQuestion(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-pink-300 border-pink-500 hover:bg-pink-900"
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
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
              <h3 className="text-lg font-semibold mb-3 text-pink-200">{editingIndex !== null ? 'Edit Question' : 'Add New Question'}</h3>
              <Tabs value={currentQuestion.type} onValueChange={(v) => handleQuestionTypeChange(v as QuestionType)}>
                <TabsList className="mb-4 bg-gray-800 border border-gray-700 rounded-lg">
                  {QUESTION_TYPES.map((qt) => (
                    <TabsTrigger key={qt.value} value={qt.value} className="text-indigo-200 data-[state=active]:bg-indigo-700 data-[state=active]:text-white">
                      {qt.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="mb-4">
                  <Label htmlFor="question-text">Question Text*</Label>
                  <Textarea
                    id="question-text"
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                    placeholder="Enter your question here"
                    className="mt-1 resize-none bg-gray-900 border-gray-700 text-white"
                    rows={2}
                  />
                </div>
                <TabsContent value="multiple_choice" className="mt-0">
                  <div className="space-y-3">
                    <Label>Options (select the correct one)</Label>
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <RadioGroup
                          value={currentQuestion.correctOption?.toString()}
                          onValueChange={(value) => setCurrentQuestion({
                            ...currentQuestion,
                            correctOption: parseInt(value),
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
                          className="flex-1 bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="true_false" className="mt-0">
                  <div>
                    <Label>Correct Answer</Label>
                    <RadioGroup
                      value={currentQuestion.answer ? 'true' : 'false'}
                      onValueChange={(value) => setCurrentQuestion({
                        ...currentQuestion,
                        answer: value === 'true',
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
                      className="mt-1 bg-gray-900 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Student answers will be marked correct if they match exactly (case insensitive)
                    </p>
                  </div>
                </TabsContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Select
                      value={currentQuestion.points.toString()}
                      onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, points: Number(v) })}
                    >
                      <SelectTrigger id="points" className="mt-1 bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Select points" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10].map((p) => (
                          <SelectItem key={p} value={p.toString()}>{p} point{p > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time-limit">Time Limit (seconds)</Label>
                    <Select
                      value={currentQuestion.timeLimit.toString()}
                      onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, timeLimit: Number(v) })}
                    >
                      <SelectTrigger id="time-limit" className="mt-1 bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Select time limit" />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                          <SelectItem key={t} value={t.toString()}>{t} seconds</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="point-multiplier">Point Multiplier</Label>
                    <Select
                      value={currentQuestion.pointMultiplier.toString()}
                      onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, pointMultiplier: Number(v) })}
                    >
                      <SelectTrigger id="point-multiplier" className="mt-1 bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Select multiplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2].map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleAddOrEditQuestion}
                    className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold shadow-lg hover:from-pink-500 hover:to-indigo-500"
                  >
                    {editingIndex !== null ? 'Update Question' : 'Add This Question'}
                  </Button>
                  {editingIndex !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full md:w-auto border-gray-700 text-gray-300 hover:bg-gray-800"
                      onClick={() => {
                        setCurrentQuestion(defaultQuestion());
                        setEditingIndex(null);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
            <Button
              onClick={handleSaveQuiz}
              disabled={isSaving || !title || questions.length === 0}
              className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold shadow-lg hover:from-pink-500 hover:to-indigo-500"
            >
              {isSaving ? 'Saving...' : 'Save Quiz'}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateQuiz;
