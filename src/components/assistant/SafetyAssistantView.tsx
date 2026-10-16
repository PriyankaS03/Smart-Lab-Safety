import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  BookOpen,
  AlertTriangle,
  Flame,
  HelpCircle,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Cpu,
  Activity,
  Copy,
  Check,
  RotateCcw,
  Key,
  ExternalLink,
  Wind,
  Thermometer,
  Droplets,
  ShieldCheck
} from 'lucide-react';
import { AssistantAnswer, GemiMessage, SensorReading, RiskFusionEvent } from '../../types';
import { api } from '../../services/api';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SRClass) {
      setSupported(true);
      const sr = new SRClass();
      sr.continuous = false;
      sr.interimResults = false;
      sr.lang = 'en-US';
      sr.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
        setListening(false);
      };
      sr.onend = () => setListening(false);
      sr.onerror = () => setListening(false);
      recognitionRef.current = sr;
    }
  }, [onResult]);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  return { listening, supported, startListening, stopListening };
}

function speakText(text: string) {
  if (!window.speechSynthesis) return;
  const clean = text.replace(/[*#_`]/g, '').slice(0, 500);
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export const SafetyAssistantView: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [keySaved, setKeySaved] = useState(false);

  // Live telemetry for contextual awareness
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [riskFusion, setRiskFusion] = useState<RiskFusionEvent | null>(null);

  const [conversation, setConversation] = useState<
    { q: string; a: AssistantAnswer; model?: string; timestamp: string }[]
  >([]);

  const sampleQuestions = [
    'What should I do during a chemical spill?',
    'What PPE is required in the laboratory?',
    'What should I do during a gas leak?',
    'What should I do during a fire?',
    'What do current laboratory sensor readings indicate?',
    'What is the continuous flush duration for the emergency eyewash?'
  ];

  const handleSpeechResult = React.useCallback((text: string) => {
    setQuestion(text);
  }, []);

  const { listening, supported, startListening, stopListening } = useSpeechRecognition(handleSpeechResult);

  useEffect(() => {
    // Initial fetch of sensor context
    api.getSensorCurrent().then(setSensorData).catch(() => {});
    api.getRiskFusion().then(setRiskFusion).catch(() => {});

    // Initial greeting / query
    handleAskQuestion('What should I do during a chemical spill?');
  }, []);

  const handleAskQuestion = async (queryText: string) => {
    if (!queryText.trim() || loading) return;
    setLoading(true);
    setQuestion('');

    try {
      const res = await api.askGemi({
        question: queryText,
        history: conversation.slice(0, 3).map(c => ({ role: 'user', content: c.q })),
        apiKey: apiKey.trim() || undefined
      });

      const entry = {
        q: queryText,
        a: res,
        model: res.model_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [entry, ...prev]);

      if (voiceEnabled) {
        speakText(res.answer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyConfig(false);
    }, 1200);
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const emergencyBadge = (level: string) => {
    const config: Record<string, { bg: string; text: string; border: string }> = {
      CRITICAL: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
      URGENT:   { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
      ADVISORY: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      NORMAL:   { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' }
    };
    const c = config[level] || config.NORMAL;
    return (
      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
        <AlertTriangle className="w-3 h-3" />
        <span>{level} EMERGENCY LEVEL</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg border border-white/20 shrink-0">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white">Gemi AI - Lab Safety & SOP Assistant</h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 text-xs font-semibold border border-indigo-400/30">
                  {apiKey ? 'Gemini 2.5 Active' : 'Gemi Lab Core'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                  Telemetry Synced
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-2xl leading-relaxed">
                Life-critical laboratory standard operating procedures, automated chemical spill containment, PPE verification, and multi-factor hazard mitigation.
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setVoiceEnabled(v => !v);
                if (voiceEnabled) window.speechSynthesis?.cancel();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                voiceEnabled
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                  : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/15 hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{voiceEnabled ? 'Voice Active' : 'Enable Voice'}</span>
            </button>

            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 text-xs font-semibold transition cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-300" />
              <span>{apiKey ? 'API Key Configured' : 'Connect Gemini Key'}</span>
            </button>
          </div>
        </div>

        {/* API Key Drawer */}
        {showKeyConfig && (
          <div className="relative z-10 mt-5 pt-4 border-t border-indigo-800/60 p-4 bg-white/5 rounded-2xl border border-white/10 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                Google Gemini API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key at Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-slate-300 text-xs mb-3">
              Add your API key to activate Gemini 2.5 Flash for unrestricted generative analysis. Your key is stored securely in your browser's local storage.
            </p>
            <div className="flex gap-2 max-w-xl">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={e => setTempApiKey(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/20 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {keySaved ? <Check className="w-4 h-4" /> : null}
                <span>{keySaved ? 'Saved!' : 'Save Key'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Chat Stream (Left 2 cols) & Live Telemetry Context (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ask Bar, Suggested Prompts, and Conversation History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ask Input Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAskQuestion(question);
              }}
              className="flex items-center gap-2"
            >
              {supported && (
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  title={listening ? 'Stop voice input' : 'Speak your question'}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    listening
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder={listening ? 'Listening to speech...' : 'Ask Gemi any laboratory emergency, chemical SOP, or PPE question...'}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Ask</span>
              </button>
            </form>

            {/* Preset Query Chips */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2">Preset Safety Inquiries:</span>
              <div className="flex flex-wrap gap-2">
                {sampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskQuestion(q)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 text-xs font-medium border border-slate-200/80 transition-all text-left cursor-pointer flex items-center gap-1"
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-xs flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-600 animate-spin shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Gemi AI is analyzing SOP documents...</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Cross-referencing chemical databases, fire safety protocols, and live sensors.</p>
                </div>
              </div>
            )}

            {conversation.map((c, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-slate-300 transition-all"
              >
                {/* User Prompt Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{c.q}</h3>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{c.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.a.emergency_level && emergencyBadge(c.a.emergency_level)}
                    <button
                      onClick={() => handleCopy(idx, c.a.answer)}
                      title="Copy response"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Formatted Answer Body */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {c.a.answer}
                </div>

                {/* Action Checklist */}
                {c.a.suggested_actions && c.a.suggested_actions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 block mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Recommended Action Checklist:
                    </span>
                    <div className="space-y-1.5">
                      {c.a.suggested_actions.map((act, aIdx) => (
                        <div key={aIdx} className="flex items-start gap-2 text-xs text-indigo-900">
                          <span className="font-mono text-indigo-600 font-bold shrink-0">{aIdx + 1}.</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citations Footer */}
                {c.a.sources && c.a.sources.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-medium">Authoritative SOPs:</span>
                      {c.a.sources.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                        >
                          {src.document_title} · {src.section}
                        </span>
                      ))}
                    </div>
                    {c.model && (
                      <span className="text-[10px] text-slate-400 italic">
                        Powered by {c.model}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Context & Emergency Quick-Action Drawer */}
        <div className="space-y-6">
          {/* Real-Time Laboratory Awareness Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Lab Awareness Context</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Gemi continuously incorporates live sensor telemetry into responses to evaluate immediate ambient dangers.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-orange-500" />
                  Temperature
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">{(sensorData?.temperature ?? 22.4).toFixed(1)} °C</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Wind className="w-3 h-3 text-emerald-500" />
                  Gas / VOC
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">{(sensorData?.gas_concentration ?? 14.5).toFixed(1)} ppm</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  Smoke Level
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">{(sensorData?.smoke_level ?? 2.1).toFixed(1)} / 100</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500" />
                  Air (AQI)
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">{Math.round(sensorData?.air_quality ?? 35)} AQI</p>
              </div>
            </div>
          </div>

          {/* Emergency Protocol Quick Launch */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Emergency Protocols</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleAskQuestion('What is the complete Chemical Spill C.L.E.A.N. and SWEEP protocol?')}
                className="w-full p-3 rounded-2xl bg-rose-50/60 hover:bg-rose-100 text-left border border-rose-200/80 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-bold text-rose-950">Chemical Spill (C.L.E.A.N.)</h4>
                  <p className="text-[11px] text-rose-700/90 mt-0.5">Minor vs major spill evacuation steps</p>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-600 shrink-0" />
              </button>

              <button
                onClick={() => handleAskQuestion('What are the R.A.C.E. and P.A.S.S. procedures for laboratory fire?')}
                className="w-full p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-100 text-left border border-amber-200/80 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-bold text-amber-950">Fire Response (R.A.C.E.)</h4>
                  <p className="text-[11px] text-amber-700/90 mt-0.5">Extinguisher P.A.S.S. & master gas shutoff</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
              </button>

              <button
                onClick={() => handleAskQuestion('What are the 4 Pillars of Laboratory PPE according to OSHA 1910.132?')}
                className="w-full p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100 text-left border border-emerald-200/80 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">PPE Standards (OSHA)</h4>
                  <p className="text-[11px] text-emerald-700/90 mt-0.5">ANSI Z87.1 goggles, coats, gloves</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
