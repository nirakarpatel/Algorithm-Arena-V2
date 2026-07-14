import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Logo from "../components/Logo";

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
      {(() => {
        const isFullBleed = location.pathname.startsWith("/challenge/") || location.pathname.startsWith("/submission/");
        const isFullWidth = isFullBleed || location.pathname === "/";
        return (
          <main className={`mx-auto flex-1 w-full ${isFullBleed ? "max-w-none px-0 py-0" : isFullWidth ? "max-w-none px-4 sm:px-6 lg:px-8 py-8" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-8"}`}>
            <AnimatePresence mode="wait" initial={false}>
              <MotionContainer
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="w-full h-full flex flex-col"
              >
                <Outlet />
              </MotionContainer>
            </AnimatePresence>
          </main>
        );
      })()}

      {/* Footer */}
      <footer
        className="relative z-10 mt-auto py-6 w-full"
        style={{
          borderTop: `1px solid rgba(var(--accent-rgb), 0.08)`,
          background: `rgba(var(--accent-rgb), 0.02)`,
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Logo variant="gdg" size="w-10 h-10" imgClassName="opacity-100" />
          <p className="text-xs text-secondary tracking-wide text-center">
            © 2026 Algorithm Arena ·{" "}
            <span className="text-primary font-bold">GDG On Campus – SOA ITER</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
