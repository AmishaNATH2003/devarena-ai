
import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { getCoachReply } from "../utils/coachEngine";

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
}) {
  const [messages, setMessages] = useState([
    {
      role: "coach",
      text:
        "Hi! I'm your debugging coach. " +
        "I can help you investigate the project without " +
        "giving away the full solution.",
    },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = (text) => {
    const question = text.trim();
    if (!question) return;

    const reply = getCoachReply({
      assessmentId,
      files,
      activeFile,
      message: question,
    });

    setMessages((previous) => [
      ...previous,
      { role: "user", text: question },
      { role: "coach", text: reply },
    ]);

    setInput("");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-indigo-50 p-5">
        <div className="rounded-xl bg-indigo-600 p-2 text-white">
          <Bot size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">
            DevArena Debugging Coach
          </h3>
          <p className="text-xs text-slate-500">
            Offline guided assistance
          </p>
        </div>
      </div>

      <div
        className="max-h-80 space-y-4 overflow-y-auto p-5"
        aria-live="polite"
      >
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
              className={`max-w-[90%] rounded-2xl p-4 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
              className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
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
            placeholder="Ask about the bug..."
            aria-label="Ask the debugging coach"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={!input.trim()}
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
