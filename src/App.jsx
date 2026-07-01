import { useState, useEffect, useRef } from "react";
import { Check, Circle, BookOpen, NotebookPen, CalendarCheck2, Settings2, RotateCcw, Bell, BarChart3 } from "lucide-react";

// ---------- Data ----------

const MODES = [
  { key: "Green", label: "Green", desc: "Normal day. Full routine available.", text: "text-emerald-400", bg: "bg-emerald-600", bar: "bg-emerald-500" },
  { key: "Yellow", label: "Yellow", desc: "Busy day. Keep anchors, reduce load.", text: "text-amber-400", bg: "bg-amber-600", bar: "bg-amber-500" },
  { key: "Red", label: "Red", desc: "Survival day. Essentials only. No guilt.", text: "text-red-400", bg: "bg-red-600", bar: "bg-red-500" },
];

const modeInfo = (key) => MODES.find((m) => m.key === key) || MODES[0];

const workdayTasks = [
  { id: "wd-0", time: "4:50 AM", title: "Get out of bed immediately", category: "Health", essential: false },
  { id: "wd-1", time: "4:55 AM", title: "Drink water", category: "Health", essential: true },
  { id: "wd-2", time: "5:00 AM", title: "Read Scripture", category: "Faith", essential: true },
  { id: "wd-3", time: "5:10 AM", title: "Pray", category: "Faith", essential: true },
  { id: "wd-4", time: "5:20 AM", title: "Get ready and grab lunch", category: "Home", essential: false },
  { id: "wd-5", time: "5:30 AM", title: "Leave for work", category: "Work", essential: false },
  { id: "wd-6", time: "6:00 AM", title: "Review calendar and DOP", category: "Work", essential: false },
  { id: "wd-7", time: "6:10 AM", title: "Choose Top 3 priorities", category: "Work", essential: false },
  { id: "wd-8", time: "12:00 PM", title: "Lunch reset: eat, water, 5-minute walk", category: "Health", essential: false },
  { id: "wd-9", time: "5:00 PM", title: "Capture unfinished tasks", category: "Work", essential: false },
  { id: "wd-10", time: "5:30 PM", title: "Transition: work is over, home begins", category: "Family", essential: true },
  { id: "wd-11", time: "5:45 PM", title: "Help with dinner / be present", category: "Family", essential: false },
  { id: "wd-12", time: "7:15 PM", title: "Family time with phone away", category: "Family", essential: true },
  { id: "wd-13", time: "8:30 PM", title: "Five-minute house reset", category: "Home", essential: true },
  { id: "wd-14", time: "8:40 PM", title: "Ask Angelynna what you can take off her plate", category: "Family", essential: true },
  { id: "wd-15", time: "9:00 PM", title: "Review tomorrow and brain dump", category: "Shutdown", essential: false },
  { id: "wd-16", time: "9:20 PM", title: "Phone away / lights out", category: "Shutdown", essential: false },
];

const offdayTasks = [
  { id: "od-0", time: "6:30 AM", title: "Wake up and drink water", category: "Health", essential: true },
  { id: "od-1", time: "6:40 AM", title: "Read Scripture", category: "Faith", essential: true },
  { id: "od-2", time: "6:50 AM", title: "Pray", category: "Faith", essential: true },
  { id: "od-3", time: "7:15 AM", title: "Review calendar and Top 3", category: "Work", essential: false },
  { id: "od-4", time: "8:00 AM", title: "Workout or walk", category: "Health", essential: false },
  { id: "od-5", time: "10:00 AM", title: "Home reset / errands", category: "Home", essential: false },
  { id: "od-6", time: "12:00 PM", title: "Lunch and water", category: "Health", essential: false },
  { id: "od-7", time: "2:00 PM", title: "Project / church prep / family block", category: "Work", essential: false },
  { id: "od-8", time: "5:30 PM", title: "Dinner and family time", category: "Family", essential: false },
  { id: "od-9", time: "8:30 PM", title: "Five-minute house reset", category: "Home", essential: true },
  { id: "od-10", time: "9:00 PM", title: "Review tomorrow and brain dump", category: "Shutdown", essential: false },
];

const redDayTasks = workdayTasks.filter((t) => t.essential);

const brainDumpPrompts = [
  "What is taking up the most mental space right now?",
  "What am I avoiding because it feels too big?",
  "What is one small next step I can take?",
  "What does Angelynna need from me today?",
  "What does my daughter need from me today?",
  "What do I need to surrender to God today?",
  "What task needs to leave my head and go into a system?",
  "What would make tomorrow easier?",
];

const faithPrompt = "What is God showing me today, and what is one way I need to obey?";

const freshTasks = (list) => list.map((t) => ({ ...t, complete: false }));

const todayStr = () => new Date().toDateString();

const freshLog = (workday = true) => ({
  date: todayStr(),
  mode: "Green",
  tasks: freshTasks(workday ? workdayTasks : offdayTasks),
  topThree: ["", "", ""],
  winToday: "",
});

