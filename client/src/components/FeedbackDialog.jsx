import React, { useState } from 'react';
import { FiX, FiMessageSquare } from 'react-icons/fi';

const FeedbackDialog = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError('Feedback is required.');
      return;
    }
    if (feedback.trim().length < 5) {
      setError('Feedback must be at least 5 characters long.');
      return;
    }
    setError('');
    onSubmit(feedback);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all"
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative macos-glass w-full max-w-lg p-6 border border-white/10 shadow-2xl flex flex-col gap-4 text-left animate-in fade-in-0 zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <FiX size={16} />
        </button>

        {/* Header */}
        <div className="flex flex-col space-y-1.5 pr-8">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <FiMessageSquare className="text-accent" />
            Submit Solution Anyway
          </h3>
          <p className="text-xs text-secondary leading-relaxed">
            Your code did not pass all test cases. Please provide a brief explanation or feedback of what issues you encountered to submit your solution for manual review.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary flex justify-between">
              <span>Why are you submitting anyway? *</span>
              <span className="text-[10px] text-tertiary">Minimum 5 characters</span>
            </label>
            <textarea
              className={`w-full rounded-xl bg-black/20 dark:bg-black/40 border p-3 text-sm text-primary placeholder:text-secondary/40 focus:outline-none transition-colors resize-none ${
                error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent'
              }`}
              rows={4}
              placeholder="e.g., Code runs fine locally but fails due to environment differences, or I need assistance from a mentor..."
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (e.target.value.trim().length >= 5) setError('');
              }}
              disabled={isSubmitting}
              required
            />
            {error && (
              <p className="text-xs font-medium text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary bg-black/5 dark:bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-lg shadow-accent/20 flex items-center gap-1.5"
            >
              Confirm Submission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackDialog;
