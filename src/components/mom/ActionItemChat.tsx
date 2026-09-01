"use client";

import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { X, Send, User, Clock, CheckCheck, Paperclip, Image as ImageIcon, FileText, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socket';

interface Message {
    id: number;
    employee_id: number;
    first_name: string;
    last_name: string;
    message: string;
    attachment_url?: string;
    created_at: string;
}

interface ActionItemChatProps {
    isOpen: boolean;
    onClose: () => void;
    pointId: number | null;
}

export default function ActionItemChat({ isOpen, onClose, pointId }: ActionItemChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && pointId) {
            fetchMessages();
            markAsSeen();

            // Socket Integration
            const socket = getSocket();
            if (socket) {
                socket.emit('join_point', pointId);

                const handleNewMessage = (data: any) => {
                    if (data.point_id === pointId) {
                        // Check if message already exists to avoid duplicates
                        setMessages(prev => {
                            const exists = prev.some(m =>
                                (m.id && data.id && m.id === data.id) ||
                                (m.message === data.message && m.employee_id === data.sender_id &&
                                    Math.abs(new Date(m.created_at).getTime() - new Date(data.created_at).getTime()) < 2000)
                            );
                            if (exists) return prev;

                            return [...prev, {
                                id: data.id || Date.now(),
                                employee_id: data.sender_id,
                                first_name: data.sender_name?.split(' ')[0] || 'User',
                                last_name: data.sender_name?.split(' ')[1] || '',
                                message: data.message,
                                attachment_url: data.attachment_url,
                                created_at: data.created_at
                            }];
                        });
                    }
                };

                socket.on('new_message', handleNewMessage);

                return () => {
                    socket.emit('leave_point', pointId);
                    socket.off('new_message', handleNewMessage);
                };
            }
        }
    }, [isOpen, pointId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        if (!pointId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/mom/point/discussion/${pointId}`, undefined, { withAuth: true });
            if (res.success) {
                setMessages(res.messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsSeen = async () => {
        if (!pointId) return;
        try {
            await apiClient.put(`/mom/point/discussion/${pointId}/seen`, {}, { withAuth: true });
        } catch (e) { }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile || !pointId) return;

        try {
            setLoading(true);
            let res;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('message', newMessage);
                formData.append('attachment', selectedFile);

                res = await apiClient.post(`/mom/point/discussion/${pointId}/send`, formData, {
                    withAuth: true
                });
            } else {
                res = await apiClient.post(`/mom/point/discussion/${pointId}/send`, {
                    message: newMessage
                }, {
                    withAuth: true
                });
            }

            if (res.success) {
                setNewMessage('');
                setSelectedFile(null);
                fetchMessages();
            } else {
                toast.error(res.message || 'Failed to send message');
            }
        } catch (error) {
            toast.error('Error sending message');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 leading-none">Discussion</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Point Thread</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Messages Panel */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50"
                >
                    {loading && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-10">
                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                                <MessageSquare size={18} className="text-gray-300" />
                            </div>
                            <h3 className="text-[13px] font-black text-gray-900 uppercase">No messages yet</h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">Start a conversation</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isSystem = msg.message?.startsWith('[System]') || msg.first_name === 'System' || msg.message?.startsWith('📌') || msg.message?.startsWith('📅');
                            if (isSystem) {
                                const cleanText = msg.message.replace(/^\[System\]\s*/, '').replace(/^[📌📅]\s*/, '');
                                return (
                                    <div key={msg.id} className="flex justify-center my-1 animate-in fade-in duration-200">
                                        <div className="bg-gray-100/90 text-gray-700 text-xs px-3 py-1.5 rounded-lg border border-gray-200/70 flex items-center gap-2 max-w-[95%] shadow-2xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span className="font-medium text-gray-800 leading-snug">{cleanText}</span>
                                            <span className="text-[10px] text-gray-400 font-normal shrink-0">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-5 rounded-md bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-black uppercase">
                                                {msg.first_name?.[0]}{msg.last_name?.[0]}
                                            </div>
                                            <span className="text-[12px] font-black text-gray-900 uppercase tracking-tight">{msg.first_name} {msg.last_name}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="bg-white rounded-md p-3 text-[13px] text-gray-700 leading-relaxed border border-gray-100 shadow-sm group">
                                        {msg.message && <p className="mb-2 last:mb-0">{msg.message}</p>}

                                        {msg.attachment_url && (
                                            <div className="mt-2 pt-2 border-t border-gray-50">
                                                <a
                                                    href={msg.attachment_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors group/file"
                                                >
                                                    <div className="size-8 bg-white rounded border border-slate-200 flex items-center justify-center shrink-0">
                                                        {msg.attachment_url.match(/\.(jpeg|jpg|png|gif|webp)$/i)
                                                            ? <ImageIcon size={14} className="text-emerald-500" />
                                                            : <FileText size={14} className="text-blue-500" />}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-[11px] font-black text-slate-700 truncate">View Attachment</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Click to open</p>
                                                    </div>
                                                    <Download size={14} className="text-slate-300 group-hover/file:text-slate-600" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                        {selectedFile && (
                            <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-md border border-blue-100/50 animate-in slide-in-from-bottom-1">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="size-6 bg-white rounded border border-blue-100 flex items-center justify-center shrink-0">
                                        <Paperclip size={12} className="text-blue-600" />
                                    </div>
                                    <span className="text-[11px] font-black text-blue-700 truncate max-w-[200px]">{selectedFile.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1 text-blue-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full bg-slate-50 border border-gray-200 rounded-md px-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none pr-12 min-h-[80px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            />

                            <div className="absolute right-2 bottom-2 flex flex-col gap-1">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Add Attachment"
                                >
                                    <Paperclip size={16} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedFile(file);
                                    }}
                                />

                                <button
                                    type="submit"
                                    className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                    disabled={(!newMessage.trim() && !selectedFile) || loading}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3 text-center opacity-60">
                        Enter to send • Shift + Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}

// Ensure MessageSquare is imported - actually added it in the group import
