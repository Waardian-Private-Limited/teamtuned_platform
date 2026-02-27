"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
    Plus, Search, Filter, Edit2, Trash2, X, Save, FileText,
    CheckCircle2, AlertCircle, BookOpen, Target, Award,
    Bot, Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface TechnicalQuestion {
    id: number;
    question_text: string;
    type: 'MCQ' | 'Descriptive';
    options?: string[];
    correct_answer?: string;
    expected_answer?: string;
    marks: number;
    difficulty: 'Basic' | 'Intermediate' | 'Advanced';
    department: string;
    created_at?: string;
}

export default function TechnicalQuestions() {
    const [questions, setQuestions] = useState<TechnicalQuestion[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [filterType, setFilterType] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<TechnicalQuestion | null>(null);

    // AI Bot State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiDepartment, setAiDepartment] = useState('');
    const [aiType, setAiType] = useState<'MCQ' | 'Descriptive'>('MCQ');
    const [aiCount, setAiCount] = useState<number>(5);
    const [jobOpenings, setJobOpenings] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [aiJobRole, setAiJobRole] = useState('');
    const [aiJobDescription, setAiJobDescription] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [addedQuestionIndexes, setAddedQuestionIndexes] = useState<number[]>([]);

    // Form state
    const [formData, setFormData] = useState<Partial<TechnicalQuestion>>({
        question_text: '',
        type: 'MCQ',
        options: ['', ''],
        correct_answer: '',
        expected_answer: '',
        marks: 5,
        difficulty: 'Basic',
        department: ''
    });

    useEffect(() => {
        fetchQuestions();
        fetchDepartments();
        fetchJobOpenings();
    }, []);

    const fetchJobOpenings = async () => {
        try {
            const res = await apiClient.get('/hr-operation/openings', {}, { withAuth: true });
            if (res.success && res.data) {
                // Filter only active openings
                setJobOpenings(res.data.filter((job: any) => job.status === 'Active' || job.status === 'Open'));
            }
        } catch (err) {
            console.error('Failed to load job openings', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await apiClient.get('/organization/departments', {}, { withAuth: true });
            // The API returns an array directly when no pagination params
            if (Array.isArray(res)) {
                setDepartments(res);
            } else if (res.departments) {
                setDepartments(res.departments);
            }
        } catch (err) {
            console.error('Failed to load departments', err);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await apiClient.get('/technical-questions/questions', {}, { withAuth: true });
            if (res.success) {
                setQuestions(res.data.map((q: any) => {
                    let parsedOptions: string[] = [];
                    if (q.options) {
                        if (Array.isArray(q.options)) {
                            parsedOptions = q.options;
                        } else if (typeof q.options === 'string') {
                            try {
                                parsedOptions = JSON.parse(q.options);
                                if (!Array.isArray(parsedOptions)) parsedOptions = [String(parsedOptions)];
                            } catch (e) {
                                // Fallback for CSV
                                parsedOptions = q.options.split(',').map((s: string) => s.trim()).filter(Boolean);
                            }
                        }
                    }
                    return {
                        ...q,
                        options: parsedOptions
                    };
                }));
            }
        } catch (err) {
            console.error('Failed to load questions', err);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.question_text || !formData.department) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.type === 'MCQ' && (!formData.options || formData.options.filter(o => o).length < 2)) {
            toast.error('MCQ must have at least 2 options');
            return;
        }

        if (formData.type === 'MCQ' && !formData.correct_answer) {
            toast.error('MCQ must have a correct answer');
            return;
        }

        try {
            const payload = {
                ...formData,
                options: formData.type === 'MCQ' ? formData.options?.filter(o => o) : undefined
            };

            if (editingQuestion) {
                await apiClient.put(`/technical-questions/questions/${editingQuestion.id}`, payload, { withAuth: true });
                toast.success('Question updated successfully');
            } else {
                await apiClient.post('/technical-questions/questions', payload, { withAuth: true });
                toast.success('Question created successfully');
            }

            closeModal();
            fetchQuestions();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save question');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            await apiClient.delete(`/technical-questions/questions/${id}`, { withAuth: true });
            toast.success('Question deleted successfully');
            fetchQuestions();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete question');
        }
    };

    const handleAiGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiPrompt || !aiDepartment) {
            toast.error('Prompt and Department are required');
            return;
        }

        setAiLoading(true);
        setAddedQuestionIndexes([]);
        try {
            const res = await apiClient.post('/technical-questions/ai-generate', {
                prompt: aiPrompt,
                department: aiDepartment,
                type: aiType,
                count: aiCount,
                jobRole: aiJobRole,
                jobDescription: aiJobDescription
            }, { withAuth: true });

            if (res.success && res.data) {
                setGeneratedQuestions(res.data);
                toast.success('Questions generated successfully!');
            }
        } catch (err) {
            console.error('AI Gen Error:', err);
            toast.error('Failed to generate questions. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAddGeneratedQuestion = async (q: any, index: number) => {
        const payload = {
            question_text: q.question_text || '',
            type: q.type || 'MCQ',
            options: q.options && q.options.length >= 2 ? q.options : undefined,
            correct_answer: q.correct_answer || '',
            expected_answer: q.expected_answer || '',
            marks: q.marks || 5,
            difficulty: q.difficulty || 'Basic',
            department: q.department || aiDepartment
        };

        try {
            await apiClient.post('/technical-questions/questions', payload, { withAuth: true });
            toast.success('Question added successfully!');
            setAddedQuestionIndexes(prev => [...prev, index]);
            fetchQuestions(); // Silently refresh main list
        } catch (err) {
            console.error(err);
            toast.error('Failed to save generated question');
        }
    };

    const addOption = () => {
        setFormData((prev) => ({
            ...prev,
            options: [...(prev.options || []), '']
        }));
    };

    const removeOption = (index: number) => {
        if (formData.options && formData.options.length <= 2) {
            toast.error('An MCQ must have at least 2 options');
            return;
        }
        setFormData((prev) => ({
            ...prev,
            options: prev.options?.filter((_, i) => i !== index),
            // Reset correct_answer if the deleted option was it
            correct_answer: prev.correct_answer === prev.options?.[index] ? '' : prev.correct_answer
        }));
    };

    const openModal = (question?: TechnicalQuestion) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({
                question_text: question.question_text,
                type: question.type,
                options: question.options && question.options.length > 1 ? question.options : ['', ''],
                correct_answer: question.correct_answer || '',
                expected_answer: question.expected_answer || '',
                marks: question.marks,
                difficulty: question.difficulty,
                department: question.department
            });
        } else {
            setEditingQuestion(null);
            setFormData({
                question_text: '',
                type: 'MCQ',
                options: ['', ''],
                correct_answer: '',
                expected_answer: '',
                marks: 5,
                difficulty: 'Basic',
                department: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingQuestion(null);
        setFormData({
            question_text: '',
            type: 'MCQ',
            options: ['', ''],
            correct_answer: '',
            expected_answer: '',
            marks: 5,
            difficulty: 'Basic',
            department: ''
        });
    };

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDepartment = !filterDepartment || q.department === filterDepartment;
        const matchesDifficulty = !filterDifficulty || q.difficulty === filterDifficulty;
        const matchesType = !filterType || q.type === filterType;

        return matchesSearch && matchesDepartment && matchesDifficulty && matchesType;
    });

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Basic': return 'bg-green-50 text-green-700 border-green-100';
            case 'Intermediate': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'Advanced': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Technical Questions</h1>
                    <p className="mt-1 text-sm text-gray-500 font-medium">Manage interview technical assessment questions</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white font-medium rounded-xl hover:bg-gray-900 transition-all text-sm shadow-sm"
                >
                    <Plus size={18} /> Create Question
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                        />
                    </div>
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:bg-white transition-all appearance-none"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:bg-white transition-all appearance-none"
                    >
                        <option value="">All Difficulties</option>
                        <option value="Basic">Basic</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:bg-white transition-all appearance-none"
                    >
                        <option value="">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="Descriptive">Descriptive</option>
                    </select>
                </div>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700 text-sm">Question Bank</h3>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                        {filteredQuestions.length} Questions
                    </span>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-gray-400 font-medium animate-pulse">Loading Questions...</div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                            <FileText className="text-gray-400" size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">No Questions Found</h3>
                        <p className="text-sm text-gray-500 mt-1">Create your first technical question to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredQuestions.map((question) => (
                            <div key={question.id} className="p-5 hover:bg-gray-50/80 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${getDifficultyColor(question.difficulty)}`}>
                                                {question.difficulty}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100/50">
                                                {question.type}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100/50">
                                                {question.department}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200/50">
                                                {question.marks} marks
                                            </span>
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm">{question.question_text}</p>
                                        {question.type === 'MCQ' && question.options && (
                                            <div className="mt-3 space-y-1.5 pl-1 text-sm">
                                                {question.options.map((option, idx) => (
                                                    <div key={idx} className={`flex items-center gap-2 ${option === question.correct_answer ? 'font-medium text-green-700' : 'text-gray-500'}`}>
                                                        {option === question.correct_answer ? (
                                                            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                                                        ) : (
                                                            <div className="w-3.5 flex items-center justify-center">
                                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                            </div>
                                                        )}
                                                        <span><span className="text-gray-400 mr-1">{String.fromCharCode(65 + idx)}.</span> {option}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {question.type === 'Descriptive' && question.expected_answer && (
                                            <div className="mt-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 text-sm">
                                                <span className="font-semibold text-gray-500 block mb-1">Expected Answer:</span>
                                                <span className="text-gray-700 whitespace-pre-wrap">{question.expected_answer}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openModal(question)}
                                            className="p-2 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-black shadow-sm border border-transparent hover:border-gray-200"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(question.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-all text-gray-400 hover:text-red-600 shadow-sm border border-transparent hover:border-red-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingQuestion ? 'Edit Question' : 'Create New Question'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Configure assessment question details
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Question Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700">Question Type <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${formData.type === 'MCQ' ? 'border-black bg-gray-50 ring-1 ring-black/5' : 'border-gray-200 hover:border-gray-400'}`}>
                                        <input
                                            type="radio"
                                            name="type"
                                            className="hidden"
                                            checked={formData.type === 'MCQ'}
                                            onChange={() => setFormData({ ...formData, type: 'MCQ' })}
                                        />
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.type === 'MCQ' ? 'border-black' : 'border-gray-300'}`}>
                                            {formData.type === 'MCQ' && <div className="w-2 h-2 bg-black rounded-full" />}
                                        </div>
                                        <span className="font-medium text-sm text-gray-900">Multiple Choice</span>
                                    </label>
                                    <label className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${formData.type === 'Descriptive' ? 'border-black bg-gray-50 ring-1 ring-black/5' : 'border-gray-200 hover:border-gray-400'}`}>
                                        <input
                                            type="radio"
                                            name="type"
                                            className="hidden"
                                            checked={formData.type === 'Descriptive'}
                                            onChange={() => setFormData({ ...formData, type: 'Descriptive' })}
                                        />
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.type === 'Descriptive' ? 'border-black' : 'border-gray-300'}`}>
                                            {formData.type === 'Descriptive' && <div className="w-2 h-2 bg-black rounded-full" />}
                                        </div>
                                        <span className="font-medium text-sm text-gray-900">Descriptive</span>
                                    </label>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700">Question Text <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    placeholder="Enter the question..."
                                    value={formData.question_text}
                                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 min-h-[100px] transition-all resize-y"
                                />
                            </div>

                            {/* Expected Answer for Descriptive */}
                            {formData.type === 'Descriptive' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-700">Expected Answer / Key Points</label>
                                    <textarea
                                        placeholder="Enter the expected points or a sample answer..."
                                        value={formData.expected_answer || ''}
                                        onChange={(e) => setFormData({ ...formData, expected_answer: e.target.value })}
                                        className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 min-h-[120px] transition-all resize-y"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">This will be used to help evaluate candidate answers.</p>
                                </div>
                            )}

                            {/* MCQ Options */}
                            {formData.type === 'MCQ' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-700">Answer Options <span className="text-red-500">*</span></label>
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add Option
                                        </button>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                        {formData.options?.map((option, idx) => (
                                            <div key={idx} className="flex items-center gap-2 sm:gap-3 group">
                                                <span className="w-7 h-7 shrink-0 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-semibold text-gray-600 text-xs shadow-sm">
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder={`Option text...`}
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(formData.options || [])];
                                                        newOptions[idx] = e.target.value;
                                                        setFormData({ ...formData, options: newOptions });
                                                    }}
                                                    className="flex-1 min-w-0 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all shadow-sm"
                                                    required
                                                />
                                                <label className={`flex shrink-0 items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all shadow-sm ${formData.correct_answer === option && option ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white hover:border-green-400 text-gray-500 hover:bg-gray-50'}`}>
                                                    <input
                                                        type="radio"
                                                        name="correct_answer"
                                                        className="hidden"
                                                        checked={formData.correct_answer === option && option !== ''}
                                                        onChange={() => setFormData({ ...formData, correct_answer: option })}
                                                    />
                                                    <CheckCircle2 size={16} className={formData.correct_answer === option && option !== '' ? 'text-green-600' : 'text-gray-300'} />
                                                    <span className="text-xs font-semibold hidden sm:inline">Correct</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(idx)}
                                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-transparent text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all opacity-50 hover:opacity-100"
                                                    title="Remove Option"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Department */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700">Department <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all appearance-none"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept: any) => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Difficulty & Marks */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-700">Difficulty <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all appearance-none"
                                    >
                                        <option value="Basic">Basic</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-700">Marks <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={formData.marks}
                                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                >
                                    <Save size={16} />
                                    {editingQuestion ? 'Update Question' : 'Create Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating TuneSync AI Button */}
            <button
                onClick={() => setIsAiModalOpen(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full shadow-xl hover:shadow-2xl hover:bg-gray-900 transition-all flex items-center justify-center transform hover:scale-105 z-40 overflow-hidden border border-gray-800"
                title="TuneSync AI Generator"
            >
                <img src="/tunesync_ai.png" alt="TuneSync AI" className="w-full h-full object-cover" />
            </button>

            {/* TuneSync AI Chat/Generator Popup */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-transparent sm:pointer-events-none z-50 flex items-center sm:items-end sm:justify-end sm:p-6 justify-center p-4">
                    {/* Dark overlay for mobile only, transparent for desktop */}
                    <div className="absolute inset-0 bg-black/40 sm:hidden pointer-events-auto" onClick={() => setIsAiModalOpen(false)}></div>

                    <div className="bg-white sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-md h-[85vh] sm:h-[600px] border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300 pointer-events-auto relative z-10">
                        {/* AI Header */}
                        <div className="bg-black p-5 shrink-0 flex items-center justify-between text-white rounded-t-2xl sm:rounded-t-3xl border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-700 bg-gray-900">
                                    <img src="/tunesync_ai.png" alt="AI Icon" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold tracking-tight">TuneSync AI</h3>
                                    <p className="text-gray-400 text-xs font-medium">Question Generator</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAiModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* AI Content/Chat Area */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-6">
                            {/* Generator Form */}
                            <form onSubmit={handleAiGenerate} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</label>
                                    <select
                                        required
                                        value={aiDepartment}
                                        onChange={(e) => setAiDepartment(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all appearance-none"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((dept: any) => (
                                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Role (Optional)</label>

                                    {/* Dropdown for existing Job Openings */}
                                    {jobOpenings.length > 0 && (
                                        <select
                                            value={selectedJobId}
                                            onChange={(e) => {
                                                const jobId = e.target.value;
                                                setSelectedJobId(jobId);
                                                if (jobId) {
                                                    const job = jobOpenings.find(j => j.id.toString() === jobId);
                                                    if (job) {
                                                        setAiJobRole(job.title);
                                                        setAiJobDescription(job.description || '');
                                                    }
                                                } else {
                                                    setAiJobRole('');
                                                    setAiJobDescription('');
                                                }
                                            }}
                                            className="w-full px-3.5 py-2.5 mb-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all appearance-none"
                                        >
                                            <option value="">-- Select from Active Jobs --</option>
                                            {jobOpenings.map(job => (
                                                <option key={job.id} value={job.id}>{job.title}</option>
                                            ))}
                                        </select>
                                    )}

                                    <input
                                        type="text"
                                        placeholder="e.g. Senior Frontend Developer"
                                        value={aiJobRole}
                                        onChange={(e) => {
                                            setAiJobRole(e.target.value);
                                            setSelectedJobId(''); // Custom input
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                                    />
                                </div>

                                {aiJobRole && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Description (Optional)</label>
                                        <textarea
                                            placeholder="Paste the Job Description to tailor the questions (Optional)"
                                            value={aiJobDescription}
                                            onChange={(e) => setAiJobDescription(e.target.value)}
                                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 min-h-[80px] transition-all resize-y"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</label>
                                        <select
                                            value={aiType}
                                            onChange={(e) => setAiType(e.target.value as any)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all appearance-none"
                                        >
                                            <option value="MCQ">MCQ</option>
                                            <option value="Descriptive">Descriptive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Count</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={aiCount}
                                            onChange={(e) => setAiCount(parseInt(e.target.value) || 5)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Topic / Prompt</label>
                                    <textarea
                                        required
                                        placeholder="e.g. Generate questions about React hooks and context..."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-black/10 focus:border-gray-400 min-h-[80px] transition-all resize-y"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={aiLoading}
                                    className="w-full py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
                                >
                                    {aiLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Generating...</>
                                    ) : (
                                        <><Sparkles size={16} /> Generate Questions</>
                                    )}
                                </button>
                            </form>

                            {/* Generated Results */}
                            {generatedQuestions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated Results</span>
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                    </div>

                                    <div className="space-y-3 pb-8">
                                        {generatedQuestions.map((gq, idx) => (
                                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm group hover:border-gray-400 transition-all">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200/50 uppercase">
                                                                {gq.type}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200/50 uppercase">
                                                                {gq.difficulty}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-800 line-clamp-3 mb-2 leading-relaxed">
                                                            {gq.question_text}
                                                        </p>

                                                        {gq.type === 'MCQ' && gq.options && (
                                                            <div className="text-xs text-gray-500 mb-2 truncate">
                                                                Options: {gq.options.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {addedQuestionIndexes.includes(idx) ? (
                                                    <button
                                                        disabled
                                                        className="w-full mt-2 py-2 bg-green-50 text-green-700 font-medium text-sm rounded-xl border border-green-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
                                                    >
                                                        <CheckCircle2 size={16} /> Added
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddGeneratedQuestion(gq, idx)}
                                                        className="w-full mt-2 py-2 bg-gray-50 hover:bg-black hover:text-white text-black font-medium text-sm rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Plus size={16} /> Direct Add
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
