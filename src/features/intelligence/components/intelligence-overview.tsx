"use client";

import { useState } from "react";
import {
  IntelligenceAgent,
  IntelligenceSignal,
  IntelligenceObservation,
  IntelligenceRecommendation,
  IntelligenceEvaluation,
} from "../types";
import { SignalsFeed } from "./signals-feed";
import { RecommendationsList } from "./recommendations-list";
import { EvaluationsTable } from "./evaluations-table";
import { AgentsRegistryCard } from "./agents-registry-card";
import { runDeterministicPipelineAction } from "../actions";
import {
  BrainCircuit,
  Radio,
  Lightbulb,
  History,
  Cpu,
  Play,
} from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";

interface IntelligenceOverviewProps {
  agents: IntelligenceAgent[];
  signals: IntelligenceSignal[];
  observations: IntelligenceObservation[];
  recommendations: IntelligenceRecommendation[];
  evaluations: IntelligenceEvaluation[];
}

export function IntelligenceOverview({
  agents,
  signals: initialSignals,
  observations: _observations,
  recommendations: initialRecommendations,
  evaluations,
}: IntelligenceOverviewProps) {
  const [activeTab, setActiveTab] = useState<
    "signals" | "recommendations" | "evaluations" | "agents"
  >("signals");

  const [signals, setSignals] = useState<IntelligenceSignal[]>(initialSignals);
  const [recommendations, setRecommendations] =
    useState<IntelligenceRecommendation[]>(initialRecommendations);

  // Pipeline test runner state
  const [testCommodity, setTestCommodity] = useState("Broiler Chicken");
  const [testState, setTestState] = useState("Lagos");
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);

  const handleRunPipeline = async () => {
    setIsRunningPipeline(true);
    setPipelineMessage(null);
    try {
      const res = await runDeterministicPipelineAction(testCommodity, testState);
      if (res.success && res.data) {
        setSignals((prev) => [...res.data!.signals, ...prev]);
        setRecommendations((prev) => [...res.data!.recommendations, ...prev]);
        setPipelineMessage(
          `Pipeline executed successfully for ${testCommodity} in ${testState}. Evaluated ${res.data.signals.length} signals and generated ${res.data.recommendations.length} recommendations.`
        );
      } else {
        setPipelineMessage(`Pipeline error: ${res.error}`);
      }
    } catch (err: unknown) {
      setPipelineMessage(err instanceof Error ? err.message : "Pipeline execution failed");
    } finally {
      setIsRunningPipeline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Agricultural Intelligence Foundation
              </h1>
              <p className="text-xs text-neutral-600">
                Phase 2.1 — Deterministic coordination layer, signal detection, and human-in-the-loop advisory memory.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Engine v2.1.0
          </span>
        </div>

        {/* Interactive Deterministic Pipeline Runner */}
        <div className="mt-6 rounded-xl border border-emerald-200/80 bg-white/80 p-4 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 flex items-center">
              <Play className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Test Deterministic Pipeline Engine
            </span>
            <span className="text-[11px] text-neutral-500">
              Evaluates Market, Supply, Demand, Processing, and Security rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                Commodity
              </label>
              <select
                value={testCommodity}
                onChange={(e) => setTestCommodity(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800"
              >
                <option value="Broiler Chicken">Broiler Chicken</option>
                <option value="Beef Cattle">Beef Cattle</option>
                <option value="African Catfish (Clarias)">African Catfish</option>
                <option value="Cassava Tubers">Cassava Tubers</option>
                <option value="Yellow Maize">Yellow Maize</option>
                <option value="Cow Milk">Cow Milk</option>
                <option value="Benue White Yam">Benue White Yam</option>
                <option value="Roma Tomatoes">Roma Tomatoes</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                State
              </label>
              <select
                value={testState}
                onChange={(e) => setTestState(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={isRunningPipeline}
                onClick={handleRunPipeline}
                className="w-full rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition"
              >
                {isRunningPipeline ? "Evaluating Rules..." : "Run Signal Evaluation"}
              </button>
            </div>
          </div>

          {pipelineMessage && (
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-2 text-xs text-emerald-900">
              {pipelineMessage}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab("signals")}
          className={`flex items-center space-x-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "signals"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Active Signals ({signals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          className={`flex items-center space-x-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "recommendations"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          <span>Advisory Recommendations ({recommendations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("evaluations")}
          className={`flex items-center space-x-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "evaluations"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Memory & Evaluations ({evaluations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agents")}
          className={`flex items-center space-x-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "agents"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Agents Registry ({agents.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "signals" && <SignalsFeed signals={signals} />}
      {activeTab === "recommendations" && (
        <RecommendationsList recommendations={recommendations} />
      )}
      {activeTab === "evaluations" && <EvaluationsTable evaluations={evaluations} />}
      {activeTab === "agents" && <AgentsRegistryCard agents={agents} />}
    </div>
  );
}