const weeklyDefault = {
  didBible: false,
  didPrayer: false,
  workoutOne: false,
  workoutTwo: false,
  marriage: false,
  family: false,
  planning: false,
  homeReset: false,
  reflection: "",
};

// ---------- Storage helpers (standard browser localStorage) ----------

function loadKey(key, fallback) {
  try {
    const raw = localStorage.getItem("lanceos." + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Storage load failed", key, e);
  }
  return fallback;
}

function saveKey(key, value) {
  try {
    localStorage.setItem("lanceos." + key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save failed", key, e);
  }
}

// ---------- UI bits ----------

function ModeSegment({ mode, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((m) => {
        const active = m.key === mode;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={
              "py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors " +
              (active ? m.bg + " text-white" : "bg-zinc-800 text-zinc-400")
            }
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function CategoryTag({ category }) {
  return (
    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
      {category}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, label, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
    >
      <Icon size={20} className={active ? accent : "text-zinc-500"} strokeWidth={active ? 2.4 : 1.8} />
      <span className={"text-[10px] font-medium tracking-wide " + (active ? accent : "text-zinc-500")}>
        {label}
      </span>
    </button>
  );
}

// ---------- Views ----------

function TodayView({ log, setLog, saving }) {
  const info = modeInfo(log.mode);
  const total = log.tasks.length;
  const done = log.tasks.filter((t) => t.complete).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const setMode = (key) => {
    setLog((prev) => {
      let tasks = prev.tasks;
      if (key === "Red") {
        tasks = freshTasks(redDayTasks);
      } else if (prev.tasks.length < workdayTasks.length) {
        tasks = freshTasks(workdayTasks);
      }
      return { ...prev, mode: key, tasks };
    });
  };

  const toggleTask = (id) => {
    setLog((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, complete: !t.complete } : t)),
    }));
  };

  const setTopThree = (i, val) => {
    setLog((prev) => {
      const next = [...prev.topThree];
      next[i] = val;
      return { ...prev, topThree: next };
    });
  };

  const resetDay = (workday) => setLog(freshLog(workday));

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Lance OS</h1>
          <div className="flex gap-3 text-xs">
            <button onClick={() => resetDay(true)} className="text-zinc-500 flex items-center gap-1">
              <RotateCcw size={12} /> Workday
            </button>
            <button onClick={() => resetDay(false)} className="text-zinc-500 flex items-center gap-1">
              <RotateCcw size={12} /> Off day
            </button>
          </div>
        </div>
        <p className="text-zinc-400 text-sm">Become dependable today.</p>
      </div>

      <div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={"h-full rounded-full transition-all duration-300 " + info.bar}
            style={{ width: pct + "%" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-zinc-500 font-mono">
          <span>{pct}% complete</span>
          <span>{done}/{total}</span>
        </div>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Mode</h2>
        <ModeSegment mode={log.mode} onChange={setMode} />
        <p className={"text-sm mt-2 " + info.text}>{info.desc}</p>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Top 3</h2>
        <div className="space-y-2">
          {log.topThree.map((v, i) => (
            <input
              key={i}
              value={v}
              onChange={(e) => setTopThree(i, e.target.value)}
              placeholder={`Priority ${i + 1}`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Checklist</h2>
        <div className="space-y-1">
          {log.tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className="w-full flex items-start gap-3 text-left px-1 py-2 border-b border-zinc-800/70"
            >
              {t.complete ? (
                <Check size={18} className={info.text + " mt-0.5 shrink-0"} />
              ) : (
                <Circle size={18} className="text-zinc-600 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className={"text-sm " + (t.complete ? "line-through text-zinc-500" : "text-zinc-200")}>
                  <span className="font-mono text-zinc-500 mr-1.5">{t.time}</span>
                  {t.title}
                </div>
                <CategoryTag category={t.category} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Win Today</h2>
        <textarea
          value={log.winToday}
          onChange={(e) => setLog((prev) => ({ ...prev, winToday: e.target.value }))}
          placeholder="What was one win today?"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        />
      </div>

      <div className="text-[10px] text-zinc-600 font-mono">{saving ? "saving…" : "saved"}</div>
    </div>
  );
}

function FaithView({ addNote }) {
  const [body, setBody] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Faith</h1>

      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 space-y-1.5">
        <p className="text-sm text-zinc-200">Never miss the appointment. Length can change. The appointment does not.</p>
        <p className="text-xs text-zinc-500">Red Day Minimum: one Psalm + three minutes of prayer.</p>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Prompt</h2>
        <p className="text-zinc-200 font-medium mb-3">{faithPrompt}</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder="Write here…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-700"
        />
        <button
          onClick={() => {
            if (!body.trim()) return;
            addNote({ title: "Faith Note", prompt: faithPrompt, body });
            setBody("");
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
          }}
          className="mt-3 w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold"
        >
          {savedFlash ? "Saved" : "Save Faith Note"}
        </button>
      </div>
    
