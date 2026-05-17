import React from 'react';

const LoadingScreen = ({ label = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-app text-primary flex items-center justify-center">
      <div className="macos-glass px-6 py-6 flex flex-col items-center gap-4">
        <img 
          src="/gdg-logo.svg" 
          alt="Loading" 
          className="w-16 h-16 object-contain bg-transparent animate-pulse" 
        />
        <span className="font-medium text-sm tracking-wide">{label}</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
