"use client";

import React from "react";
import { RagQuestionCategory } from "../types";
import { Sparkles } from "lucide-react";

interface TopicGuidancePanelProps {
  onSelectTopic: (sampleQuestion: string, category: RagQuestionCategory) => void;
}

const SAMPLE_TOPICS: Array<{
  title: string;
  question: string;
  category: RagQuestionCategory;
}> = [
  {
    title: "Soybean Rhizobium Inoculation",
    question: "What are the recommended inoculation techniques for high-yield soybean production?",
    category: "CROP_PRODUCTION",
  },
  {
    title: "Kano Tomato Price Liquidity",
    question: "Summarize recent market conditions and price volatility for fresh tomatoes in Kano.",
    category: "MARKET_OBSERVATION",
  },
  {
    title: "Fall Armyworm Scouting",
    question: "What are the published early detection and biosecurity protocols for fall armyworm?",
    category: "DISEASE_BIOSECURITY",
  },
  {
    title: "Cassava Starch Processing",
    question: "What are the key technical constraints in industrial cassava wet milling and flash drying?",
    category: "AGRICULTURAL_PROCESSING",
  },
  {
    title: "Middle Belt Grain Corridors",
    question: "What are the documented logistics transit constraints along the Benue-Lagos corridor?",
    category: "LOGISTICS_CONSTRAINT",
  },
  {
    title: "Dry Season Irrigation Outlook",
    question: "Summarize regional food security indicators and water availability for dry season crops.",
    category: "REGIONAL_FOOD_SECURITY",
  },
];

export function TopicGuidancePanel({ onSelectTopic }: TopicGuidancePanelProps) {
  return (
    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 mb-6 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-emerald-900 mb-2">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <span>Supported Inquiry Topics (Evidence-Grounded Only):</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {SAMPLE_TOPICS.map((topic, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectTopic(topic.question, topic.category)}
            className="text-left p-2.5 bg-white border border-emerald-200/80 rounded hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors shadow-2xs group"
          >
            <div className="font-semibold text-gray-800 group-hover:text-emerald-700">
              {topic.title}
            </div>
            <div className="text-gray-500 line-clamp-1 mt-0.5">
              {topic.question}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
