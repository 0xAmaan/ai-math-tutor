"use client";

import { motion } from "framer-motion";
import { PanelRightClose, CheckCircle2, Circle } from "lucide-react";
import { CircularProgress } from "./CircularProgress";

interface ProblemContext {
  currentProblem: string;
  currentStep: number;
  totalSteps: number;
  problemType: string;
  stepsCompleted: string[];
  currentEquation?: string;
  stepRoadmap?: string[];
}

interface StepSidePanelProps {
  problemContext: ProblemContext | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StepSidePanel = ({ problemContext, isOpen, onClose }: StepSidePanelProps) => {
  if (!problemContext) return null;

  const { currentProblem, currentStep, totalSteps, stepsCompleted, currentEquation, stepRoadmap } = problemContext;
  const percentage = Math.round((currentStep / totalSteps) * 100);

  // Build step list with completion status
  // Use stepRoadmap if available, otherwise create generic placeholders
  const steps = stepRoadmap && stepRoadmap.length > 0
    ? stepRoadmap
    : Array.from({ length: totalSteps }, (_, i) => {
        // Try to use stepsCompleted descriptions if available
        if (i < stepsCompleted.length) {
          return stepsCompleted[i];
        }
        return `Step ${i + 1}`;
      });

  return (
    <div
      className={`fixed right-0 top-0 h-screen bg-zinc-900 border-l border-zinc-700 shadow-2xl z-50 flex flex-col transition-all duration-300 ${
        isOpen ? 'w-80' : 'w-0'
      }`}
      style={{ overflow: 'hidden' }}
    >
        {/* Header with title */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between" style={{ minWidth: '320px' }}>
          <h3 className="text-sm font-medium text-white">Progress Tracker</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white cursor-pointer"
            title="Close progress tracker"
          >
            <PanelRightClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ minWidth: '320px' }}>
          {/* Original Problem Card */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-2">Problem:</p>
            <p className="text-sm text-white">{currentProblem}</p>
          </div>

          {/* Combined Card: Current State + Progress */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <div className="flex items-center justify-between gap-3">
              {/* Left side - Current State */}
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-2">Current State:</p>
                {currentEquation ? (
                  <p className="text-base text-emerald-400 font-mono">{currentEquation}</p>
                ) : (
                  <p className="text-sm text-zinc-400">Starting problem...</p>
                )}
              </div>

              {/* Right side - Circular Progress */}
              <div className="flex-shrink-0">
                <CircularProgress percentage={percentage} />
              </div>
            </div>
          </div>

          {/* Step Roadmap - Shows ALL steps */}
          <div>
            <p className="text-xs text-zinc-500 mb-3">Solution Roadmap:</p>
            <div className="space-y-3">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                const isPending = stepNumber > currentStep;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    {/* Step icon */}
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    {isCurrent && (
                      <Circle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 animate-pulse fill-blue-500" />
                    )}
                    {isPending && (
                      <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                    )}

                    {/* Step text */}
                    <p
                      className={`text-sm ${
                        isCompleted
                          ? "text-zinc-300"
                          : isCurrent
                          ? "text-white font-medium"
                          : "text-zinc-500"
                      }`}
                    >
                      {step}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
  );
};
