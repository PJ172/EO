'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquare, FileText, BarChart2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là trợ lý E-Office AI. Tôi có thể giúp bạn tra cứu quy định, soạn tờ trình hoặc phân tích dữ liệu nhân sự. Bạn cần hỗ trợ gì không?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('AI execution failed');
      
      const data = await response.json();
      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Xin lỗi, có lỗi xảy ra khi kết nối với AI. Vui lòng kiểm tra GEMINI_API_KEY trong file .env hoặc thử lại sau.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const dragThreshold = 5; // Pixels to distinguish drag from click
  const [hasMoved, setHasMoved] = useState(false);

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    initialPos.current = { x: position.x, y: position.y };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const dx = dragStartPos.current.x - clientX;
      const dy = dragStartPos.current.y - clientY;
      
      if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
        setHasMoved(true);
      }

      // Calculate new position
      let newX = initialPos.current.x + dx;
      let newY = initialPos.current.y + dy;

      // Constraints: prevent going off-screen
      // Icon is 64x64 (w-16 h-16), initial margin is 24px
      const margin = 24;
      const iconSize = 64;
      
      // Right/Bottom bounds
      newX = Math.max(-margin, newX);
      newY = Math.max(-margin, newY);
      
      // Left/Top bounds
      const maxX = window.innerWidth - iconSize - margin;
      const maxY = window.innerHeight - iconSize - margin;
      
      newX = Math.min(newX, maxX);
      newY = Math.min(newY, maxY);

      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging]);

  const toggleOpen = () => {
    if (!hasMoved) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div 
      className="fixed z-50 flex flex-col items-end touch-none"
      style={{ 
        bottom: `${24 + position.y}px`, 
        right: `${24 + position.x}px`,
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[560px] rounded-[2rem] border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-500 shadow-primary/10">
          {/* Header */}
          <div className="relative overflow-hidden p-6 bg-gradient-to-br from-primary via-primary/80 to-primary/95 text-white flex-shrink-0 border-b border-white/10">
            {/* Decorative dots */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '16px 16px'
              }}
            />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <Bot size={24} className="text-white drop-shadow-md" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-primary ring-2 ring-emerald-500/20"></span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">AI Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">Online Now</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-all hover:rotate-90 duration-300"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm transition-all animate-scale-in",
                  msg.role === 'user' 
                    ? "bg-primary text-white rounded-tr-none shadow-primary/10 font-medium" 
                    : "bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-white/5 text-foreground rounded-tl-none backdrop-blur-sm"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="bg-white/70 dark:bg-slate-800/70 border border-white/20 p-4 rounded-3xl rounded-tl-none flex gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-primary/30 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions - Floating styles */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { icon: <Search size={12} />, label: 'Quy định nghỉ phép' },
              { icon: <FileText size={12} />, label: 'Soạn tờ trình IT' },
              { icon: <BarChart2 size={12} />, label: 'Phân tích nhân sự' }
            ].map((action, idx) => (
              <button 
                key={idx}
                onClick={() => setInput(action.label)}
                className="flex-shrink-0 px-4 py-2 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
              >
                <span className="flex items-center gap-2">
                  {action.icon}
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-5 pt-0">
            <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[1.5rem] p-1 shadow-inner group focus-within:ring-2 focus-within:ring-primary/20 transition-all transition-duration-300">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Hỏi AI bất kỳ điều gì..."
                className="w-full pl-5 pr-14 py-3.5 bg-transparent border-none text-sm focus:outline-none placeholder:text-slate-400 font-medium"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-1 top-1 bottom-1 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-30 disabled:shadow-none hover:bg-primary/90 transition-all active:scale-90 group-hover:scale-105"
              >
                <Send size={18} className="rotate-12" />
              </button>
            </div>
            <p className="text-[9px] text-center text-muted-foreground mt-3 font-medium opacity-60">
              AI có thể trả lời sai. Vui lòng kiểm tra lại thông tin quan trọng.
            </p>
          </div>
        </div>
      )}

      {/* FAB - Premium Toggle */}
      <button
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onClick={toggleOpen}
        className={cn(
          "relative w-16 h-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center transition-all duration-500 group overflow-hidden cursor-move active:scale-95",
          isOpen 
            ? "bg-slate-900 text-white" 
            : "bg-primary text-white shadow-primary/40 hover:-translate-y-2"
        )}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        {isOpen ? <X size={28} className="animate-in spin-in-90 duration-300" /> : <MessageSquare size={28} />}
        
        {!isOpen && (
          <div className="absolute top-2 right-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-sm"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
