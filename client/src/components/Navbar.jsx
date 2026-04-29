import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiCpu,
  FiGrid,
  FiAward,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiShield,
} from "react-icons/fi";
import { clsx } from "clsx";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "./ThemeToggle";

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { role } = useAuth();

  const navItems = [
    { name: "Mission Control", path: "/dashboard", icon: FiGrid },
    { name: "Leaderboard", path: "/leaderboard", icon: FiAward },
    { name: "Profile", path: "/profile", icon: FiUser },
  ];

  if (role === "admin") {
    navItems.push({ name: "Admin", path: "/admin", icon: FiShield });
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-glass-surface backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-10">
            <Link

              to="/"
              className="flex items-center gap-2 group"
              onClick={closeMenu}
            >
              <span className="font-bold text-xl tracking-tight text-primary group-hover:text-accent transition-colors">
                AlgoArena
              </span>
            </Link>
            {/* <ThemeToggle />*/}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-secondary hover:text-primary hover:bg-white/5",
                    )}
                  >
                    <Icon
                      className={clsx(
                        "text-lg",
                        isActive ? "text-accent" : "text-secondary",
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={onLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
              >
                <FiLogOut className="text-lg" />
                <span>Log out</span>
              </button>
              <button
                className="md:hidden p-2 rounded-lg border border-glass-border text-primary"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={
                  menuOpen ? "Close navigation menu" : "Open navigation menu"
                }
                aria-expanded={menuOpen}
              >
                {menuOpen ? (
                  <FiX className="text-xl" />
                ) : (
                  <FiMenu className="text-xl" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "md:hidden fixed top-16 right-0 z-50 w-72 h-[calc(100vh-4rem)] bg-glass-surface backdrop-blur-xl border-l border-glass-border transform transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Mobile navigation"
      >
        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={clsx(
                  "flex items-center gap-3 px-3 py-3 rounded-lg",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-primary hover:bg-white/10",
                )}
              >
                <Icon />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => {
              closeMenu();
              onLogout();
            }}
            className="w-full mt-3 flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10"
          >
            <FiLogOut />
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
