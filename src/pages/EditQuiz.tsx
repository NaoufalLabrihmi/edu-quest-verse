import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
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
import { supabase } from '@/integrations/supabase/client';

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
  order_number: number;
}

const defaultQuestion = (): Question => ({
  id: Date.now().toString(),
  type: 'multiple_choice',
  text: '',
  options: ['', '', '', ''],
  correctOption: 0,
  points: 1,
  timeLimit: 30,
  pointMultiplier: 1,
  order_number: 0,
});

const EditQuiz = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(defaultQuestion());
  const [accessCode, setAccessCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const addEditRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
        .eq('id', id)
        .eq('created_by', user?.id)
        .single();

      if (error) throw error;

      setQuizTitle(data.title);
      setQuizDescription(data.description);
      setAccessCode(data.access_code);

      const formattedQuestions = data.questions.map((q: any) => ({
        id: q.id,
        type: q.question_type as QuestionType,
        text: q.question_text,
        options: q.options || [],
        correctOption: q.question_type === 'multiple_choice' ? q.options.indexOf(q.correct_answer) : undefined,
        answer: q.question_type === 'true_false' ? q.correct_answer === 'true' : q.correct_answer,
        points: q.points,
        timeLimit: q.time_limit,
        pointMultiplier: q.point_multiplier,
        order_number: q.order_number,
      }));

      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
    if (editingQuestionIndex !== null) {
      setQuestions((prev) =>
        prev.map((q, i) => (i === editingQuestionIndex ? { ...questionToSave } : q))
      );
      setEditingQuestionIndex(null);
    } else {
      setQuestions([...questions, { ...questionToSave, order_number: questions.length }]);
    }
    setCurrentQuestion(defaultQuestion());
  };

  const handleEditQuestion = (index: number) => {
    setCurrentQuestion({ ...questions[index] });
    setEditingQuestionIndex(index);
    setTimeout(() => {
      addEditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (editingQuestionIndex !== null) setEditingQuestionIndex(null);
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Access code copied!' });
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim() || questions.length === 0) {
      toast({
        title: 'Unable to save quiz',
        description: 'Please provide a title and at least one question',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // First, update the quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .update({
          title: quizTitle,
          description: quizDescription,
        })
        .eq('id', id);

      if (quizError) throw quizError;

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', id);

      if (deleteError) throw deleteError;

      // Insert updated questions
      const questionData = questions.map((q, index) => ({
        quiz_id: id,
        question_text: q.text,
        question_type: q.type,
        correct_answer: q.type === 'multiple_choice' 
          ? q.options?.[q.correctOption || 0] 
          : q.type === 'true_false' 
            ? q.answer?.toString() 
            : q.answer as string,
        options: q.options || [],
        points: q.points,
        time_limit: q.timeLimit,
        point_multiplier: q.pointMultiplier,
        order_number: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionData);

      if (questionsError) throw questionsError;

      toast({
        title: 'Quiz updated!',
        description: `Your quiz "${quizTitle}" has been updated.`,
      });

      navigate('/quizzes');
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading quiz...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text">
              Edit Quiz
            </h1>
            <p className="text-lg text-gray-300">
              Modify your quiz questions and settings
            </p>
          </div>

          {/* Responsive two-column layout for Quiz Details and Add/Edit Question */}
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            {/* Quiz Details Card */}
            <div className="flex-1 md:basis-2/5 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-3xl p-8 border border-cyan-700/30">
              <h2 className="text-2xl font-extrabold mb-4 text-cyan-300 drop-shadow-cyan">Quiz Details</h2>
              <div className="grid grid-cols-1 gap-6">
              <div>
                <Label htmlFor="title">Quiz Title*</Label>
                <Input
                  id="title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g., Algebra Fundamentals"
                    className="mt-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  required
                />
              </div>
              <div>
                <Label htmlFor="access-code">Access Code</Label>
                <div className="flex items-center mt-1 space-x-2">
                  <Input
                    id="access-code"
                    value={accessCode}
                    readOnly
                      className="text-center font-mono text-lg bg-gray-900 border-cyan-700/40 text-cyan-300 tracking-widest shadow-inner focus:ring-2 focus:ring-cyan-400"
                  />
                  <Button
                    type="button"
                    variant="outline"
                      className="border-cyan-500 text-cyan-300 hover:bg-cyan-900 focus:ring-2 focus:ring-cyan-400"
                    onClick={() => handleCopyCode(accessCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
                <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Provide a brief description of your quiz"
                    className="mt-1 resize-none bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  rows={3}
                />
              </div>
            </div>
          </div>
            {/* Add/Edit Question Card */}
            <div ref={addEditRef} className="flex-1 md:basis-3/5 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-3xl p-8 border border-cyan-700/30">
              <h3 className="text-xl font-bold mb-3 text-cyan-200">{editingQuestionIndex !== null ? 'Edit Question' : 'Add New Question'}</h3>
              <Tabs value={currentQuestion.type} onValueChange={(v) => handleQuestionTypeChange(v as QuestionType)}>
                <TabsList className="mb-4 bg-gray-800 border border-cyan-700/40 rounded-lg">
                  {QUESTION_TYPES.map((qt) => (
                    <TabsTrigger key={qt.value} value={qt.value} className="text-cyan-200 data-[state=active]:bg-cyan-700 data-[state=active]:text-white">
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
                    className="mt-1 resize-none bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
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
                            className="mt-0 border-cyan-400 focus:ring-2 focus:ring-cyan-400"
                          />
                        </RadioGroup>
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
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
                        <RadioGroupItem value="true" id="true" className="border-cyan-400 focus:ring-2 focus:ring-cyan-400" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" className="border-cyan-400 focus:ring-2 focus:ring-cyan-400" />
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
                      className="mt-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    />
                    <p className="text-xs text-cyan-400 mt-1">
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
                      <SelectTrigger id="points" className="mt-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400">
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
                      <SelectTrigger id="time-limit" className="mt-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400">
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
                      <SelectTrigger id="point-multiplier" className="mt-1 bg-gray-900 border-cyan-700/40 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400">
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
                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={handleAddOrEditQuestion}
                    className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg hover:from-blue-500 hover:to-cyan-500 focus:ring-2 focus:ring-cyan-400"
                  >
                    {editingQuestionIndex !== null ? 'Update Question' : 'Add This Question'}
                  </Button>
                  {editingQuestionIndex !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full md:w-auto border-cyan-700 text-cyan-300 hover:bg-gray-800 focus:ring-2 focus:ring-cyan-400"
                      onClick={() => {
                        setCurrentQuestion(defaultQuestion());
                        setEditingQuestionIndex(null);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </Tabs>
            </div>
          </div>

          {/* Quiz Questions List Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-3xl p-8 mb-10 border border-cyan-700/30">
            <h2 className="text-2xl font-extrabold mb-4 text-cyan-300 drop-shadow-cyan">Quiz Questions</h2>
            {questions.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-bold mb-3 text-cyan-200">Added Questions ({questions.length})</h3>
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="overflow-hidden bg-gray-950 border border-cyan-700/20 shadow-lg rounded-2xl">
                      <CardContent className="p-5 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white h-8 w-8 rounded-full flex items-center justify-center text-base font-bold mr-3 shadow-cyan-glow">
                              {index + 1}
                            </span>
                            <span className="font-semibold text-lg text-white drop-shadow-cyan">{question.text}</span>
                          </div>
                          <div className="pl-11 text-sm text-cyan-300">
                            <span className="capitalize">{QUESTION_TYPES.find(t => t.value === question.type)?.label}</span>
                            <span className="mx-2">•</span>
                            <span>{question.points} {question.points === 1 ? 'point' : 'points'}</span>
                            <span className="mx-2">•</span>
                            <span>{question.timeLimit} seconds</span>
                          </div>
                          {question.type === 'multiple_choice' && question.options && (
                            <div className="pl-11 mt-2 space-y-1">
                              {question.options.map((option, i) => (
                                <div key={i} className="flex items-center">
                                  {i === question.correctOption && (
                                    <Check className="h-4 w-4 text-cyan-400 mr-1" />
                                  )}
                                  <span className={i === question.correctOption ? 'text-cyan-200 font-semibold' : 'text-gray-300'}>
                                    {option}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === 'true_false' && (
                            <div className="pl-11 mt-2">
                              <span className="text-cyan-200 font-semibold">
                                Correct answer: {question.answer ? 'True' : 'False'}
                              </span>
                            </div>
                          )}
                          {question.type === 'short_answer' && question.answer && (
                            <div className="pl-11 mt-2">
                              <span className="text-cyan-200 font-semibold">
                                Expected answer: {question.answer}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-cyan-300 border-cyan-500 hover:bg-cyan-900 focus:ring-2 focus:ring-cyan-400"
                            onClick={() => handleEditQuestion(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-400 border-red-500 hover:bg-red-900 focus:ring-2 focus:ring-red-400"
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
          </div>
          <div className="flex justify-end space-x-4 mt-8">
            <Button variant="outline" className="border-cyan-700 text-cyan-300 hover:bg-gray-800 focus:ring-2 focus:ring-cyan-400" onClick={() => navigate('/quizzes')}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuiz}
              disabled={isSaving || !quizTitle || questions.length === 0}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg hover:from-blue-500 hover:to-cyan-500 focus:ring-2 focus:ring-cyan-400"
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

export default EditQuiz; 