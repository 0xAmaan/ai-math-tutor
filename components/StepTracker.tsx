"use client";

import { motion } from "framer-motion";
import { ProgressBar } from "./ProgressBar";
import { StepRoadmap } from "./StepRoadmap";
import { StepHistory } from "./StepHistory";

interface ProblemContext {
  currentProblem: string;
  currentStep: number;
  totalSteps: number;
  problemType: string;
  stepsCompleted: string[];
}

interface StepTrackerProps {
  problemContext: ProblemContext;
}

export const StepTracker = ({ problemContext }: StepTrackerProps) => {
  const { currentProblem, currentStep, totalSteps, stepsCompleted } = problemContext;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 my-4"
    >
      {/* Progress Bar - Always visible */}
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      {/* Step Roadmap - Collapsible */}
      <StepRoadmap
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepsCompleted={stepsCompleted}
      />

      {/* Step History - Shows progress so far */}
      <StepHistory currentProblem={currentProblem} stepsCompleted={stepsCompleted} />
    </motion.div>
  );
};
