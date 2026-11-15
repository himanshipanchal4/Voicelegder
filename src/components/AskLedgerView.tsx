import { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  ArrowRight,
  RefreshCw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Mic,
  MicOff,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Transaction } from "../types";
import { getCustomerSummaries } from "../utils/storage";
import { computeAccurateLedgerAnswer, LedgerAIAnswer } from "../utils/ledgerAI";
import { AIAgentAvatar } from "./AIAgentAvatar";

interface AskLedgerViewProps {
  transactions: Transaction[];
  onOpenLedgerWithFilter?: (query: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  query?: string;
  matchedTransactionIds?: string[];
  highlightMetric?: string;
  mode?: string;
  relatedCustomer?: string;
}

const categorizedQueries = {
  popular: [
    "Who owes me money?",
    "Show Sharma's unpaid transactions.",
    "How much did I sell today?",
    "What did Himanshi buy?",
  ],
  debtors: [
    "Who owes me more than ₹500?",
    "Which customers have pending Udhaar?",
    "Show all debtors sorted by amount",
    "Has Sharma cleared his balance?",
  ],
  customers: [
    "Show all transactions with Ramesh.",
    "What did Himanshi buy?",
    "How much has Sharma paid so far?",
    "Show customer balance for Vikram",
  ],
  sales: [
    "How much did I sell today?",
    "What are today's credit sales?",
    "How much cash did I collect?",
    "What is my total sales revenue?",
  ],
  items: [
    "Who bought Rice?",
    "How much Sugar was sold?",
    "Show purchases this week",
  ],
};

export function AskLedgerView({ transactions, onOpenLedgerWithFilter }: AskLedgerViewProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof categorizedQueries>("popular");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  const customerSummaries = getCustomerSummaries(transactions);

  // Initial welcome message from Munimji AI
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-welcome",
      sender: "ai",
      text: `Namaste! 🙏 I am **Munimji AI**, your personal shopkeeper financial assistant.\n\nI have complete real-time access to all **${transactions.length} records** in your ledger. Ask me any question in plain **Hindi, Hinglish, or English** about:\n• Customer Udhaar balances and payment status\n• Today's sales and cash collection\n• What specific customers bought\n• Item sales and outstanding debtor lists`,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      mode: "ledger-engine",
    },
  ]);

  // Check speech recognition support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN"; // Supports Indian English and transliterated Hindi

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          setIsListening(false);
          // Auto submit spoken query
          handleAsk(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleSpeechRecognition = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      }
    }
  };

  const handleSpeakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean markdown characters for TTS reading
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/•/g, ", ")
      .replace(/[#_*~`]/g, "")
      .replace(/₹/g, "Rupees ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to pick an Indian English or Hindi voice if available
    const voices = window.speechSynthesis.getVoices();
    const indVoice = voices.find(
      (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.name.includes("India")
    );
    if (indVoice) {
      utterance.voice = indVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q || isLoading) return;

    const userMessageId = "msg-user-" + Date.now();
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Add user message to conversation
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: q,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          transactions: transactions,
          customers: customerSummaries,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const aiMsg: ChatMessage = {
        id: "msg-ai-" + Date.now(),
        sender: "ai",
        text: data.answer || "Analyzed your ledger records.",
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        query: q,
        matchedTransactionIds: Array.isArray(data.matchedTransactionIds) ? data.matchedTransactionIds : [],
        highlightMetric: data.highlightMetric,
        mode: data.mode || "gemini",
        relatedCustomer: data.relatedCustomer,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("Server API failed, computing directly on client with accurate ledger engine:", err);
      // Client-side high-precision record engine fallback
      const localResult: LedgerAIAnswer = computeAccurateLedgerAnswer(q, transactions, customerSummaries);
      const aiMsg: ChatMessage = {
        id: "msg-ai-" + Date.now(),
        sender: "ai",
        text: localResult.answer,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        query: q,
        matchedTransactionIds: localResult.matchedTransactionIds,
        highlightMetric: localResult.highlightMetric,
        mode: "ledger-engine",
        relatedCustomer: localResult.relatedCustomer,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setMessages([
      {
        id: "msg-welcome-reset",
        sender: "ai",
        text: `Conversation cleared. I am ready for your next question! Ask about any customer, sale, or pending Udhaar.`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        mode: "ledger-engine",
      },
    ]);
  };

  return (
    <div id="ask-ledger-page" className="max-w-4xl mx-auto space-y-5 pb-16">
      {/* Top AI Agent Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-indigo-600/20 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
          {/* AI Agent Avatar with Live Status */}
          <AIAgentAvatar size="lg" state={isLoading ? "thinking" : isSpeaking ? "speaking" : "idle"} />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Munimji AI • Financial Assistant
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Ledger Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl">
              Ask questions about your shop’s sales, pending Udhaar, customer Khata, or items in plain Hindi, Hinglish, or English.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-[11px] text-indigo-300">
              <span className="flex items-center gap-1">
                <span className="font-bold text-white">{transactions.length}</span> Records Synced
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-white">{customerSummaries.length}</span> Customer Khatas
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-white">
                  ₹
                  {customerSummaries
                    .reduce((sum, c) => sum + c.totalOwed, 0)
                    .toLocaleString("en-IN")}
                </span>{" "}
                Active Udhaar
              </span>
            </div>
          </div>

          {messages.length > 2 && (
            <button
              onClick={clearChat}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-indigo-200 hover:text-white transition flex items-center gap-1.5 self-center sm:self-start cursor-pointer"
              title="Reset conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Conversation Stream */}
      <div className="bg-slate-50/70 rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs min-h-[380px] max-h-[560px] overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const matchedTxns = msg.matchedTransactionIds
            ? transactions.filter((t) => msg.matchedTransactionIds?.includes(t.id))
            : [];

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
            >
              {/* Avatar */}
              {isUser ? (
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white">
                  You
                </div>
              ) : (
                <AIAgentAvatar size="sm" state="idle" />
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-sm shadow-xs ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-xs"
                    : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-900 text-xs tracking-tight">Munimji AI</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                        {msg.mode === "gemini" ? "Gemini Verified" : "Ledger Record Engine"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="hover:text-indigo-600 transition p-1 cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSpeakText(msg.text)}
                        className={`hover:text-indigo-600 transition p-1 cursor-pointer ${
                          isSpeaking ? "text-indigo-600 animate-pulse" : ""
                        }`}
                        title={isSpeaking ? "Stop reading" : "Listen (Text to Speech)"}
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Text Content */}
                <div className={`whitespace-pre-line leading-relaxed font-normal ${isUser ? "text-white" : "text-slate-800"}`}>
                  {msg.text}
                </div>

                {/* Highlight Metric Pill if provided */}
                {msg.highlightMetric && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 font-extrabold text-xs border border-indigo-200/80">
                    <span>Key Record:</span>
                    <span className="text-indigo-700">{msg.highlightMetric}</span>
                  </div>
                )}

                {/* Matching Transactions Preview Cards */}
                {matchedTxns.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Related Ledger Records ({matchedTxns.length})
                      </span>
                      {onOpenLedgerWithFilter && (
                        <button
                          onClick={() => onOpenLedgerWithFilter(msg.relatedCustomer || matchedTxns[0].customer_name)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>Open in Ledger</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchedTxns.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs flex items-center justify-between transition"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{t.customer_name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                  t.payment_status === "paid"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {t.payment_status === "paid" ? "Paid" : "Udhaar"}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                              {t.items.map((i) => i.name).join(", ") || t.notes || "Record"} • {t.date}
                            </p>
                          </div>
                          <span className="font-black text-slate-900 text-xs">
                            ₹{t.total_amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-fade-in">
            <AIAgentAvatar size="sm" state="thinking" />
            <div className="bg-white border border-indigo-200 rounded-2xl rounded-tl-xs p-4 text-xs font-semibold text-slate-600 shadow-xs flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>Munimji AI is checking the ledger records and analyzing your data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips by Category */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-2">
            Try Asking:
          </span>
          {(
            [
              { key: "popular", label: "⚡ Popular" },
              { key: "debtors", label: "💳 Udhaar & Debtors" },
              { key: "customers", label: "👤 Customers" },
              { key: "sales", label: "📈 Sales & Cash" },
              { key: "items", label: "📦 Items" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === tab.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Prompts list for selected category */}
        <div className="flex flex-wrap gap-2">
          {categorizedQueries[activeCategory].map((suggested, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(suggested);
                handleAsk(suggested);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 text-xs font-semibold border border-slate-200 hover:border-indigo-200 transition text-left cursor-pointer flex items-center gap-1.5 group"
            >
              <span>“{suggested}”</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="sticky bottom-2 bg-white rounded-2xl border-2 border-indigo-200/80 shadow-lg p-2 flex items-center gap-2 focus-within:border-indigo-600 transition">
        {/* Voice Input Mic Button */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-3 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
            }`}
            title={isListening ? "Listening... (Click to stop)" : "Speak your question (Voice Input)"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center pl-1 text-slate-400">
          <Search className="w-5 h-5" />
        </div>

        <input
          id="natural-language-query-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder={
            isListening
              ? "Listening... speak your question now in Hindi or English"
              : "Ask anything about sales, udhaar, debtors, or items..."
          }
          className="w-full px-2 py-2 bg-transparent text-sm font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
        />

        <button
          id="submit-ask-query-btn"
          type="button"
          onClick={() => handleAsk()}
          disabled={isLoading || !query.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 active:scale-95 cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Checking...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
