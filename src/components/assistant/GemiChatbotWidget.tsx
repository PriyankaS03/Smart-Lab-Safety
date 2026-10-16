import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  Key,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Activity,
  Wind
} from 'lucide-react';
import { GemiMessage, DashboardStats, RiskLevel } from '../../types';
import { api } from '../../services/api';

interface GemiChatbotWidgetProps {
  stats?: DashboardStats | null;
  onNavigate?: (tab: any) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

export const GemiChatbotWidget: React.FC<GemiChatbotWidgetProps> = ({
  stats,
  onNavigate,
  externalPrompt,
  onClearExternalPrompt
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [keySaved, setKeySaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<GemiMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: `👋 **Hello! I am Gemi, your Intelligent Lab Safety & Compliance Co-Pilot.**

I'm connected to your laboratory vision streams and environmental sensors. How can I help ensure safety today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      emergency_level: 'NORMAL',
      suggested_prompts: [
        'What should I do during a chemical spill?',
        'What PPE is mandatory in synthesis bays?',
        'Check current lab sensor telemetry',
        'Emergency response for laboratory fire'
      ]
    }
  ]);

  // Handle external prompt passed from Dashboard
  useEffect(() => {
    if (externalPrompt) {
      setIsOpen(true);
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Speech Recognition setup
  useEffect(() => {
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SRClass) {
      const sr = new SRClass();
      sr.continuous = false;
      sr.interimResults = false;
      sr.lang = 'en-US';
      sr.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInput(text);
        setIsListening(false);
      };
      sr.onend = () => setIsListening(false);
      sr.onerror = () => setIsListening(false);
      recognitionRef.current = sr;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis || !voiceEnabled) return;
    const clean = text.replace(/[*#_`]/g, '').slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: GemiMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.askGemi({
        question: query,
        history,
        apiKey: apiKey.trim() || undefined,
        labContext: stats ? {
          risk_level: stats.current_risk_level,
          risk_score: stats.current_risk_score,
          active_alerts_count: stats.active_alerts_count,
          compliance_percentage: stats.ppe_compliance_percentage
        } : undefined
      });

      const assistantMsg: GemiMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        actions: res.suggested_actions,
        emergency_level: res.emergency_level,
        suggested_prompts: res.suggested_prompts,
        model_used: res.model_used
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (voiceEnabled) {
        speakText(res.answer);
      }
    } catch (err) {
      console.error('Gemi chatbot error:', err);
      const errorMsg: GemiMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `I encountered an unexpected issue connecting to the AI safety engine. Please verify your connection or standard safety documents.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emergency_level: 'NORMAL',
        suggested_prompts: [
          'What is the chemical spill procedure?',
          'What PPE is required?'
        ]
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: `Conversation cleared. I am ready for your lab safety queries.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emergency_level: 'NORMAL',
        suggested_prompts: [
          'What PPE is required in the laboratory?',
          'How to handle an acid spill',
          'What are current sensor readings?'
        ]
      }
    ]);
  };

  // Markdown renderer for assistant messages
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{trimmed.replace('### ', '')}</span>
              </h4>
            );
          }
          if (trimmed.startsWith('#### ')) {
            return (
              <h5 key={idx} className="font-semibold text-slate-900 text-xs mt-1.5 mb-0.5 text-indigo-950">
                {trimmed.replace('#### ', '')}
              </h5>
            );
          }
          if (trimmed.startsWith('> ')) {
            return (
              <div key={idx} className="p-2 rounded-lg bg-amber-50/80 border-l-2 border-amber-500 text-amber-900 text-[11px] my-1">
                {trimmed.replace('> ', '')}
              </div>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const raw = trimmed.replace(/^[-*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                <span dangerouslySetInnerHTML={{ __html: formatInline(raw) }} />
              </div>
            );
          }
          if (/^\d+\./.test(trimmed)) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1 font-medium">
                <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200/60">$1</code>');
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Pulsing Helper Tooltip Pill */}
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full border border-indigo-200 shadow-md text-xs font-semibold text-indigo-900 cursor-pointer hover:bg-white hover:shadow-lg transition-all"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ask Gemi AI</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Gemi Chatbot"
            className="group relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-white/20"
          >
            <Bot className="w-7 h-7 text-white transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] font-bold text-white items-center justify-center">
                ✨
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Main Chatbot Flyout Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 bg-white shadow-2xl rounded-3xl border border-slate-200/90 flex flex-col overflow-hidden backdrop-blur-xl ${
            isExpanded
              ? 'inset-4 sm:inset-8 w-auto h-auto'
              : 'bottom-6 right-6 w-[94vw] sm:w-[420px] h-[610px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-indigo-800/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white">Gemi AI Assistant</h3>
                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/30 text-indigo-200 text-[10px] font-medium border border-indigo-400/30">
                    {apiKey ? 'Gemini 2.5 Active' : 'Lab Safety Core'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/80">Safety & Protocol Specialist</p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? 'Mute Speech' : 'Enable Voice Responses'}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${voiceEnabled ? 'text-emerald-400' : 'text-slate-400'}`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowKeyModal(!showKeyModal)}
                title="Configure Gemini API Key"
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${apiKey ? 'text-amber-400' : 'text-slate-400'}`}
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore Size' : 'Maximize'}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block text-slate-400 hover:text-white"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-rose-500/30 hover:text-rose-300 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gemini API Key Drawer / Modal */}
          {showKeyModal && (
            <div className="p-3 bg-indigo-50/90 border-b border-indigo-100 text-xs shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-indigo-950 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  Gemini API Key Configuration
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-600 mb-2">
                Supply your Google Gemini API key to enable full unrestricted cloud intelligence. If omitted, Gemi runs on high-precision offline Lab SOP rules.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempApiKey}
                  onChange={e => setTempApiKey(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1"
                >
                  {keySaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{keySaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Real-time Status Badge Strip */}
          <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Lab Risk: <strong className="text-slate-800">{stats?.current_risk_level || 'LOW'} ({stats?.current_risk_score.toFixed(0) || '18'}/100)</strong></span>
              </span>
              <span>·</span>
              <span>PPE: <strong className="text-emerald-700">{stats?.ppe_compliance_percentage || '94'}%</strong></span>
            </div>
            {stats && stats.active_alerts_count > 0 && (
              <button
                onClick={() => onNavigate && onNavigate('alerts')}
                className="text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{stats.active_alerts_count} Active Alerts</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-white to-slate-50/50">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
                >
                  <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[85%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mb-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200/80 rounded-bl-xs text-slate-800'
                      }`}
                    >
                      {/* Emergency Tag if relevant */}
                      {!isUser && msg.emergency_level && msg.emergency_level !== 'NORMAL' && (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 ${
                            msg.emergency_level === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : msg.emergency_level === 'URGENT'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{msg.emergency_level} EMERGENCY ADVISORY</span>
                        </div>
                      )}

                      {/* Content */}
                      {isUser ? (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        renderFormattedContent(msg.content)
                      )}

                      {/* Action Steps Checklist */}
                      {!isUser && msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            Action Checklist:
                          </span>
                          <div className="space-y-1">
                            {msg.actions.map((act, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-start gap-1.5 p-1.5 rounded-md bg-indigo-50/50 text-[11px] text-indigo-950 border border-indigo-100/60"
                              >
                                <span className="font-mono text-indigo-600 font-bold shrink-0">{aIdx + 1}.</span>
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cited Sources */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-400">Cited SOPs:</span>
                          {msg.sources.slice(0, 2).map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] border border-slate-200/80"
                            >
                              {src.document_title} · {src.section}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom row: model, timestamp, copy & speak */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono">{msg.timestamp}</span>
                        <div className="flex items-center gap-2">
                          {!isUser && msg.model_used && (
                            <span className="text-[9px] text-slate-400 italic">
                              {msg.model_used.includes('Gemini') ? '☁️ Gemini' : '⚙️ Core'}
                            </span>
                          )}
                          {!isUser && (
                            <>
                              <button
                                onClick={() => speakText(msg.content)}
                                title="Listen to answer"
                                className="hover:text-indigo-600 cursor-pointer p-0.5"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                title="Copy response"
                                className="hover:text-indigo-600 cursor-pointer p-0.5"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Suggested Prompt Chips */}
                  {!isUser && msg.suggested_prompts && msg.suggested_prompts.length > 0 && (
                    <div className="mt-2 ml-9 flex flex-wrap gap-1.5 max-w-[85%]">
                      {msg.suggested_prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(p)}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 text-[11px] font-medium border border-slate-200/80 transition-all text-left cursor-pointer flex items-center gap-1"
                        >
                          <span>{p}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 ml-9 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs max-w-xs">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Gemi is synthesizing laboratory safety guidance...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Carousel above input */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Quick:
            </span>
            {[
              '🚨 Spill Protocol',
              '🥽 Required PPE',
              '🔥 Fire Response',
              '💨 Gas Leak',
              '🌡️ Sensor Telemetry'
            ].map((label, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(label.replace(/^[^\w]+/, '').trim())}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] border border-slate-200/80 transition-all shrink-0 cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Stop Listening' : 'Voice Input'}
                className={`p-2.5 rounded-xl border transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isListening ? 'Listening to speech...' : 'Ask Gemi about lab safety, hazards, or SOPs...'}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send Message"
                className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102 active:scale-98 transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
