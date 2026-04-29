import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = ({ onLogout }) => {
  const location = useLocation();
  const MotionContainer = motion.div;

  return (
    <div className="min-h-screen flex flex-col bg-app text-primary transition-colors duration-300">
      {/* 1. Animated Background Layer */}
      <div className="cosmos-background">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* 2. Top Navigation */}
      <Navbar onLogout={onLogout} />

      {/* 3. Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <AnimatePresence mode="wait" initial={false}>
          <MotionContainer
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <Outlet />
          </MotionContainer>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-glass-border/40 py-8 text-center w-full mt-auto bg-black/5">
        <p className="text-sm text-secondary">
          Copyright 2026 Algorithm Arena. Built for{" "}
          <span className="text-primary font-semibold">
            GDG On Campus - SOA ITER
          </span>
          .
        </p>
      </footer>
    </div>
  );
};

export default Layout;
