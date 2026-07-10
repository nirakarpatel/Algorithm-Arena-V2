import React from 'react';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ title, description, actionLabel, onAction, icon: Icon = FiInbox }) => {
  return (
    <div className="surface-card card-static p-8 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-md bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-secondary mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-md bg-accent text-white font-medium transition-transform active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
