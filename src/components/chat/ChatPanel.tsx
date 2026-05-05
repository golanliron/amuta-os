'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import FishLogo from './FishLogo';
import type { ChatMessage } from '@/types';
import { FISHGOLD_WELCOME, getRandomLoadingPhrase } from '@/lib/ai/fishgold';

interface ChatPanelProps {
  orgId: string | null;
  userId: string | null;
  onStageChange?: (stage: number) => void;
}

export default function ChatPanel({ orgId, userId, onStageChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: FISHGOLD_WELCOME,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load last conversation on mount - Fishgold remembers you
  useEffect(() => {
    if (!orgId || !userId || loaded) return;

    async function loadLastConversation() {
      try {
        const res = await fetch(`/api/conversations?org_id=${orgId}&user_id=${userId}`);
        const data = await res.json();

        if (data.conversation?.messages?.length > 0) {
          const restored: ChatMessage[] = data.conversation.messages.map(
            (m: { role: string; content: string; timestamp?: string }, i: number) => ({
              id: `restored-${i}`,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp || data.conversation.updated_at,
            })
          );

          // Add a "memory" separator so the user knows this is from last time
          const memoryMsg: ChatMessage = {
            id: 'memory-separator',
            role: 'assistant',
            content: 'אני זוכר אותך. הנה המשך השיחה האחרונה שלנו:',
            timestamp: new Date().toISOString(),
          };

          setMessages([memoryMsg, ...restored]);
          setConversationId(data.conversation.id);
        }
      } catch {
        // First visit or error - keep welcome message
      } finally {
        setLoaded(true);
      }
    }

    loadLastConversation();
  }, [orgId, userId, loaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const sendMessage = useCallback(async (externalText?: string) => {
    const text = (externalText || input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!externalText) setInput('');
    setIsStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Start streaming assistant response
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          org_id: orgId,
          user_id: userId,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulated += data.text;
                const snapshot = accumulated;
                setMessages(prev =>
                  prev.map((msg, i) =>
                    i === prev.length - 1 && msg.role === 'assistant'
                      ? { ...msg, content: snapshot }
                      : msg
                  )
                );
              }
              if (data.done && data.conversation_id) {
                setConversationId(data.conversation_id);
              }
            } catch {
              // skip malformed SSE
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && !last.content) {
          last.content = 'משהו השתבש. נסי שוב.';
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, conversationId, orgId, userId]);

  // Expose sendMessage to sidebar via window for cross-component communication
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (text) sendMessageRef.current(text);
    };
    window.addEventListener('fishgold:send', handler);
    return () => window.removeEventListener('fishgold:send', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !orgId) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('org_id', orgId);

      const uploadMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `[מעלה קובץ: ${file.name}]`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, uploadMsg]);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.error || `לא הצלחתי לקרוא את "${file.name}". נסי פורמט אחר.`,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, errorMsg]);
          continue;
        }

        onStageChange?.(1);

        // Now ask Fishgold to respond intelligently about what he learned
        const fishgoldMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, fishgoldMsg]);
        setIsStreaming(true);

        // Send the upload summary to Fishgold so he can analyze it
        const fields = data.extracted_fields ? JSON.stringify(data.extracted_fields, null, 2) : '';
        const chatPrompt = `[קובץ: "${file.name}" | קטגוריה: ${data.category || '?'}]
סיכום: ${data.summary || 'לא זמין'}
נתונים: ${fields || 'אין'}

תגיב ב-5 שורות מקסימום. שורה 1: מה זה. שורות 2-3: נתונים חדשים שנכנסו (מספרים בלבד). שורה 4: מה חסר. שורה 5: הצעה אחת לפעולה.`;

        try {
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: chatPrompt,
              conversation_id: conversationId,
              org_id: orgId,
              user_id: userId,
            }),
          });

          const reader = chatRes.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            let buffer = '';
            let accumulated = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const d = JSON.parse(line.slice(6));
                  if (d.text) {
                    accumulated += d.text;
                    const snapshot = accumulated;
                    setMessages(prev =>
                      prev.map((msg, i) =>
                        i === prev.length - 1 && msg.role === 'assistant'
                          ? { ...msg, content: snapshot }
                          : msg
                      )
                    );
                  }
                  if (d.done && d.conversation_id) {
                    setConversationId(d.conversation_id);
                  }
                } catch { /* skip */ }
              }
            }
          }
        } catch {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant' && !last.content) {
              last.content = `קראתי את "${file.name}". המידע נכנס לזיכרון.`;
            }
            return updated;
          });
        } finally {
          setIsStreaming(false);
        }
      } catch {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `לא הצלחתי לקרוא את "${file.name}". נסי שוב או העלי בפורמט אחר.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    }

    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 fade-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 mt-1">
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center">
                  <FishLogo size={24} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-surf2 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-surf border border-border rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && isStreaming && msg === messages[messages.length - 1] && !msg.content && (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-[11px] text-muted italic">{getRandomLoadingPhrase()}</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-bg2 p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* File upload */}
          <label className="flex-shrink-0 cursor-pointer p-2 rounded-lg hover:bg-surf2 transition-colors text-muted hover:text-accent">
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
              onChange={handleFileUpload}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </label>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="כתבי ל-Fishgold..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-surf px-4 py-3 pr-12 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 p-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
