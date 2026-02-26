import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, RotateCcw, TrendingUp, TrendingDown, Minus, Loader2, ChevronDown } from 'lucide-react';
import { SIM_API } from '../api/gaiaApi';

interface PolicyResult {
    analysis: string;
    policy_used: Record<string, number>;
    baseline: Record<string, number>;
    projected: Record<string, number>;
    weather: { available: boolean; temperature_forecast_c?: number[]; precipitation_forecast_mm?: number[] };
    delta: Record<string, number>;
    timestep: number;
}

interface Message {
    role: 'user' | 'assistant';
    text: string;
    result?: PolicyResult;
}

const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY ?? '';

const SUGGESTIONS = [
    'Should I implement a carbon tax in Chennai?',
    'What happens if we expand the metro and bus network?',
    'Can a water pricing reform improve resource efficiency?',
    'Is a renewable energy policy advisable given the weather?',
    'Simulate the impact of a combined transport + carbon policy',
];

function DeltaBadge({ value, label }: { value: number; label: string }) {
    const positive = value > 0;
    const zero = Math.abs(value) < 0.0001;
    // For SDG: positive delta is good. For emissions/vulnerability/stress: negative is good
    const isGoodMetric = label.includes('sdg');
    const isGood = isGoodMetric ? positive : !positive;

    const color = zero ? 'text-zinc-500' : isGood ? 'text-emerald-400' : 'text-red-400';
    const Icon = zero ? Minus : positive ? TrendingUp : TrendingDown;

    return (
        <div className="flex items-center justify-between text-[9px] py-1 border-b border-white/5 last:border-0">
            <span className="text-zinc-500 capitalize">{label.replace(/_/g, ' ')}</span>
            <span className={`font-mono font-bold flex items-center gap-1 ${color}`}>
                <Icon size={9} />
                {value > 0 ? '+' : ''}{value.toFixed(4)}
            </span>
        </div>
    );
}

function MarkdownText({ text }: { text: string }) {
    const lines = text.split('\n');
    return (
        <div className="text-[10px] leading-relaxed text-zinc-300 space-y-1">
            {lines.map((line, i) => {
                if (line.startsWith('## ')) return <p key={i} className="text-[11px] font-bold text-white mt-2">{line.slice(3)}</p>;
                if (line.startsWith('### ')) return <p key={i} className="text-[10px] font-bold text-purple-300 mt-1">{line.slice(4)}</p>;
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>;
                if (line.startsWith('- ')) return <p key={i} className="flex gap-1.5"><span className="text-purple-400 mt-0.5">•</span><span>{line.slice(2)}</span></p>;
                if (line.trim() === '') return <div key={i} className="h-1" />;
                // Inline bold
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={i}>
                        {parts.map((part, j) =>
                            part.startsWith('**') ? <strong key={j} className="text-white">{part.slice(2, -2)}</strong> : part
                        )}
                    </p>
                );
            })}
        </div>
    );
}

interface PolicyChatProps {
    onSimulate?: (policy: Record<string, number>) => void;
}

