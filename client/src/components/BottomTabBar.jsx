import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiGrid, FiTarget, FiAward, FiUser } from "react-icons/fi";
import { clsx } from "clsx";

const TABS = [
  { name: "Dashboard", path: "/dashboard", icon: FiGrid },
  { name: "Missions", path: "/missions", icon: FiTarget },
  { name: "Ranks", path: "/leaderboard", icon: FiAward },
  { name: "Profile", path: "/profile", icon: FiUser },
];

// Mobile-only primary navigation. Secondary destinations stay in the
// Navbar hamburger drawer.
const BottomTabBar = () => {
  const location = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 surface-overlay border-t border-subtle"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ name, path, icon: Icon }) => {
          const isActive =
            path === "/profile"
              ? location.pathname === "/profile"
              : location.pathname.startsWith(path);
          return (
            <li key={path}>
              <NavLink
                to={path}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2 min-h-[52px] text-[0.68rem] font-semibold transition-colors",
                  isActive ? "text-accent" : "text-secondary",
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                <span>{name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
