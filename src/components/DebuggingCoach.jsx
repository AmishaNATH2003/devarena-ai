
import { useState } from "react";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";

const suggestions = [
  "Explain this file",
  "Find the bug",
  "Give me a hint",
  "Check my progress",
];

export default function DebuggingCoach({
  assessmentId,
  files,
  activeFile,
  challengeDescription = "",
}) {
  const [messages, setMessages] = useState([
    {
      role: "coach",
      text: "Hi! I'm your DevArena AI Debugging Coach. Ask me about the project you're working on.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (text) => {
    const question = text.trim();

    if (!question || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: question },
    ]);

    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId,
          message: question,
          activeFile,
          files,
          challengeDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to get an AI response."
        );
      }

      setMessages((previous) => [
        ...previous,
        { role: "coach", text: data.reply },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-indigo-50 p-5">
        <div className="rounded-xl bg-indigo-600 p-2 text-white">
          <Bot size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">
            DevArena AI Debugging Coach
          </h3>
          <p className="text-xs text-slate-500">
            Powered by DevArena AI
          </p>
        </div>
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 size={17} className="animate-spin" />
            DevArena AI is analyzing your code...
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="px-5 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="border-t border-slate-100 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(suggestion)}
              className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Sparkles size={13} />
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask DevArena Ai about your code..."
            aria-label="Ask the debugging coach"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-white disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
