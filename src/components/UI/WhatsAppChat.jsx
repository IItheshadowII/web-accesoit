import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import apiFetch from '../../lib/api';

const WhatsAppChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '¡Hola! Soy el asistente virtual de AccesoIT. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [sessionId, setSessionId] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Ensure a persistent chat session id to link appointments
        try {
            const key = 'accesoit_chat_session';
            let sid = localStorage.getItem(key);
            if (!sid) {
                sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
                localStorage.setItem(key, sid);
            }
            setSessionId(sid);
        } catch (err) {
            console.warn('Could not access localStorage for sessionId', err);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await apiFetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    sessionId
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Lo siento, hubo un error. Por favor intenta nuevamente.'
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Error de conexión. Verifica que el servidor esté corriendo.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div>
            {/* Floating Button - Always stays in same position */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    background: '#22c55e',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    padding: '16px',
                    boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                whileHover={{ scale: 1.1, background: '#16a34a' }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: '24px',
                            zIndex: 9998,
                            width: '384px',
                            height: '500px',
                            backgroundColor: '#111827',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(to right, #16a34a, #22c55e)',
                            padding: '16px',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MessageCircle style={{ color: '#16a34a' }} size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 'bold', margin: 0 }}>AccesoIT AI</h3>
                                    <p style={{ fontSize: '12px', color: '#dcfce7', margin: 0 }}>Asistente Virtual</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{
                            height: '360px',
                            overflowY: 'auto',
                            padding: '16px',
                            backgroundColor: '#0a0a0f'
                        }}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        marginBottom: '12px'
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: '75%',
                                            padding: '8px 16px',
                                            borderRadius: '16px',
                                            backgroundColor: msg.role === 'user' ? '#16a34a' : '#1f2937',
                                            color: msg.role === 'user' ? 'white' : '#f3f4f6',
                                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                            borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    >
                                        <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                                >
                                    <div style={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        padding: '8px 16px',
                                        borderRadius: '16px',
                                        borderBottomLeftRadius: '4px'
                                    }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '100%' }}>
                                            {[0, 1, 2].map((dot) => (
                                                <motion.div
                                                    key={dot}
                                                    style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        backgroundColor: '#9ca3af',
                                                        borderRadius: '50%'
                                                    }}
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: dot * 0.2
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#111827',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Escribe tu mensaje..."
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#1f2937',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '24px',
                                        padding: '8px 16px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    style={{
                                        backgroundColor: isLoading || !input.trim() ? '#374151' : '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        padding: '8px',
                                        cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppChat;
