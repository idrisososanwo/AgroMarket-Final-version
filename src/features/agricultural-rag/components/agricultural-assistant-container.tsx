"use client";

import React, { useState } from "react";
import { RagQuestionCategory, EvidenceGroundedAnswer } from "../types";
import { AssistantQuestionForm } from "./assistant-question-form";
import { TopicGuidancePanel } from "./topic-guidance-panel";
import { EvidenceGroundedAnswerCard } from "./evidence-grounded-answer-card";
import { askAgriculturalAssistantAction } from "../actions";
import { AlertCircle, Loader2, Sparkles, BookOpen, ShieldCheck } from "lucide-react";

export function AgriculturalAssistantContainer() {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCategory, setCurrentCategory] = useState<RagQuestionCategory>("GENERAL_AGRONOMIC");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [answer, setAnswer] = useState<EvidenceGroundedAnswer | null>(null);

  const handleSubmit = async (question: string, category: RagQuestionCategory) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentQuestion(question);
    setCurrentCategory(category);

    try {
      const result = await askAgriculturalAssistantAction(question, { category });
      if (result.success && result.data) {
        setAnswer(result.data);
      } else {
        setErrorMessage(result.error || "An error occurred while synthesizing the answer.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to connect to the agricultural assistant service."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTopic = (sampleQuestion: string, category: RagQuestionCategory) => {
    setCurrentQuestion(sampleQuestion);
    setCurrentCategory(category);
    handleSubmit(sampleQuestion, category);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 3.15 Operational Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Agricultural Intelligence Assistant</h1>
            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
              Evidence-grounded retrieval and explanation engine. Synthesizes answers directly from AgroMarket&apos;s
              verified knowledge graph, biosecurity repositories, and market observations with strict source traceability.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-xs text-emerald-200/80">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Strict Anti-Pork Enforced
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              Deterministic Citation Validation
            </span>
          </div>
        </div>
      </div>

      {/* Topic Suggestions */}
      <TopicGuidancePanel onSelectTopic={handleSelectTopic} />

      {/* Question Form */}
      <AssistantQuestionForm
        initialQuestion={currentQuestion}
        initialCategory={currentCategory}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-800 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Query Processing Error</h4>
            <p className="text-xs text-red-700 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            <span className="text-sm font-semibold text-gray-700">
              Retrieving verified agricultural evidence and synthesizing answer...
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="h-20 bg-gray-50 border border-gray-200 rounded" />
            <div className="h-20 bg-gray-50 border border-gray-200 rounded" />
          </div>
        </div>
      )}

      {/* Render Answer */}
      {answer && !isLoading && <EvidenceGroundedAnswerCard answer={answer} />}

      {/* Operational Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
        <p className="font-semibold text-gray-700 mb-1">Operational & Safety Notice</p>
        <p>
          This interface provides evidence-grounded agricultural explanations and summaries. It does not provide
          autonomous agricultural decision-making, veterinary or medical diagnosis, or guarantee that every generated
          statement is correct. Always consult certified extension officers, agronomists, or veterinary authorities
          before committing capital or undertaking chemical treatments.
        </p>
      </div>
    </div>
  );
}
