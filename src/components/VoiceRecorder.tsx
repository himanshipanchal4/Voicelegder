import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Mic, MicOff, Square, Play, Pause, RefreshCw, Send, Sparkles, UploadCloud, Volume2 } from "lucide-react";
import { Language, ExtractionResult } from "../types";
import { sampleVoicePhrases } from "../data/demoData";
import { getTranslation } from "../utils/i18n";

interface VoiceRecorderProps {
  language: Language;
  onTransactionExtracted: (result: ExtractionResult) => void;
  onViewDashboard?: () => void;
}

type RecorderState =
  | "idle" // "Tap to Record"
  | "listening" // "Listening..."
  | "recorded" // Ready to process or preview
  | "processing" // "Processing..."
  | "detected" // "Transaction Detected"
  | "saved"; // "Saved Successfully"

export function VoiceRecorder({ language, onTransactionExtracted, onViewDashboard }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"voice" | "manual">("voice");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Determine speech recognition language code
  const getRecognitionLang = () => {
    if (language === "hi") return "hi-IN";
    if (language === "mr") return "mr-IN";
    return "en-IN"; // English + Indian accent
  };

  // Start Voice Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setTranscript("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setState("listening");
      setRecordingDuration(0);

      // Start elapsed timer
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Also try browser speech recognition for real-time live transcript
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = getRecognitionLang();

          recognition.onresult = (event: any) => {
            let fullText = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript;
            }
            if (fullText) {
              setTranscript(fullText);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("Speech recognition warning:", e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn("SpeechRecognition init error", speechErr);
        }
      }
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setState("idle");
      setErrorMessage(
        "Microphone access is required for voice recording. You can also enter the transaction manually."
      );
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    setState("recorded");
  };

  // Audio Playback Preview
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current && audioUrl) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (audioPlayerRef.current) {
      if (isPlayingAudio) {
        audioPlayerRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  // Process Recording with Gemini
  const processRecording = async (customText?: string) => {
    const textToProcess = (customText || transcript || manualText).trim();

    if (!textToProcess && audioChunksRef.current.length === 0) {
      setErrorMessage("No speech detected. Please speak clearly or enter the transaction text.");
      return;
    }

    setState("processing");
    setErrorMessage(null);

    try {
      // 1. If we have text (from live transcript or demo / manual input), send to extraction API
      if (textToProcess) {
        const response = await fetch("/api/extract-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToProcess,
            language: language,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process transaction with AI");
        }

        const data: ExtractionResult = await response.json();
        setState("detected");
        onTransactionExtracted({
          ...data,
          notes: textToProcess,
        });
        return;
      }

      // 2. If we only have audio chunks without text, send audio base64 to server
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];
            const response = await fetch("/api/transcribe-audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: audioBlob.type,
              }),
            });

            if (!response.ok) {
              throw new Error("Audio transcription returned error");
            }

            const data = await response.json();
            setState("detected");
            onTransactionExtracted({
              customer_name: data.customer_name || "Walk-in Customer",
              items: data.items || [{ name: "Grocery", quantity: 1, unit_price: data.total_amount || 100 }],
              total_amount: data.total_amount || 100,
              payment_status: data.payment_status || "paid",
              transaction_type: data.transaction_type || "sale",
              confidence: data.confidence || 85,
              notes: data.transcript || "Voice note recording",
              source: "voice",
            });
          } catch (audioErr) {
            console.error("Audio upload error:", audioErr);
            // Graceful fallback to manual input
            setState("idle");
            setErrorMessage("I couldn't understand the transaction clearly. Please try again or enter it manually.");
          }
        };

        reader.readAsDataURL(audioBlob);
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setState("idle");
      setErrorMessage("I couldn't understand the transaction clearly. Please try again or enter it manually.");
    }
  };

  // Test with demo phrase
  const handleSelectDemoPhrase = (phrase: string) => {
    setTranscript(phrase);
    setManualText(phrase);
    processRecording(phrase);
  };

  // File Upload fallback
  const handleAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setState("recorded");
      setTranscript(`Audio file: ${file.name}`);
    }
  };

  // Status label for primary button
  const getButtonStateLabel = () => {
    switch (state) {
      case "listening":
        return "Listening... (Tap to Stop)";
      case "recorded":
        return "Process Voice Note";
      case "processing":
        return "Processing with AI...";
      case "detected":
        return "Transaction Detected ✓";
      case "saved":
        return "Saved Successfully 🎉";
      case "idle":
      default:
        return getTranslation(language, "tapToRecord");
    }
  };

  return (
    <div id="voice-ledger-home" className="w-full max-w-3xl mx-auto py-6 px-4">
      {/* Header / Hero Titles */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Multilingual Voice AI for Indian Shopkeepers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          {getTranslation(language, "appName")}
        </h1>
        <p className="text-lg font-semibold text-indigo-900 mb-2">
          “{getTranslation(language, "heroTitle")}”
        </p>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          {getTranslation(language, "heroSubtext")}
        </p>
      </div>

      {/* Main Voice Hub Card */}
      <div
        id="microphone-hero-container"
        className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border-2 border-indigo-100 text-center relative overflow-hidden"
      >
        {/* Subtle background pulse when listening */}
        {state === "listening" && (
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
        )}

        {/* Big Central Microphone Button */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          {state === "listening" && (
            <>
              <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-rose-400/20 animate-ping" />
              <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-rose-400/10 animate-pulse" />
            </>
          )}

          <button
            id="main-microphone-btn"
            type="button"
            onClick={() => {
              if (state === "idle") startRecording();
              else if (state === "listening") stopRecording();
              else if (state === "recorded") processRecording();
            }}
            disabled={state === "processing"}
            className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all transform active:scale-95 focus:outline-none cursor-pointer ${
              state === "listening"
                ? "bg-rose-600 hover:bg-rose-700 ring-8 ring-rose-200 animate-bounce-short"
                : state === "processing"
                ? "bg-slate-500 cursor-not-allowed opacity-90 ring-8 ring-slate-200"
                : state === "recorded"
                ? "bg-indigo-600 hover:bg-indigo-700 ring-8 ring-indigo-200"
                : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-2xl ring-8 ring-indigo-100"
            }`}
            aria-label={getButtonStateLabel()}
          >
            {state === "listening" ? (
              <>
                <Square className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
                <span className="text-xs font-bold mt-1 tracking-wider uppercase">
                  {Math.floor(recordingDuration / 60)}:
                  {(recordingDuration % 60).toString().padStart(2, "0")}
                </span>
              </>
            ) : state === "processing" ? (
              <>
                <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
                <span className="text-xs font-bold mt-1">Analyzing...</span>
              </>
            ) : state === "recorded" ? (
              <>
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
                <span className="text-xs font-bold mt-1">Process</span>
              </>
            ) : (
              <>
                <Mic className="w-12 h-12 sm:w-14 sm:h-14" />
                <span className="text-xs font-bold mt-1">Tap to Speak</span>
              </>
            )}
          </button>

          {/* Dynamic Status Label */}
          <div className="mt-5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {getButtonStateLabel()}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {state === "listening"
                ? "Speak now in Hindi, Marathi, or English (e.g., 'Sharma ne 200 rs ka saaman liya, udhaar')"
                : state === "recorded"
                ? "Recording captured. Click 'Process Voice Note' to extract with Gemini."
                : getTranslation(language, "speakPrompt")}
            </p>
          </div>
        </div>

        {/* Live Audio Waves / Soundbar preview when listening */}
        {state === "listening" && (
          <div className="flex items-center justify-center space-x-1.5 my-4 py-2">
            {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 65, 35].map((height, i) => (
              <span
                key={i}
                className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${height}%`,
                  minHeight: "12px",
                  maxHeight: "36px",
                  animationDelay: `${(i % 5) * 120}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Audio Recording Preview Player (if recorded) */}
        {audioUrl && state === "recorded" && (
          <div className="mt-4 p-3 bg-slate-100 rounded-xl flex items-center justify-between max-w-md mx-auto border border-slate-200">
            <button
              type="button"
              onClick={togglePlayAudio}
              className="p-2 rounded-lg bg-white shadow-xs text-indigo-700 hover:bg-indigo-50 transition flex items-center space-x-2 text-xs font-bold"
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlayingAudio ? "Pause Preview" : "Play Recording"}</span>
            </button>
            <span className="text-xs text-slate-500 font-medium flex items-center">
              <Volume2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {recordingDuration}s audio captured
            </span>
            <button
              type="button"
              onClick={startRecording}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              Re-record
            </button>
          </div>
        )}

        {/* Live transcript bubble if available */}
        {transcript && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-left max-w-xl mx-auto">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block mb-1">
              Detected Speech:
            </span>
            <p className="text-sm font-medium text-slate-800 italic">“{transcript}”</p>
          </div>
        )}

        {/* Error message card */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 max-w-md mx-auto flex items-center space-x-2">
            <MicOff className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-left leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Secondary Actions: Enter Manually & Audio Upload */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
          <button
            id="toggle-manual-input-btn"
            type="button"
            onClick={() => setInputMode(inputMode === "manual" ? "voice" : "manual")}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
          >
            {inputMode === "manual" ? "🎙 Switch to Voice" : "✍ Enter Manually"}
          </button>

          <label className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition flex items-center space-x-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Audio</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>

          {onViewDashboard && (
            <button
              id="view-dashboard-quick-btn"
              type="button"
              onClick={onViewDashboard}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
            >
              📊 View Dashboard
            </button>
          )}
        </div>

        {/* Manual Input Field (Fallback) */}
        {inputMode === "manual" && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-xl mx-auto animate-fade-in">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Type your transaction in Hindi, Marathi, English, or Hinglish:
            </label>
            <div className="flex space-x-2">
              <input
                id="manual-transaction-input"
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualText.trim()) {
                    processRecording(manualText);
                  }
                }}
                placeholder="e.g., Priya ne 500 rupaye cash diya"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
              <button
                id="submit-manual-transaction-btn"
                type="button"
                onClick={() => processRecording(manualText)}
                disabled={!manualText.trim() || state === "processing"}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Process</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clickable Demo Voice Note Suggestions */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Try saying (or click to test AI extraction):
          </span>
          <span className="text-xs text-indigo-700 font-semibold">1-Click Demo Ready</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sampleVoicePhrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDemoPhrase(phrase.text)}
              className="text-left p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition group relative overflow-hidden cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                  {phrase.label}
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {phrase.language}
                </span>
              </div>
              <p className="text-xs text-slate-600 italic group-hover:text-slate-900 leading-snug">
                “{phrase.text}”
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