export default function PolicyChat({ onSimulate }: PolicyChatProps) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState(GEMINI_KEY);
    const [showKeyInput, setShowKeyInput] = useState(!GEMINI_KEY);
    const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (question?: string) => {
        const q = (question ?? input).trim();
        if (!q || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setLoading(true);

        try {
            const res = await fetch(`${SIM_API}/api/policy-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q, gemini_api_key: apiKey || undefined }),
                signal: AbortSignal.timeout(20000),
            });

            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data: PolicyResult = await res.json();

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: data.analysis,
                result: data,
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `⚠️ Error: ${err instanceof Error ? err.message : 'Request failed'}`,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => setMessages([]);

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl shadow-purple-900/50 text-[11px] font-mono uppercase tracking-widest transition-all hover:scale-105"
            >
                <Brain size={14} />
                Policy Advisor
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 z-50 w-[400px] h-[580px] flex flex-col bg-[#0c0c1e]/97 border border-purple-500/20 rounded-tl-2xl shadow-2xl shadow-purple-900/30 backdrop-blur-xl font-mono">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                        <Brain size={12} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">GAIA Policy Advisor</p>
                        <p className="text-[8px] text-purple-400/70">GNN simulation + Gemini 2.0 Flash</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={clear} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Clear chat">
                        <RotateCcw size={12} />
                    </button>
                    <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* API key row */}
            {showKeyInput && (
                <div className="px-3 py-2 bg-yellow-500/5 border-b border-yellow-500/10 flex items-center gap-2">
                    <input
                        className="flex-1 bg-transparent text-[9px] text-yellow-200 placeholder:text-yellow-500/40 outline-none"
                        placeholder="Gemini API key (optional — needed for LLM analysis)"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                    />
                    <button onClick={() => setShowKeyInput(false)} className="text-[8px] text-yellow-500/60 hover:text-yellow-400">
                        hide
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">

                {messages.length === 0 && (
                    <div className="py-4">
                        <p className="text-[9px] text-zinc-600 text-center mb-3 uppercase tracking-widest">Ask about a policy for Chennai</p>
                        <div className="space-y-1.5">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} onClick={() => send(s)}
                                    className="w-full text-left text-[9px] text-zinc-500 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-lg px-3 py-2 transition-all">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'user' ? (
                            <div className="bg-purple-600/20 border border-purple-500/20 rounded-xl rounded-tr-sm px-3 py-2 text-[10px] text-purple-100 max-w-[85%]">
                                {msg.text}
                            </div>
                        ) : (
                            <div className="w-full space-y-2">
                                {/* LLM analysis */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-xl rounded-tl-sm px-3 py-2">
                                    <MarkdownText text={msg.text} />
                                </div>

                                {/* Simulation delta cards */}
                                {msg.result && Object.keys(msg.result.delta).length > 0 && (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[8px] text-zinc-600 uppercase tracking-widest">
                                                Simulation Δ (5-step GNN projection)
                                            </p>
                                            <button
                                                onClick={() => {
                                                    console.log("[PolicyChat] Simulate This clicked with policy:", msg.result!.policy_used);
                                                    setAppliedIndex(i);
                                                    onSimulate?.(msg.result!.policy_used);
                                                    setTimeout(() => setAppliedIndex(null), 3000);
                                                }}
                                                className={`px-2 py-1 border text-[8px] rounded transition-all flex items-center gap-1 ${appliedIndex === i
                                                        ? 'bg-emerald-500 text-white border-emerald-400 scale-105 shadow-lg shadow-emerald-500/20'
                                                        : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30'
                                                    }`}
                                            >
                                                {appliedIndex === i ? <RotateCcw size={10} className="animate-spin" /> : <TrendingUp size={10} />}
                                                {appliedIndex === i ? 'Applied' : 'Simulate This'}
                                            </button>
                                        </div>
                                        {Object.entries(msg.result.delta).map(([k, v]) => (
                                            <DeltaBadge key={k} label={k} value={v} />
                                        ))}
                                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[8px] text-zinc-600">
                                            <span>Policies: {Object.keys(msg.result.policy_used).join(', ')}</span>
                                            <span>t={msg.result.timestep}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Weather forecast mini-chart */}
                                {msg.result?.weather?.available && (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
                                        <p className="text-[8px] text-zinc-600 uppercase mb-2 tracking-widest">7-Day Weather Forecast</p>
                                        <div className="flex items-end gap-1 h-10">
                                            {(msg.result.weather.temperature_forecast_c ?? []).map((v, j) => (
                                                <div key={j} className="flex-1 flex flex-col items-center">
                                                    <div className="w-full bg-orange-500/30 rounded-sm border border-orange-500/20"
                                                        style={{ height: `${((v - 25) / 15) * 32 + 8}px` }} />
                                                    <span className="text-[6px] text-zinc-600 mt-0.5">{v.toFixed(0)}°</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-[9px] text-purple-400">
                        <Loader2 size={11} className="animate-spin" />
                        Running GNN simulation + calling Gemini...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
                <input
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="Ask about a policy…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    disabled={loading}
                />
                <button
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-lg transition-colors"
                >
                    <Send size={12} className="text-white" />
                </button>
            </div>
        </div>
    );
}
