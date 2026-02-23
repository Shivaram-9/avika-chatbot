'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Message, MoodAnalysis, VideoContent } from "@/types";
import { SendIcon, BotIcon } from "@/components/Icons";

type ChatResponse = {
  text: string;
  videos: VideoContent[];
  mood: MoodAnalysis;
};

const INITIAL_MESSAGE: Message = {
  id: "initial",
  role: "bot",
  content: "Hey. I'm Avika. How are you feeling right now?",
  timestamp: Date.now(),
};

const ChatMessage = ({ message }: { message: Message }) => {
  const isBot = message.role === "bot";

  return (
    <div className={`flex items-start gap-3 my-4 ${isBot ? "justify-start" : "justify-end"}`}>
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-cyan-300" />
        </div>
      )}
      <div
        className={`max-w-md p-3 rounded-lg ${
          isBot
            ? "bg-slate-700 text-gray-200 rounded-tl-none"
            : "bg-cyan-600 text-white rounded-tr-none"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
        {message.videos && message.videos.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.videos.map((video) => (
              <a
                key={video.url}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-600 hover:bg-slate-500 transition-colors duration-200 p-2 rounded-md text-center text-xs text-cyan-200"
              >
                🎥 {video.language}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-start gap-3 my-4 justify-start">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
      <BotIcon className="w-5 h-5 text-cyan-300" />
    </div>
    <div className="max-w-md p-3 rounded-lg bg-slate-700 text-gray-200 rounded-tl-none flex items-center space-x-1">
      <span className="text-sm">Avika is thinking</span>
      <div className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce" />
    </div>
  </div>
);

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [mood, setMood] = useState<MoodAnalysis | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim() || isLoading) {
        return;
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
        timestamp: Date.now(),
      };

      setInput("");
      setIsLoading(true);

      // Use functional update to get the latest messages
      setMessages((prevMessages) => {
        const optimisticMessages = [...prevMessages, userMessage];

        // Make the API call with the updated messages
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: optimisticMessages }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Request failed with status ${response.status}`);
            }
            return response.json();
          })
          .then((data: ChatResponse) => {
            const botMessage: Message = {
              id: `bot-${Date.now()}`,
              role: "bot",
              content: data.text,
              timestamp: Date.now(),
              videos: data.videos,
            };

            setMessages((prev) => [...prev, botMessage]);
            setMood(data.mood);
          })
          .catch((error) => {
            console.error("Failed to fetch Avika response:", error);
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              role: "bot",
              content: "Sorry, something went wrong. Let's take a breath and try again soon.",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          })
          .finally(() => {
            setIsLoading(false);
          });

        return optimisticMessages;
      });
    },
    [input, isLoading]
  );

  return (
    <div className="flex flex-col h-svh bg-slate-900 text-white font-sans">
      <header className="p-4 border-b border-slate-800 shadow-md bg-slate-900/70 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-cyan-300">Avika</h1>
            <p className="text-xs text-slate-400">Your quiet support companion</p>
          </div>
          {mood && mood.dominantMood !== "general" && (
            <div className="text-[11px] sm:text-xs text-slate-400">
              Mood: <span className="text-cyan-300 font-medium">{mood.dominantMood}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="p-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center bg-slate-800 rounded-lg p-2 border border-slate-700 focus-within:border-cyan-500 transition-colors"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tell me what's on your mind..."
              className="flex-1 bg-transparent focus:outline-none px-2 text-gray-200 placeholder-slate-500"
              disabled={isLoading}
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              <SendIcon className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

