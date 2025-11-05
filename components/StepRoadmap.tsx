"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Check, Loader2, Circle } from "lucide-react";

interface StepRoadmapProps {
  currentStep: number;
  totalSteps: number;
  stepsCompleted: string[];
}

export const StepRoadmap = ({ currentStep, totalSteps, stepsCompleted }: StepRoadmapProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate step items based on currentStep and totalSteps
  const steps = Array.from({ length: totalSteps }, (_, index) => {
    const stepNumber = index + 1;
    const isCompleted = stepNumber < currentStep;
    const isCurrent = stepNumber === currentStep;
    const isPending = stepNumber > currentStep;

    // Get description from stepsCompleted array, or show pending
    const description = isCompleted
      ? stepsCompleted[index] || `Step ${stepNumber} completed`
      : isCurrent
      ? stepsCompleted[index] || `Currently working on step ${stepNumber}`
      : `Step ${stepNumber} - Not started`;

    return {
      stepNumber,
      description,
      isCompleted,
      isCurrent,
      isPending,
    };
  });

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">Solution Steps</span>
          <span className="text-xs text-zinc-500">
            ({currentStep} of {totalSteps})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {/* Expandable step list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {steps.map((step, index) => (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  {/* Step icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {step.isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {step.isCurrent && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
                      >
                        <Loader2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {step.isPending && (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                        <Circle className="w-2 h-2 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          step.isCompleted
                            ? "text-green-400"
                            : step.isCurrent
                            ? "text-blue-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {step.stepNumber}.
                      </span>
                      <p
                        className={`text-sm ${
                          step.isCompleted
                            ? "text-zinc-300"
                            : step.isCurrent
                            ? "text-white font-medium"
                            : "text-zinc-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                    {step.isCurrent && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.5 }}
                        className="h-0.5 bg-blue-500 mt-1 rounded-full"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
