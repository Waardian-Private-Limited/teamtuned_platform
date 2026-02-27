"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { Timer, Send, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TechnicalTestPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = params.token as string;
    const orgId = searchParams.get('orgId');

    const [loading, setLoading] = useState(true);
    const [testData, setTestData] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);

    // Tracking Metrics
    const [trackingMetrics, setTrackingMetrics] = useState({
        tabSwitches: 0,
        timeTakenMins: 0,
        questionMetrics: {} as Record<number, { optionChanges: number, copyPastes: number }>
    });

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Tab visibility tracking
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && !submitted) {
                setTrackingMetrics(prev => ({
                    ...prev,
                    tabSwitches: prev.tabSwitches + 1
                }));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [submitted]);

    useEffect(() => {
        if (!token || !orgId) {
            setError('Invalid test link. Missing parameters.');
            setLoading(false);
            return;
        }

        fetchTestDetails();
    }, [token, orgId]);

    const fetchTestDetails = async () => {
        try {
            const res = await apiClient.get(`/technical-assessments/public/test/${token}`, { orgId });
            if (res.success) {
                setTestData(res.data);
                setTimeLeft(res.data.assignment.time_limit_mins * 60);
                startTimer();
            } else {
                setError(res.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load test details');
        } finally {
            setLoading(false);
        }
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleAnswerChange = (questionId: number, answer: string, isMCQ: boolean = false) => {
        setAnswers(prev => {
            const isChanged = prev[questionId] !== undefined && prev[questionId] !== answer;
            if (isMCQ && isChanged) {
                setTrackingMetrics(m => {
                    const qMetrics = m.questionMetrics[questionId] || { optionChanges: 0, copyPastes: 0 };
                    return {
                        ...m,
                        questionMetrics: {
                            ...m.questionMetrics,
                            [questionId]: { ...qMetrics, optionChanges: qMetrics.optionChanges + 1 }
                        }
                    };
                });
            }
            return { ...prev, [questionId]: answer };
        });
    };

    const handlePaste = (questionId: number) => {
        setTrackingMetrics(m => {
            const qMetrics = m.questionMetrics[questionId] || { optionChanges: 0, copyPastes: 0 };
            return {
                ...m,
                questionMetrics: {
                    ...m.questionMetrics,
                    [questionId]: { ...qMetrics, copyPastes: qMetrics.copyPastes + 1 }
                }
            };
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (submitting || submitted) return;

        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const timeTaken = testData ? (testData.assignment.time_limit_mins * 60 - timeLeft) / 60 : 0;
            const finalMetrics = { ...trackingMetrics, timeTakenMins: parseFloat(timeTaken.toFixed(2)) };

            const res = await apiClient.post(`/technical-assessments/public/test/${token}/submit`, {
                orgId,
                answers,
                trackingMetrics: finalMetrics
            });
            if (res.success) {
                setSubmitted(true);
                setScore(res.score);
                toast.success('Test submitted successfully!');
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const safeParseOptions = (options: any): string[] => {
        if (!options) return [];
        if (Array.isArray(options)) return options;
        try {
            const parsed = JSON.parse(options);
            return Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch (e) {
            // Fallback for comma separated strings
            if (typeof options === 'string') {
                return options.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [];
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-red-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500 font-medium mb-8">{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-black text-white rounded-md font-black uppercase tracking-widest hover:bg-gray-900 transition-all">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lowercase">
                <div className="bg-white p-12 rounded-md shadow-2xl max-w-xl w-full text-center border border-green-100 animate-in zoom-in duration-500 flex flex-col items-center">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                        <Award className="text-green-500" size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Test Completed!</h2>
                    <p className="text-gray-500 font-bold mb-8 text-lg">Your responses have been securely saved. Our recruitment team will review them and get back to you shortly.</p>

                    <div className="p-8 w-full bg-gray-50 rounded-md border border-gray-100 mb-8">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Candidate</div>
                        <div className="text-xl font-black text-gray-900">{testData.assignment.candidate_name}</div>
                        <div className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Position</div>
                        <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">{testData.assignment.position_name}</div>
                    </div>

                    <button disabled className="w-full py-5 bg-green-500 text-white rounded-md font-black uppercase tracking-widest shadow-xl shadow-green-200 flex items-center justify-center gap-3">
                        <CheckCircle2 size={24} /> Application in Review
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black rounded-md flex items-center justify-center shadow-lg transform -rotate-6">
                            <span className="text-white font-black text-xl">T</span>
                        </div>
                        <div>
                            <h1 className="font-black text-gray-900 leading-none">Technical Assessment</h1>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{testData.assignment.position_name}</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-3 px-6 py-2.5 rounded-md border font-black text-lg transition-all ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-gray-50 text-gray-900 border-gray-100 shadow-inner'
                        }`}>
                        <Timer size={20} />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <div className="mb-12">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Technical Proficiency Test</h2>
                    <p className="mt-2 text-gray-500 font-medium">Please answer all questions carefully.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {testData.questions.map((q: any, index: number) => (
                        <div key={q.id} className="bg-white rounded-md p-10 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start gap-6">
                                <span className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-md flex items-center justify-center font-black text-gray-400 border border-gray-200">
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">{q.difficulty}</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">{q.question_text}</p>

                                    {q.type === 'MCQ' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {safeParseOptions(q.options).map((opt: string, i: number) => (
                                                <label key={i} className={`relative cursor-pointer transition-all duration-200 group`}>
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        value={opt}
                                                        onChange={() => handleAnswerChange(q.id, opt, true)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className={`p-4 rounded-md border-2 font-bold shadow-sm transition-all group-active:scale-95 ${answers[q.id] === opt ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'}`}>
                                                        <span className={`inline-block w-8 h-8 rounded-sm border mr-3 text-center leading-8 text-xs font-black shadow-inner ${answers[q.id] === opt ? 'bg-green-100 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-600'}`}>
                                                            {String.fromCharCode(65 + i)}
                                                        </span>
                                                        {opt}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            placeholder="Type your detailed answer here..."
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            onPaste={() => handlePaste(q.id)}
                                            className="w-full p-6 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black font-medium leading-relaxed min-h-[150px] transition-all"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="pt-10">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-6 bg-black text-white rounded-md font-black uppercase tracking-widest text-lg shadow-2xl shadow-black/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-4"
                        >
                            {submitting ? (
                                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send size={24} /> Submit Final Assessment
                                </>
                            )}
                        </button>
                        <p className="text-center mt-6 text-gray-400 font-bold text-sm">By submitting, you confirm that this work is entirely your own.</p>
                    </div>
                </form>
            </main>

            {/* Powered By TeamTuned Footer */}
            <div className="fixed bottom-4 right-6 flex items-center gap-2 text-gray-400 opacity-60 hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-50 pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-widest">Powered By</span>
                <span className="text-xs font-black text-black">TeamTuned</span>
            </div>
        </div>
    );
}
