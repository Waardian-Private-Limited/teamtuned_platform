"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, Edit2, Trash2, X, Save, FileText,
    CheckCircle2, AlertCircle, BookOpen, Target, Award
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface TechnicalQuestion {
    id: number;
    question_text: string;
    type: 'MCQ' | 'Descriptive';
    options?: string[];
    correct_answer?: string;
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

    // Form state
    const [formData, setFormData] = useState<Partial<TechnicalQuestion>>({
        question_text: '',
        type: 'MCQ',
        options: ['', '', '', ''],
        correct_answer: '',
        marks: 5,
        difficulty: 'Basic',
        department: ''
    });

    useEffect(() => {
        fetchQuestions();
        fetchDepartments();
    }, []);

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

    const openModal = (question?: TechnicalQuestion) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({
                question_text: question.question_text,
                type: question.type,
                options: question.options || ['', '', '', ''],
                correct_answer: question.correct_answer || '',
                marks: question.marks,
                difficulty: question.difficulty,
                department: question.department
            });
        } else {
            setEditingQuestion(null);
            setFormData({
                question_text: '',
                type: 'MCQ',
                options: ['', '', '', ''],
                correct_answer: '',
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
            options: ['', '', '', ''],
            correct_answer: '',
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
        <div className="space-y-8 p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Technical Questions</h1>
                    <p className="mt-1 text-gray-500 font-medium">Manage interview questions by department and difficulty</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider"
                >
                    <Plus size={18} /> Create Question
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5"
                    >
                        <option value="">All Difficulties</option>
                        <option value="Basic">Basic</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5"
                    >
                        <option value="">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="Descriptive">Descriptive</option>
                    </select>
                </div>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs">Questions Bank</h3>
                    <span className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded-full">
                        {filteredQuestions.length} Questions
                    </span>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Loading Questions...</div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">No Questions Found</h3>
                        <p className="text-gray-400 mt-2 font-medium">Create your first technical question to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredQuestions.map((question) => (
                            <div key={question.id} className="p-6 hover:bg-gray-50/50 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getDifficultyColor(question.difficulty)}`}>
                                                {question.difficulty}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                                {question.type}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                                                {question.department}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600">
                                                {question.marks} marks
                                            </span>
                                        </div>
                                        <p className="font-bold text-gray-900 mb-2">{question.question_text}</p>
                                        {question.type === 'MCQ' && question.options && (
                                            <div className="mt-3 space-y-1">
                                                {question.options.map((option, idx) => (
                                                    <div key={idx} className={`flex items-center gap-2 text-sm ${option === question.correct_answer ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                                                        {option === question.correct_answer && <CheckCircle2 size={14} className="text-green-600" />}
                                                        <span>{String.fromCharCode(65 + idx)}. {option}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(question)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-600 hover:text-black"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(question.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-all text-gray-600 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10 rounded-t-[32px]">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">
                                    {editingQuestion ? 'Edit Question' : 'Create New Question'}
                                </h2>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                    Fill in the details below
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-black">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Question Type */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Question Type *</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer border-2 rounded-2xl p-4 flex items-center gap-3 transition-all ${formData.type === 'MCQ' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-blue-200'}`}>
                                        <input
                                            type="radio"
                                            name="type"
                                            className="hidden"
                                            checked={formData.type === 'MCQ'}
                                            onChange={() => setFormData({ ...formData, type: 'MCQ' })}
                                        />
                                        <CheckCircle2 size={20} className={formData.type === 'MCQ' ? 'text-blue-600' : 'text-gray-300'} />
                                        <span className="font-black text-sm">Multiple Choice</span>
                                    </label>
                                    <label className={`cursor-pointer border-2 rounded-2xl p-4 flex items-center gap-3 transition-all ${formData.type === 'Descriptive' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 hover:border-purple-200'}`}>
                                        <input
                                            type="radio"
                                            name="type"
                                            className="hidden"
                                            checked={formData.type === 'Descriptive'}
                                            onChange={() => setFormData({ ...formData, type: 'Descriptive' })}
                                        />
                                        <FileText size={20} className={formData.type === 'Descriptive' ? 'text-purple-600' : 'text-gray-300'} />
                                        <span className="font-black text-sm">Descriptive</span>
                                    </label>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Question Text *</label>
                                <textarea
                                    required
                                    placeholder="Enter the question..."
                                    value={formData.question_text}
                                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5 min-h-[100px]"
                                />
                            </div>

                            {/* MCQ Options */}
                            {formData.type === 'MCQ' && (
                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Answer Options *</label>
                                    {formData.options?.map((option, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <input
                                                type="text"
                                                placeholder={`Option ${idx + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...(formData.options || [])];
                                                    newOptions[idx] = e.target.value;
                                                    setFormData({ ...formData, options: newOptions });
                                                }}
                                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-black/5"
                                            />
                                            <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.correct_answer === option && option ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                                                <input
                                                    type="radio"
                                                    name="correct_answer"
                                                    className="hidden"
                                                    checked={formData.correct_answer === option}
                                                    onChange={() => setFormData({ ...formData, correct_answer: option })}
                                                />
                                                <CheckCircle2 size={18} className={formData.correct_answer === option ? 'text-green-600' : 'text-gray-300'} />
                                                <span className="text-xs font-bold text-gray-600">Correct</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Department */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Department *</label>
                                <select
                                    required
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-black/5"
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
                                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Difficulty *</label>
                                    <select
                                        required
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-black/5"
                                    >
                                        <option value="Basic">Basic</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Marks *</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={formData.marks}
                                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-black/5"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {editingQuestion ? 'Update Question' : 'Create Question'}
                            </button>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    );
}
