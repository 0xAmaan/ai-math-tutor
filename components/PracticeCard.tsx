"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import "katex/dist/katex.min.css";

interface PracticeCardProps {
  sessionId: Id<"practiceSessions">;
}

export const PracticeCard = ({ sessionId }: PracticeCardProps) => {
  const session = useQuery(api.practice.getSession, { sessionId });
  const updateAnswer = useMutation(api.practice.updateAnswer);
  const updateCurrentProblem = useMutation(api.practice.updateCurrentProblem);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync local state with Convex on initial load
  const [hasInitialized, setHasInitialized] = useState(false);
  if (session && !hasInitialized) {
    setCurrentIndex(session.currentProblemIndex);
    setHasInitialized(true);
  }

  if (!session) {
    return (
      <div className="border border-zinc-700 rounded-lg p-6 bg-zinc-900">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const problem = session.problems[currentIndex];
  const selectedOption = problem?.studentAnswer;

  const handleSelect = async (optionLabel: string) => {
    if (!problem || selectedOption) return; // Prevent re-selection

    await updateAnswer({
      sessionId,
      problemIndex: currentIndex,
      answer: optionLabel,
    });
  };

  const handleClearAnswer = async () => {
    if (!problem || !selectedOption) return;

    await updateAnswer({
      sessionId,
      problemIndex: currentIndex,
      answer: undefined,
    });
  };

  const handleNavigation = async (newIndex: number) => {
    setCurrentIndex(newIndex);
    await updateCurrentProblem({
      sessionId,
      index: newIndex,
    });
  };

  const isAnswered = !!selectedOption;
  const correctOption = problem?.options.find((o) => o.isCorrect);
  const isCorrect = selectedOption === correctOption?.label;

  // Calculate progress
  const answeredCount = session.problems.filter((p) => p.studentAnswer).length;
  const progressPercent = (answeredCount / session.totalProblems) * 100;

  return (
    <motion.div
      className="border border-zinc-700 rounded-lg p-4 bg-zinc-900 my-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header with inline score */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-zinc-100">
          {session.topic} practice
        </h3>
        <div className="flex gap-2 items-center">
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs capitalize">
            {problem?.difficulty || session.difficulty}
          </span>
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
            MCQ
          </span>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
            {session.score}/{answeredCount} ({answeredCount > 0 ? Math.round((session.score / answeredCount) * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Compact Progress Bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Problem Statement */}
      <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {problem.problem}
          </ReactMarkdown>
        </div>
      </div>

      {/* Multiple Choice Options - 2x2 Grid */}
      <div className="mb-4">
        <div className="text-xs font-medium text-zinc-400 mb-2">Choose one:</div>
        <div className="grid grid-cols-2 gap-2">
        {problem.options.map((option) => {
          const isSelected = selectedOption === option.label;
          const showCorrect = isAnswered && option.isCorrect;
          const showWrong = isAnswered && isSelected && !option.isCorrect;

          return (
            <motion.button
              key={option.label}
              onClick={() => handleSelect(option.label)}
              disabled={isAnswered}
              className={`p-3 rounded-lg text-left flex items-start gap-2 transition-all border ${
                !isAnswered && "hover:border-blue-500 cursor-pointer"
              } ${
                showCorrect && "bg-green-500/20 border-green-500"
              } ${
                showWrong && "bg-red-500/20 border-red-500"
              } ${
                !isAnswered && !isSelected && "border-zinc-700 bg-zinc-800"
              } ${
                isSelected && !isAnswered && "border-blue-500 bg-zinc-800"
              } ${
                isAnswered && !showCorrect && !showWrong && "border-zinc-700 bg-zinc-800 opacity-60"
              }`}
              whileHover={!isAnswered ? { scale: 1.01 } : {}}
              whileTap={!isAnswered ? { scale: 0.99 } : {}}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    showCorrect && "border-green-500 bg-green-500"
                  } ${
                    showWrong && "border-red-500"
                  } ${
                    !isAnswered && "border-zinc-500"
                  }`}
                >
                  {showCorrect && <Check className="w-3 h-3 text-white" />}
                  {showWrong && <X className="w-3 h-3 text-red-500" />}
                </div>

                <span className="font-medium text-zinc-100 text-sm">{option.label}.</span>
                <div className="flex-1 min-w-0 prose prose-invert prose-sm max-w-none [&>p]:m-0 [&>p]:text-sm [&>p]:leading-tight">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {option.value}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.button>
          );
        })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handleClearAnswer}
          disabled={!selectedOption}
          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs text-zinc-300 transition-colors"
        >
          Clear Answer
        </button>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-1.5 font-medium text-sm ${
              isCorrect ? "text-green-400" : "text-red-400"
            }`}
          >
            {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {isCorrect ? "Correct!" : "Incorrect"}
          </motion.div>
        )}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-zinc-700 pt-2 overflow-hidden"
          >
            <h4 className="font-medium mb-1.5 text-zinc-100 text-xs">Explanation:</h4>
            <div className="prose prose-invert prose-sm max-w-none text-zinc-400 [&>p]:text-xs [&>p]:leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {problem.explanation}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700">
        <span className="text-xs text-zinc-400">
          Problem {currentIndex + 1} of {session.totalProblems}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleNavigation(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-300" />
          </button>
          <button
            onClick={() => handleNavigation(currentIndex + 1)}
            disabled={currentIndex === session.totalProblems - 1}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
