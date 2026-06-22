import React from 'react';

const ConfirmDialog = ({
  open,
  title = 'Confirm action',
  description = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="macos-glass w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-secondary mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-glass-border text-primary hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-accent text-white font-semibold">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

