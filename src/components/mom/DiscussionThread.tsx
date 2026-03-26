"use client";

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getSocket } from '@/lib/socket';
import { Send, Paperclip, User, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Message {
    id?: number;
    point_id: number;
    sender_id: number;
    sender_name: string;
    message: string;
    attachment_url?: string;
    created_at: string;
}

interface DiscussionThreadProps {
    pointId: number;
    initialMessages: Message[];
    status: string;
    onStatusUpdate: (newStatus: string) => void;
    canClose: boolean;
    assigneeName: string;
}

export default function DiscussionThread({
    pointId,
    initialMessages,
    status,
    onStatusUpdate,
    canClose,
    assigneeName
}: DiscussionThreadProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [socket, setSocket] = useState<any>(null);
    const { user, employee } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const newSocket = getSocket();
        if (!newSocket) return;

        const join = () => {
            console.log(`🔌 Joining point room: ${pointId}`);
            newSocket.emit('join_point', pointId);
        };

        if (newSocket.connected) {
            join();
        }

        newSocket.on('connect', join);

        const onNewMessage = (msg: Message) => {
            console.log('🔌 Received new_message:', msg);
            if (msg.point_id === pointId) {
                setMessages(prev => [...prev, msg]);
            }
        };

        const onStatusUpdated = (data: { point_id: number, status: string }) => {
            console.log('🔌 Received status_updated:', data);
            if (data.point_id === pointId) {
                onStatusUpdate(data.status);
            }
        };

        newSocket.on('new_message', onNewMessage);
        newSocket.on('status_updated', onStatusUpdated);

        return () => {
            newSocket.off('connect', join);
            newSocket.emit('leave_point', pointId);
            newSocket.off('new_message', onNewMessage);
            newSocket.off('status_updated', onStatusUpdated);
        };
    }, [pointId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            const res = await apiClient.post('/mom/discussion/message', {
                point_id: pointId,
                message: newMessage
            });

            if (res.success) {
                const msgObj: Message = {
                    point_id: pointId,
                    sender_id: employee?.id || 0,
                    sender_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Me',
                    message: newMessage,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, msgObj]);
                setNewMessage('');

                // Also update status to 'acknowledged' if it was 'open' and sender is assignee
                if (status === 'open') {
                    handleUpdateStatus('acknowledged');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const res = await apiClient.post('/mom/discussion/status', {
                point_id: pointId,
                status: newStatus
            });
            if (res.success) {
                onStatusUpdate(newStatus);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
            {/* Thread Header */}
            <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-gray-900">Discussion Thread</h4>
                    <p className="text-xs text-gray-500">Assigned to: {assigneeName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'closed' ? 'bg-green-100 text-green-700' :
                        status === 'reverted' ? 'bg-red-100 text-red-700' :
                            status === 'acknowledged' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {status}
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="text-center py-10">
                        <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No messages yet. Start the discussion!</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.sender_id === employee?.id;
                        return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 px-1">
                                        {!isMe && <span className="text-[10px] font-bold text-gray-500">{msg.sender_name}</span>}
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-black text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
                                        }`}>
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>


        </div>
    );
}

const MessageSquare = ({ className, size = 24 }: { className?: string; size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
