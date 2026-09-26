import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";

interface AIAgentAvatarProps {
  size?: "xs" | "sm" | "md" | "lg";
  state?: "idle" | "thinking" | "speaking" | "verified";
  showStatusDot?: boolean;
  className?: string;
  badgeText?: string;
}

export function AIAgentAvatar({
  size = "md",
  state = "idle",
  showStatusDot = true,
  className = "",
  badgeText,
}: AIAgentAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    xs: "w-3.5 h-3.5",
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-9 h-9",
  };

  const statusDotSizes = {
    xs: "w-1.5 h-1.5 ring-1",
    sm: "w-2.5 h-2.5 ring-1.5",
    md: "w-3 h-3 ring-2",
    lg: "w-3.5 h-3.5 ring-2",
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Animated glow ring when thinking */}
      {state === "thinking" && (
        <div
          className={`absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin opacity-75 blur-[1px]`}
        />
      )}

      {/* Main avatar circle */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden relative shadow-sm border-2 ${
          state === "thinking"
            ? "border-indigo-400 ring-2 ring-indigo-200"
            : state === "speaking"
            ? "border-emerald-400 ring-2 ring-emerald-200"
            : "border-indigo-100 bg-gradient-to-tr from-indigo-50 via-white to-slate-50"
        } flex items-center justify-center`}
      >
        {!imageError ? (
          <img
            src="/ai-agent-avatar.jpg"
            alt="Munimji AI Assistant Avatar"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center">
            <Bot className={iconSizes[size]} />
          </div>
        )}

        {/* Small sparkle overlay icon for high-tech aesthetic */}
        {size === "lg" && (
          <div className="absolute top-1 right-1 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-xs">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Online / Activity status dot */}
      {showStatusDot && (
        <span
          className={`absolute bottom-0 right-0 ${statusDotSizes[size]} rounded-full ring-white ${
            state === "thinking"
              ? "bg-indigo-500 animate-pulse"
              : state === "speaking"
              ? "bg-emerald-500 animate-ping"
              : "bg-emerald-500"
          }`}
          title={state === "thinking" ? "AI is thinking..." : "AI Agent Online & Ready"}
        />
      )}

      {badgeText && (
        <span className="absolute -bottom-2 -right-1 bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
          {badgeText}
        </span>
      )}
    </div>
  );
}
