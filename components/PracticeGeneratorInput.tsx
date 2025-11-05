"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

interface PracticeGeneratorInputProps {
  onGenerate: (topic: string, count: number) => Promise<void>;
  onClose: () => void;
  isGenerating: boolean;
}

export const PracticeGeneratorInput = ({
  onGenerate,
  onClose,
  isGenerating,
}: PracticeGeneratorInputProps) => {
  const [topic, setTopic] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    await onGenerate(topic, 3); // Always generate 3 problems
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <form
          onSubmit={handleSubmit}
          className="border border-blue-500/50 rounded-lg p-4 mb-4 bg-zinc-900/50 backdrop-blur"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-100">
              Generate Practice Problems
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Topic Input */}
            <div>
              <label
                htmlFor="topic-input"
                className="block text-sm text-zinc-400 mb-2"
              >
                What topic? (e.g., "2x+5=13" or "linear equations")
              </label>
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                placeholder="Enter problem type or example..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                autoFocus
              />
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={!topic.trim() || isGenerating}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Practice Problems"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
