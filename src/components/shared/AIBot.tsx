"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, X, Send, Paperclip, Loader2, FileText, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Message {
    role: "user" | "bot";
    content: string;
    file?: {
        name: string;
        type: string;
    };
}

export default function AIBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "Hello! I'm your TeamTuned AI assistant. How can I help you today? You can ask me to generate checklists or analyze documents." }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() && !selectedFile) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            file: selectedFile ? { name: selectedFile.name, type: selectedFile.type } : undefined
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        const fileToUpload = selectedFile;
        setSelectedFile(null);
        setIsTyping(true);

        try {
            let response;
            if (fileToUpload) {
                const formData = new FormData();
                formData.append("file", fileToUpload);
                formData.append("prompt", input || "Analyze this document");

                response = await apiClient<any>("/ai/chat", {
                    method: "POST",
                    body: formData,
                    withAuth: true
                });
            } else {
                response = await apiClient<any>("/ai/chat", {
                    method: "POST",
                    body: { prompt: input },
                    withAuth: true
                });
            }

            setMessages(prev => [...prev, {
                role: "bot",
                content: response?.answer || "I've processed your request. Let me know if you need anything else!"
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: "bot",
                content: "Sorry, I encountered an error. Please try again later."
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right animate-in fade-in slide-in-from-bottom-4">
                    {/* Header */}
                    <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500 rounded-xl">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold">TeamTuned AI</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-xs text-indigo-100">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-indigo-500 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200"
                    >
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] p-4 rounded-3xl ${msg.role === "user"
                                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                                            : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm"
                                        }`}
                                >
                                    {msg.file && (
                                        <div className={`mb-2 flex items-center gap-2 p-2 rounded-xl text-sm ${msg.role === "user" ? "bg-indigo-500" : "bg-slate-100"}`}>
                                            <FileText size={16} />
                                            <span className="truncate max-w-[150px]">{msg.file.name}</span>
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-200">
                        {selectedFile && (
                            <div className="mb-3 flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                                        <CheckCircle size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">{selectedFile.name}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1 text-slate-400 hover:text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Attach file"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls,.pdf"
                            />
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type your message..."
                                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() && !selectedFile}
                                className={`p-2.5 rounded-xl shadow-md transition-all ${input.trim() || selectedFile
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                                    }`}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-center text-slate-400">
                            AI can make mistakes. Please verify important info.
                        </p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group ${isOpen ? "bg-slate-800 rotate-90" : "bg-indigo-600"
                    }`}
            >
                {isOpen ? (
                    <X className="text-white" size={24} />
                ) : (
                    <div className="relative">
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-indigo-600 animate-pulse"></div>
                        <Sparkles className="text-white group-hover:rotate-12 transition-transform" size={24} />
                    </div>
                )}
            </button>
        </div>
    );
}
