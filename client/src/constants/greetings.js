export const GREETINGS = {
  morning: [
    {
      heading: "Good Morning, {username}",
      subtext: "Wake up your brain. Today’s logic is waiting to be optimized."
    },
    {
      heading: "Rise and Code, {username}",
      subtext: "A fresh start and a clear stack. Let’s tackle some new structures."
    },
    {
      heading: "Morning Brew, {username}",
      subtext: "Coffee: 1, Algorithms: 0. Let's even the score before your first lecture."
    },
    {
      heading: "System Booted, {username}",
      subtext: "Your synapses are firing at $O(1)$. Time to crush the daily challenge."
    }
  ],
  afternoon: [
    {
      heading: "Good Afternoon, {username}",
      subtext: "Power through the midday slump with some efficiency."
    },
    {
      heading: "Back for more, {username}?",
      subtext: "Keep the momentum going. Your next challenge is ready for deployment."
    },
    {
      heading: "Class is out, {username}",
      subtext: "Switching from theory to practice. Let’s build something real."
    },
    {
      heading: "Midday Grind, {username}",
      subtext: "Don't let the afternoon lag hit your productivity. Optimize your path."
    }
  ],
  evening: [
    {
      heading: "Good Evening, {username}",
      subtext: "The sun is down, the IDE is up. Time to master those edge cases."
    },
    {
      heading: "Prime Time, {username}",
      subtext: "Peak focus hours have arrived. Let’s turn logic into clean code."
    },
    {
      heading: "Placement Prep, {username}?",
      subtext: "Those FAANG-level problems aren't going to solve themselves. Let's get to work."
    },
    {
      heading: "Level Up, {username}",
      subtext: "The evening is young and the compiler is ready. What are we shipping tonight?"
    }
  ],
  lateNight: [
    {
      heading: "Still Grinding, {username}?",
      subtext: "Dark mode on, distractions off. Let’s squash those remaining bugs."
    },
    {
      heading: "Midnight Logic, {username}",
      subtext: "The best solutions are often found in the quietest hours."
    },
    {
      heading: "Insomniac Mode, {username}",
      subtext: "While the world sleeps, you're becoming a devmaster. Stay focused."
    },
    {
      heading: "Bug Hunting, {username}?",
      subtext: "Nothing beats the feeling of a late-night 'All Test Cases Passed' screen."
    }
  ]
};

/**
 * Returns the greeting category based on the current hour of the day
 */
export const getTimeCategory = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "lateNight";
};

/**
 * Returns a greeting selected once per session to maintain consistency across navigation.
 */
export const getSessionGreeting = () => {
  const SESSION_KEY = "algo_arena_session_greeting";
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("sessionStorage reading error:", e);
  }

  const category = getTimeCategory();
  const list = GREETINGS[category];
  const index = Math.floor(Math.random() * list.length);
  const selected = list[index];

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(selected));
  } catch (e) {
    console.error("sessionStorage writing error:", e);
  }

  return selected;
};
