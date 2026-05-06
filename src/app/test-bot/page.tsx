'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  time: string;
}

export default function TestBotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState('972501234567');
  const [name, setName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: input,
      time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text: input, name }),
      });

      // The bot saves its response in whatsapp_messages table
      // Fetch the latest bot response
      await new Promise(r => setTimeout(r, 2000)); // Wait for Claude to respond

      const res = await fetch(`/api/whatsapp/history?phone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        const botMessages = data.messages?.filter((m: { role: string }) => m.role === 'assistant') || [];
        const lastBot = botMessages[botMessages.length - 1];
        if (lastBot) {
          setMessages(prev => {
            // Avoid duplicates
            const lastPrev = prev[prev.length - 1];
            if (lastPrev?.role === 'bot' && lastPrev?.text === lastBot.content) return prev;
            return [...prev, {
              role: 'bot',
              text: lastBot.content,
              time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            }];
          });
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `שגיאה: ${e instanceof Error ? e.message : 'Unknown'}`,
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-[#0b141a] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EE7A30] flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <div className="text-white font-medium">Goldfish</div>
            <div className="text-xs text-gray-400">סימולציה — לא נשלח לוואטסאפ אמיתי</div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#111b21] px-4 py-2 flex gap-2 text-xs">
          <input
            className="bg-[#1f2c34] text-gray-300 rounded px-2 py-1 w-1/2 text-xs"
            placeholder="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <input
            className="bg-[#1f2c34] text-gray-300 rounded px-2 py-1 w-1/2 text-xs"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto px-4 py-3 space-y-2 bg-[#0b141a]"
          style={{ backgroundImage: 'url("data:image/svg+xml,...")', backgroundSize: 'cover' }}>
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-20">
              שלחו הודעה כדי להתחיל
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#005c4b] text-white'
                  : 'bg-[#1f2c34] text-gray-100'
              }`}>
                {msg.text}
                <div className="text-[10px] text-gray-400 text-left mt-1">{msg.time}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-[#1f2c34] rounded-lg px-4 py-2 text-gray-400 text-sm">
                מקליד...
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="bg-[#1f2c34] px-3 py-2 flex gap-2 items-center">
          <input
            className="flex-1 bg-[#2a3942] text-white rounded-full px-4 py-2 text-sm focus:outline-none"
            placeholder="הקלידו הודעה..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <p className="text-gray-500 text-xs mt-4 text-center">
        דף בדיקה פנימי — הבוט רץ בדיוק כמו בוואטסאפ אמיתי, רק בלי Green API
      </p>
    </div>
  );
}
