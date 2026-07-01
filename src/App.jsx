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
    </div>
  );
}

function NotesView({ notes, addNote }) {
  const [prompt, setPrompt] = useState(brainDumpPrompts[0]);
  const [title, setTitle] = useState("Brain Dump");
  const [body, setBody] = useState("");

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Notes</h1>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Prompt</h2>
        <select
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 mb-2"
        >
          {brainDumpPrompts.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <p className="text-zinc-200 font-medium text-sm">{prompt}</p>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Write</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 mb-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder="Write here…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        />
        <button
          onClick={() => {
            if (!body.trim()) return;
            addNote({ title: title || "Brain Dump", prompt, body });
            setBody("");
            setTitle("Brain Dump");
          }}
          className="mt-3 w-full bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold"
        >
          Save Note
        </button>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Recent Notes</h2>
        {notes.length === 0 && <p className="text-sm text-zinc-600">No notes yet.</p>}
        <div className="space-y-3">
          {notes.slice(0, 10).map((n) => (
            <div key={n.id} className="border-b border-zinc-800/70 pb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-zinc-100">{n.title}</span>
                <span className="text-[10px] text-zinc-600 font-mono">{n.date}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{n.prompt}</p>
              <p className="text-sm text-zinc-300 mt-1 line-clamp-3">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between py-2.5 border-b border-zinc-800/70"
    >
      <span className="text-sm text-zinc-200 text-left">{label}</span>
      <span
        className={
          "w-11 h-6 rounded-full relative transition-colors shrink-0 " +
          (checked ? "bg-emerald-600" : "bg-zinc-700")
        }
      >
        <span
          className={
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </span>
    </button>
  );
}

function WeeklyView({ weekly, setWeekly }) {
  const set = (k) => (v) => setWeekly((prev) => ({ ...prev, [k]: v }));
  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Weekly Review</h1>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Scorecard</h2>
        <Toggle label="Bible consistency" checked={weekly.didBible} onChange={set("didBible")} />
        <Toggle label="Prayer consistency" checked={weekly.didPrayer} onChange={set("didPrayer")} />
        <Toggle label="Workout #1" checked={weekly.workoutOne} onChange={set("workoutOne")} />
        <Toggle label="Workout #2" checked={weekly.workoutTwo} onChange={set("workoutTwo")} />
        <Toggle label="Intentional marriage time" checked={weekly.marriage} onChange={set("marriage")} />
        <Toggle label="Intentional family activity" checked={weekly.family} onChange={set("family")} />
        <Toggle label="Weekly planning" checked={weekly.planning} onChange={set("planning")} />
        <Toggle label="Home reset most days" checked={weekly.homeReset} onChange={set("homeReset")} />
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Reflection</h2>
        <p className="text-sm text-zinc-400 mb-2">What went well? What needs to change next week?</p>
        <textarea
          value={weekly.reflection}
          onChange={(e) => setWeekly((prev) => ({ ...prev, reflection: e.target.value }))}
          rows={7}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        />
      </div>
    </div>
  );
}

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function findEntry(history, log, dateObj) {
  const ds = dateObj.toDateString();
  if (ds === todayStr()) {
    const total = log.tasks.length;
    const done = log.tasks.filter((t) => t.complete).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { date: ds, mode: log.mode, pct, done, total };
  }
  return history.find((h) => h.date === ds) || null;
}

function DashboardView({ history, log }) {
  const week = getLastNDays(7).map((d) => ({ d, entry: findEntry(history, log, d) }));
  const month = getLastNDays(30).map((d) => ({ d, entry: findEntry(history, log, d) }));

  const withData = (arr) => arr.filter((x) => x.entry);
  const avg = (arr) => {
    const w = withData(arr);
    if (!w.length) return 0;
    return Math.round(w.reduce((s, x) => s + x.entry.pct, 0) / w.length);
  };
  const modeCounts = (arr) => {
    const c = { Green: 0, Yellow: 0, Red: 0 };
    withData(arr).forEach((x) => { c[x.entry.mode] = (c[x.entry.mode] || 0) + 1; });
    return c;
  };

  const weekAvg = avg(week);
  const monthAvg = avg(month);
  const weekModes = modeCounts(week);
  const monthModes = modeCounts(month);
  const monthDaysTracked = withData(month).length;
  const dayLabel = (d) => d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);

  return (
    <div className="px-4 pb-6 pt-5 space-y-8">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Dashboard</h1>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">This Week</h2>
          <span className="text-sm font-mono text-zinc-300">{weekAvg}% avg</span>
        </div>
        <div className="flex items-end gap-2 h-28">
          {week.map(({ d, entry }, i) => {
            const pct = entry ? entry.pct : 0;
            const info = entry ? modeInfo(entry.mode) : null;
            const isToday = d.toDateString() === todayStr();
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end bg-zinc-900 rounded-md overflow-hidden">
                  <div
                    className={"w-full rounded-md transition-all " + (entry ? info.bar : "bg-zinc-800")}
                    style={{ height: (entry ? Math.max(pct, 4) : 0) + "%" }}
                  />
                </div>
                <span className={"text-[10px] font-mono " + (isToday ? "text-zinc-200" : "text-zinc-500")}>
                  {dayLabel(d)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />{weekModes.Green} green
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />{weekModes.Yellow} yellow
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />{weekModes.Red} red
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">This Month</h2>
          <span className="text-sm font-mono text-zinc-300">{monthAvg}% avg</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
            <div className="text-xl font-display text-zinc-100">{monthDaysTracked}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Days tracked</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
            <div className="text-xl font-display text-emerald-400">{monthModes.Green}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Green days</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
            <div className="text-xl font-display text-red-400">{monthModes.Red}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Red days</div>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-1">
          {month.map(({ d, entry }, i) => {
            const info = entry ? modeInfo(entry.mode) : null;
            const opacity = entry ? 0.35 + (entry.pct / 100) * 0.65 : 0.4;
            return (
              <div
                key={i}
                title={d.toDateString() + (entry ? ` — ${entry.pct}%` : " — no data")}
                className={"aspect-square rounded-sm " + (entry ? info.bar : "bg-zinc-800")}
                style={{ opacity }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 font-mono mt-2">last 30 days, oldest → newest</p>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Settings</h1>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Reminders</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 flex gap-3">
          <Bell size={18} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-400">
            This is a web app, so it can't schedule iPhone push notifications directly. Set alarms in the
            Reminders or Clock app for: 5:00 AM morning brief, 12:00 PM lunch reset, 5:30 PM transition home,
            8:40 PM evening reset, 9:20 PM shutdown.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Principles</h2>
        <div className="space-y-2">
          {[
            "Never trust memory.",
            "Make tasks smaller than necessary.",
            "Plan for bad days.",
            "Consistency beats intensity.",
            "Never miss the appointment with God.",
          ].map((p) => (
            <p key={p} className="text-sm text-zinc-300 border-b border-zinc-800/70 pb-2">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Root ----------

export default function LanceOS() {
  const [tab, setTab] = useState("today");
  const [log, setLog] = useState(() => {
    const stored = loadKey("dailyLog", null);
    return stored && stored.date === todayStr() ? stored : freshLog(true);
  });
  const [notes, setNotes] = useState(() => loadKey("notes", []));
  const [weekly, setWeekly] = useState(() => loadKey("weekly", weeklyDefault));
  const [history, setHistory] = useState(() => loadKey("history", []));
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const firstRun = useRef(true);

  // Archive yesterday's (or older) daily log into history the first time the app
  // is opened on a new day, so weekly/monthly progress has something to show.
  useEffect(() => {
    const stored = loadKey("dailyLog", null);
    if (stored && stored.date !== todayStr() && stored.tasks && stored.tasks.length) {
      const total = stored.tasks.length;
      const done = stored.tasks.filter((t) => t.complete).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      setHistory((prev) => {
        if (prev.some((h) => h.date === stored.date)) return prev;
        const next = [
          ...prev,
          { date: stored.date, mode: stored.mode, pct, done, total, winToday: stored.winToday },
        ].slice(-120); // keep ~4 months
        saveKey("history", next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveKey("dailyLog", log);
      setSaving(false);
    }, 300);
  }, [log]);

  useEffect(() => { saveKey("notes", notes); }, [notes]);
  useEffect(() => { saveKey("weekly", weekly); }, [weekly]);

  const addNote = ({ title, prompt, body }) => {
    setNotes((prev) => [
      { id: crypto.randomUUID(), date: new Date().toLocaleDateString(), title, prompt, body },
      ...prev,
    ]);
  };

  const info = modeInfo(log.mode);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className={"h-1 w-full " + info.bar} />

      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full">
        {tab === "today" && <TodayView log={log} setLog={setLog} saving={saving} />}
        {tab === "faith" && <FaithView addNote={addNote} />}
        {tab === "notes" && <NotesView notes={notes} addNote={addNote} />}
        {tab === "weekly" && <WeeklyView weekly={weekly} setWeekly={setWeekly} />}
        {tab === "dashboard" && <DashboardView history={history} log={log} />}
        {tab === "settings" && <SettingsView />}
      </div>

      <div className="max-w-md mx-auto w-full border-t border-zinc-800 bg-zinc-950/95 backdrop-blur flex">
        <TabButton active={tab === "today"} onClick={() => setTab("today")} icon={CalendarCheck2} label="Today" accent={info.text} />
        <TabButton active={tab === "faith"} onClick={() => setTab("faith")} icon={BookOpen} label="Faith" accent={info.text} />
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={NotebookPen} label="Notes" accent={info.text} />
        <TabButton active={tab === "weekly"} onClick={() => setTab("weekly")} icon={CalendarCheck2} label="Weekly" accent={info.text} />
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={BarChart3} label="Stats" accent={info.text} />
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings2} label="Settings" accent={info.text} />
      </div>
    </div>
  );
}
