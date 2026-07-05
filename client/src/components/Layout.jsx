import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import { useIdleTimeout } from "../hooks/useIdleTimeout";
import { useAuth } from "../context/useAuth";
import toast from "react-hot-toast";

const Layout = ({ onLogout }) => {
  const location = useLocation();
  const { user } = useAuth();
  const MotionContainer = motion.div;

  // Log out after 20 minutes of true inactivity (no mouse moves, typing, etc.)
useIdleTimeout(() => {
    toast('You were logged out due to inactivity.', {
      icon: '💤',
      id: 'idle-logout',
      style: {
        background: '#0f1115',
        color: '#fff',
        border: '1px solid rgba(168,85,247,0.3)',
      }
    });
    onLogout();
  }, 20 * 60 * 1000);

  const isFullWidth = location.pathname.startsWith("/challenge/") || location.pathname.startsWith("/submission/");

  return (
    <div className="min-h-screen flex flex-col bg-app text-primary transition-colors duration-300">
      {/* 1. Animated Background Layer */}
      <div className="cosmos-background">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* 2. Top Navigation */}
      {user?.usernameSet !== false && <Navbar onLogout={onLogout} />}

      {/* 3. Main Content Area */}
      <main className={`mx-auto flex-1 w-full ${isFullWidth ? "max-w-none px-0 py-0" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-8"}`}>
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

      {/* Footer */}
      {!isFullWidth && <Footer />}
    </div>
  );
};

export default Layout;
