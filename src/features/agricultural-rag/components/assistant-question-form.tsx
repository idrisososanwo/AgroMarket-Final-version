"use client";

import React, { useState } from "react";
import { RAG_QUESTION_CATEGORIES, RagQuestionCategory } from "../types";
import { assertNoProhibitedProduceRag } from "../validation";
import { Send, AlertCircle, Loader2, HelpCircle } from "lucide-react";

interface AssistantQuestionFormProps {
  initialQuestion?: string;
  initialCategory?: RagQuestionCategory;
  onSubmit: (question: string, category: RagQuestionCategory) => void;
  isLoading?: boolean;
}

export function AssistantQuestionForm({
  initialQuestion = "",
  initialCategory = "GENERAL_AGRONOMIC",
  onSubmit,
  isLoading = false,
}: AssistantQuestionFormProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [category, setCategory] = useState<RagQuestionCategory>(initialCategory);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    try {
      assertNoProhibitedProduceRag(trimmed, "Question");
      setError(null);
      onSubmit(trimmed, category);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prohibited produce detected.");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span>Ask Agricultural Question</span>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </label>
            <span className="text-xs text-gray-400 font-mono">
              {question.length}/300 characters
            </span>
          </div>

          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Ask about documented crop practices, market liquidity, biosecurity protocols, or logistics corridors..."
            rows={3}
            maxLength={300}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 shrink-0">
              Inquiry Domain:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RagQuestionCategory)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {RAG_QUESTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isLoading ? "Synthesizing Evidence..." : "Ask Assistant"}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
