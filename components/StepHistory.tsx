"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

interface StepHistoryProps {
  currentProblem: string;
  stepsCompleted: string[];
}

export const StepHistory = ({ currentProblem, stepsCompleted }: StepHistoryProps) => {
  // Show last 5 completed steps
  const recentSteps = stepsCompleted.slice(-5);

  if (recentSteps.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-green-400" />
        </div>
        <h3 className="text-sm font-medium text-zinc-300">Progress So Far</h3>
      </div>

      {/* Problem statement */}
      <div className="mb-3 pb-3 border-b border-zinc-700/50">
        <p className="text-xs text-zinc-500 mb-1">Working on:</p>
        <p className="text-sm text-white font-medium">{currentProblem}</p>
      </div>

      {/* Steps completed */}
      <div className="space-y-2">
        {recentSteps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex items-start gap-2"
          >
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-400 flex-1">{step}</p>
          </motion.div>
        ))}

        {/* Current step indicator */}
        {stepsCompleted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: recentSteps.length * 0.05 + 0.1, duration: 0.3 }}
            className="flex items-start gap-2 pt-2 border-t border-zinc-700/50"
          >
            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-400 font-medium flex-1">Working on next step...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
