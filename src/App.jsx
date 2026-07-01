import { useState, useEffect, useRef } from "react";
import {
  Check, X, BookOpen, NotebookPen, CalendarCheck2, Settings2, RotateCcw,
  Bell, BarChart3, ChevronLeft, ChevronRight, Copy, Download, Upload,
} from "lucide-react";

// ---------- Data ----------

const MODES = [
  { key: "Green", label: "Green", desc: "Normal day. Full routine available.", text: "text-emerald-400", bg: "bg-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "Yellow", label: "Yellow", desc: "Busy day. Keep anchors, reduce load.", text: "text-amber-400", bg: "bg-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" },
  { key: "Red", label: "Red", desc: "Survival day. Essentials only. No guilt.", text: "text-red-400", bg: "bg-red-600", bar: "bg-red-500", dot: "bg-red-500" },
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

const defaultScorecardItems = [
  { key: "didBible", label: "Bible consistency" },
  { key: "didPrayer", label: "Prayer consistency" },
  { key: "workoutOne", label: "Workout #1" },
  { key: "workoutTwo", label: "Workout #2" },
  { key: "marriage", label: "Intentional marriage time" },
  { key: "family", label: "Intentional family activity" },
  { key: "planning", label: "Weekly planning" },
  { key: "homeReset", label: "Home reset most days" },
];

const freshTasks = (list, overrides = {}) =>
  list.map((t) => ({ ...t, ...(overrides[t.id] || {}), status: "unanswered" }));

const todayStr = () => new Date().toDateString();

const freshLog = (workday = true, overrides = {}) => ({
  date: todayStr(),
  mode: "Green",
  tasks: freshTasks(workday ? workdayTasks : offdayTasks, overrides),
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

function migrateTask(t) {
  if (t.status) return t;
  return { ...t, status: t.complete ? "done" : "unanswered" };
}

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

// ---------- Date helpers ----------

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function weeksInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks = [];
  let cursor = startOfWeek(first);
  while (cursor <= last) {
    weeks.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
function buildEntryMap(history, log) {
  const map = {};
  history.forEach((h) => { map[h.date] = h; });
  const total = log.tasks.length;
  const done = log.tasks.filter((t) => t.status === "done").length;
  const failed = log.tasks.filter((t) => t.status === "failed").length;
  const unanswered = total - done - failed;
  map[todayStr()] = {
    date: todayStr(), mode: log.mode, done, failed, unanswered, total,
    topThree: log.topThree, winToday: log.winToday, tasks: log.tasks,
  };
  return map;
}
function aggregate(map, dates) {
  const entries = dates.map((d) => map[d.toDateString()]).filter(Boolean);
  const modeCounts = { Green: 0, Yellow: 0, Red: 0 };
  let doneSum = 0, failSum = 0, unansSum = 0, totalSum = 0;
  entries.forEach((e) => {
    doneSum += e.done; failSum += e.failed; unansSum += e.unanswered; totalSum += e.total;
    modeCounts[e.mode] = (modeCounts[e.mode] || 0) + 1;
  });
  return {
    donePct: totalSum ? Math.round((doneSum / totalSum) * 100) : 0,
    failedPct: totalSum ? Math.round((failSum / totalSum) * 100) : 0,
    unansweredPct: totalSum ? Math.round((unansSum / totalSum) * 100) : 0,
    days: entries.length,
    modeCounts,
  };
}

// ---------- Long-press hook ----------

function useLongPress(onLongPress, ms = 480) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = () => {
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, ms);
  };
  const clear = () => { if (timer.current) clearTimeout(timer.current); };
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
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

function StatBar({ donePct, failedPct, unansweredPct }) {
  return (
    <div className="h-2.5 rounded-full overflow-hidden bg-zinc-800 flex">
      <div className="bg-emerald-500 h-full" style={{ width: donePct + "%" }} />
      <div className="bg-red-500 h-full" style={{ width: failedPct + "%" }} />
      <div className="bg-zinc-600 h-full" style={{ width: unansweredPct + "%" }} />
    </div>
  );
}

function Toggle({ label, checked, onChange, onEditLabel }) {
  const longPress = useLongPress(onEditLabel);
  return (
    <div className="w-full flex items-center justify-between py-2.5 border-b border-zinc-800/70">
      <button
        {...longPress}
        onDoubleClick={onEditLabel}
        className="text-sm text-zinc-200 text-left flex-1 pr-3 select-none"
      >
        {label}
      </button>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full relative shrink-0"
        style={{ backgroundColor: checked ? "#059669" : "#3f3f46", transition: "background-color 150ms" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white block"
          style={{ transform: checked ? "translateX(20px)" : "translateX(2px)", transition: "transform 150ms" }}
        />
      </button>
    </div>
  );
}

function EditTaskModal({ task, onSave, onCancel }) {
  const [title, setTitle] = useState(task.title);
  const [time, setTime] = useState(task.time);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Edit Task</h3>
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Time (e.g. 5:00 AM)"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-semibold">Cancel</button>
          <button onClick={() => onSave(time, title)} className="flex-1 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

function EditLabelModal({ label, onSave, onCancel }) {
  const [value, setValue] = useState(label);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Edit Label</h3>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-semibold">Cancel</button>
          <button onClick={() => onSave(value)} className="flex-1 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {message && <p className="text-sm text-zinc-400">{message}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-semibold">Cancel</button>
          <button
            onClick={onConfirm}
            className={"flex-1 py-2.5 rounded-lg text-sm font-semibold " + (danger ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-900")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onSetStatus, onEdit }) {
  const longPress = useLongPress(() => onEdit(task));
  const isDone = task.status === "done";
  const isFailed = task.status === "failed";
  return (
    <div
      {...longPress}
      onDoubleClick={() => onEdit(task)}
      className="flex items-start gap-3 px-1 py-2 border-b border-zinc-800/70 select-none"
    >
      <div className="flex gap-1 mt-0.5 shrink-0">
        <button
          onClick={() => onSetStatus(task.id, isDone ? "unanswered" : "done")}
          className={"w-6 h-6 rounded-md flex items-center justify-center border " + (isDone ? "bg-emerald-600 border-emerald-600" : "border-zinc-700")}
        >
          <Check size={14} className={isDone ? "text-white" : "text-zinc-600"} />
        </button>
        <button
          onClick={() => onSetStatus(task.id, isFailed ? "unanswered" : "failed")}
          className={"w-6 h-6 rounded-md flex items-center justify-center border " + (isFailed ? "bg-red-600 border-red-600" : "border-zinc-700")}
        >
          <X size={14} className={isFailed ? "text-white" : "text-zinc-600"} />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className={"text-sm " + (isDone ? "line-through text-zinc-500" : isFailed ? "text-red-400 line-through" : "text-zinc-200")}>
          <span className="font-mono text-zinc-500 mr-1.5">{task.time}</span>
          {task.title}
        </div>
        <CategoryTag category={task.category} />
      </div>
    </div>
  );
}

// ---------- Views ----------

function TodayView({ log, setLog, saving, taskOverrides, setTaskOverrides }) {
  const info = modeInfo(log.mode);
  const total = log.tasks.length;
  const done = log.tasks.filter((t) => t.status === "done").length;
  const failed = log.tasks.filter((t) => t.status === "failed").length;
  const unanswered = total - done - failed;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const failedPct = total ? Math.round((failed / total) * 100) : 0;
  const unansweredPct = total ? Math.round((unanswered / total) * 100) : 0;

  const [editingTask, setEditingTask] = useState(null);
  const [pendingReset, setPendingReset] = useState(null); // "workday" | "offday" | null

  const setMode = (key) => {
    setLog((prev) => {
      let tasks = prev.tasks;
      if (key === "Red") {
        tasks = freshTasks(redDayTasks, taskOverrides);
      } else if (prev.tasks.length < workdayTasks.length) {
        tasks = freshTasks(workdayTasks, taskOverrides);
      }
      return { ...prev, mode: key, tasks };
    });
  };

  const setStatus = (id, status) => {
    setLog((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  };

  const setTopThree = (i, val) => {
    setLog((prev) => {
      const next = [...prev.topThree];
      next[i] = val;
      return { ...prev, topThree: next };
    });
  };

  const resetDay = (workday) => setPendingReset(workday ? "workday" : "offday");
  const confirmReset = () => {
    setLog(freshLog(pendingReset === "workday", taskOverrides));
    setPendingReset(null);
  };

  const saveTaskEdit = (time, title) => {
    setLog((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === editingTask.id ? { ...t, time, title } : t)),
    }));
    setTaskOverrides((prev) => {
      const next = { ...prev, [editingTask.id]: { time, title } };
      saveKey("taskOverrides", next);
      return next;
    });
    setEditingTask(null);
  };

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
        <StatBar donePct={donePct} failedPct={failedPct} unansweredPct={unansweredPct} />
        <div className="flex justify-between mt-1.5 text-xs text-zinc-500 font-mono">
          <span>{donePct}% done · {failedPct}% failed · {unansweredPct}% not answered</span>
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Checklist</h2>
          <span className="text-[10px] text-zinc-600 font-mono">long-press to edit</span>
        </div>
        <div className="space-y-1">
          {log.tasks.map((t) => (
            <TaskRow key={t.id} task={t} onSetStatus={setStatus} onEdit={setEditingTask} />
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

      {editingTask && (
        <EditTaskModal task={editingTask} onSave={saveTaskEdit} onCancel={() => setEditingTask(null)} />
      )}

      {pendingReset && (
        <ConfirmModal
          title={`Reset to ${pendingReset === "workday" ? "Workday" : "Off day"} checklist?`}
          message="This clears today's progress, Top 3, and Win — can't be undone."
          confirmLabel="Reset"
          danger
          onConfirm={confirmReset}
          onCancel={() => setPendingReset(null)}
        />
      )}
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
            addNote({ title: "Faith Note", prompt: faithPrompt, body, type: "faith" });
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
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | faith | dump

  const filtered = notes.filter((n) => {
    if (filter === "all") return true;
    if (filter === "faith") return n.type === "faith";
    return n.type !== "faith"; // dump + legacy untyped notes
  });

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
            addNote({ title: title || "Brain Dump", prompt, body, type: "dump" });
            setBody("");
            setTitle("Brain Dump");
          }}
          className="mt-3 w-full bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold"
        >
          Save Note
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Recent Notes</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { key: "all", label: "All" },
            { key: "faith", label: "Faith" },
            { key: "dump", label: "Brain Dump" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "py-2 rounded-lg text-xs font-semibold tracking-wide " +
                (filter === f.key ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-sm text-zinc-600">No notes yet.</p>}
        <div className="space-y-3">
          {filtered.slice(0, 30).map((n) => {
            const expanded = expandedId === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setExpandedId(expanded ? null : n.id)}
                className="w-full text-left border-b border-zinc-800/70 pb-3"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-zinc-100">{n.title}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">{n.date}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{n.prompt}</p>
                <p className={"text-sm text-zinc-300 mt-1 " + (expanded ? "" : "line-clamp-3")}>{n.body}</p>
                <span className="text-[10px] text-zinc-600 mt-1 inline-block">
                  {expanded ? "Tap to collapse" : "Tap to read full note"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeeklyView({ weekly, setWeekly, scorecardItems, setScorecardItems }) {
  const [editingKey, setEditingKey] = useState(null);
  const set = (k) => (v) => setWeekly((prev) => ({ ...prev, [k]: v }));

  const saveLabel = (newLabel) => {
    setScorecardItems((prev) => prev.map((item) => (item.key === editingKey ? { ...item, label: newLabel } : item)));
    setEditingKey(null);
  };

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Weekly Review</h1>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Scorecard</h2>
          <span className="text-[10px] text-zinc-600 font-mono">long-press label to rename</span>
        </div>
        {scorecardItems.map((item) => (
          <Toggle
            key={item.key}
            label={item.label}
            checked={!!weekly[item.key]}
            onChange={set(item.key)}
            onEditLabel={() => setEditingKey(item.key)}
          />
        ))}
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

      {editingKey && (
        <EditLabelModal
          label={scorecardItems.find((i) => i.key === editingKey).label}
          onSave={saveLabel}
          onCancel={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}

function DashboardView({ history, log }) {
  const map = buildEntryMap(history, log);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [level, setLevel] = useState("month");
  const [monthCursor, setMonthCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState(today);

  const monthLabel = new Date(monthCursor.year, monthCursor.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weeks = weeksInMonth(monthCursor.year, monthCursor.month);
  const monthDays = [];
  {
    const d = new Date(monthCursor.year, monthCursor.month, 1);
    while (d.getMonth() === monthCursor.month) { monthDays.push(new Date(d)); d.setDate(d.getDate() + 1); }
  }
  const monthStats = aggregate(map, monthDays);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStats = aggregate(map, weekDays);

  const dayEntry = map[selectedDay.toDateString()] || null;

  const changeMonth = (delta) => {
    let m = monthCursor.month + delta, y = monthCursor.year;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setMonthCursor({ year: y, month: m });
  };
  const changeWeek = (delta) => setWeekStart(addDays(weekStart, delta * 7));

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Dashboard</h1>

      {level === "month" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => changeMonth(-1)}><ChevronLeft size={20} className="text-zinc-400" /></button>
            <span className="font-display text-lg text-zinc-100">{monthLabel}</span>
            <button onClick={() => changeMonth(1)}><ChevronRight size={20} className="text-zinc-400" /></button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-500 font-mono mb-1">
              <span>{monthStats.donePct}% done</span>
              <span>{monthStats.failedPct}% failed</span>
              <span>{monthStats.unansweredPct}% not answered</span>
            </div>
            <StatBar donePct={monthStats.donePct} failedPct={monthStats.failedPct} unansweredPct={monthStats.unansweredPct} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
              <div className="text-xl font-display text-zinc-100">{monthStats.days}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Days tracked</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
              <div className="text-xl font-display text-emerald-400">{monthStats.modeCounts.Green}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Green days</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-center">
              <div className="text-xl font-display text-red-400">{monthStats.modeCounts.Red}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-1">Red days</div>
            </div>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Weeks</h2>
            <div className="space-y-2">
              {weeks.map((ws, i) => {
                const wDays = Array.from({ length: 7 }, (_, d) => addDays(ws, d));
                const s = aggregate(map, wDays);
                const label = `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(ws, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                return (
                  <button
                    key={i}
                    onClick={() => { setWeekStart(ws); setLevel("week"); }}
                    className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex justify-between text-sm text-zinc-200 mb-1.5">
                      <span>{label}</span>
                      <span className="font-mono text-zinc-400">{s.donePct}%</span>
                    </div>
                    <StatBar donePct={s.donePct} failedPct={s.failedPct} unansweredPct={s.unansweredPct} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {level === "week" && (
        <>
          <button onClick={() => setLevel("month")} className="text-xs text-zinc-500 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to month
          </button>
          <div className="flex items-center justify-between">
            <button onClick={() => changeWeek(-1)}><ChevronLeft size={20} className="text-zinc-400" /></button>
            <span className="font-display text-lg text-zinc-100">
              {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <button onClick={() => changeWeek(1)}><ChevronRight size={20} className="text-zinc-400" /></button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-500 font-mono mb-1">
              <span>{weekStats.donePct}% done</span>
              <span>{weekStats.failedPct}% failed</span>
              <span>{weekStats.unansweredPct}% not answered</span>
            </div>
            <StatBar donePct={weekStats.donePct} failedPct={weekStats.failedPct} unansweredPct={weekStats.unansweredPct} />
          </div>

          <div className="space-y-2">
            {weekDays.map((d, i) => {
              const e = map[d.toDateString()];
              const info = e ? modeInfo(e.mode) : null;
              const pct = e && e.total ? Math.round((e.done / e.total) * 100) : 0;
              return (
                <button
                  key={i}
                  onClick={() => { setSelectedDay(d); setLevel("day"); }}
                  className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5"
                >
                  <span className="text-sm text-zinc-200">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="flex items-center gap-2">
                    {e && <span className={"w-2 h-2 rounded-full " + info.dot} />}
                    <span className="text-xs font-mono text-zinc-400">{e ? pct + "%" : "no data"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {level === "day" && (
        <>
          <button onClick={() => setLevel("week")} className="text-xs text-zinc-500 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to week
          </button>
          <div className="font-display text-lg text-zinc-100">
            {selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>

          {!dayEntry && <p className="text-sm text-zinc-600">No data for this day.</p>}

          {dayEntry && (
            <>
              <div className="flex items-center gap-2">
                <span className={"w-2.5 h-2.5 rounded-full " + modeInfo(dayEntry.mode).dot} />
                <span className={"text-sm " + modeInfo(dayEntry.mode).text}>{dayEntry.mode} day</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-500 font-mono mb-1">
                  <span>{dayEntry.total ? Math.round((dayEntry.done / dayEntry.total) * 100) : 0}% done</span>
                  <span>{dayEntry.total ? Math.round((dayEntry.failed / dayEntry.total) * 100) : 0}% failed</span>
                  <span>{dayEntry.total ? Math.round((dayEntry.unanswered / dayEntry.total) * 100) : 0}% not answered</span>
                </div>
                <StatBar
                  donePct={dayEntry.total ? Math.round((dayEntry.done / dayEntry.total) * 100) : 0}
                  failedPct={dayEntry.total ? Math.round((dayEntry.failed / dayEntry.total) * 100) : 0}
                  unansweredPct={dayEntry.total ? Math.round((dayEntry.unanswered / dayEntry.total) * 100) : 0}
                />
              </div>

              {dayEntry.topThree && dayEntry.topThree.some(Boolean) && (
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Top 3</h2>
                  <div className="space-y-1">
                    {dayEntry.topThree.filter(Boolean).map((t, i) => (
                      <p key={i} className="text-sm text-zinc-300">• {t}</p>
                    ))}
                  </div>
                </div>
              )}

              {dayEntry.winToday && (
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Win</h2>
                  <p className="text-sm text-zinc-300">{dayEntry.winToday}</p>
                </div>
              )}

              {dayEntry.tasks && dayEntry.tasks.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Checklist</h2>
                  <div className="space-y-1">
                    {dayEntry.tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-zinc-800/70">
                        {t.status === "done" && <Check size={14} className="text-emerald-500 shrink-0" />}
                        {t.status === "failed" && <X size={14} className="text-red-500 shrink-0" />}
                        {t.status === "unanswered" && <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />}
                        <span className={"text-sm " + (t.status === "unanswered" ? "text-zinc-500" : "text-zinc-300")}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SettingsView() {
  const [copyState, setCopyState] = useState("idle");
  const [restoreText, setRestoreText] = useState("");
  const [restoreState, setRestoreState] = useState("idle");
  const [confirmingLastBackup, setConfirmingLastBackup] = useState(false);
  const lastBackup = loadKey("autoBackup", null);

  const gatherBackup = () => {
    const data = {};
    ["dailyLog", "notes", "weekly", "history", "taskOverrides", "scorecardLabels", "weeklyHistory"].forEach((k) => {
      data[k] = loadKey(k, null);
    });
    data.exportedAt = new Date().toISOString();
    return data;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(gatherBackup()));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (e) {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(gatherBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lanceos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const applyBackupObject = (data) => {
    Object.keys(data).forEach((k) => {
      if (k === "exportedAt" || k === "savedAt") return;
      if (data[k] !== null && data[k] !== undefined) saveKey(k, data[k]);
    });
  };

  const handleRestore = () => {
    try {
      const data = JSON.parse(restoreText);
      applyBackupObject(data);
      setRestoreState("done");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setRestoreState("error");
    }
  };

  const handleRestoreLastBackup = () => {
    if (!lastBackup) return;
    applyBackupObject(lastBackup);
    window.location.reload();
  };

  return (
    <div className="px-4 pb-6 pt-5 space-y-6">
      <h1 className="font-display text-2xl text-zinc-50 tracking-tight">Settings</h1>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Backup</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Your data lives only in this browser. Back it up regularly in case iOS clears it.
        </p>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold">
            <Copy size={14} /> {copyState === "copied" ? "Copied!" : copyState === "error" ? "Failed" : "Copy Backup"}
          </button>
          <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-200 rounded-lg py-2.5 text-sm font-semibold">
            <Download size={14} /> Download
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Quick Restore</h2>
        {lastBackup ? (
          <>
            <p className="text-sm text-zinc-400 mb-2">
              Last auto-saved snapshot: {lastBackup.savedAt ? new Date(lastBackup.savedAt).toLocaleString() : "unknown time"}.
              This only protects against a bad edit — it won't help if iOS clears the whole site's data, so still back up manually now and then.
            </p>
            <button
              onClick={() => setConfirmingLastBackup(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-200 rounded-lg py-2.5 text-sm font-semibold"
            >
              <Upload size={14} /> Restore Last Snapshot
            </button>
          </>
        ) : (
          <p className="text-sm text-zinc-600">No snapshot yet — one saves automatically as you use the app.</p>
        )}
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-mono">Restore</h2>
        <p className="text-sm text-zinc-400 mb-2">Paste a backup below to restore it. This overwrites current data.</p>
        <textarea
          value={restoreText}
          onChange={(e) => setRestoreText(e.target.value)}
          rows={4}
          placeholder="Paste backup JSON here…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
        />
        <button onClick={handleRestore} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-200 rounded-lg py-2.5 text-sm font-semibold">
          <Upload size={14} /> {restoreState === "done" ? "Restored — reloading…" : restoreState === "error" ? "Invalid backup, try again" : "Restore Backup"}
        </button>
      </div>

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

      {confirmingLastBackup && (
        <ConfirmModal
          title="Restore last snapshot?"
          message="This overwrites everything currently in the app with the last auto-saved snapshot."
          confirmLabel="Restore"
          danger
          onConfirm={handleRestoreLastBackup}
          onCancel={() => setConfirmingLastBackup(false)}
        />
      )}
    </div>
  );
}

// ---------- Root ----------

export default function LanceOS() {
  const [tab, setTab] = useState("today");
  const [taskOverrides, setTaskOverrides] = useState(() => loadKey("taskOverrides", {}));
  const [scorecardItems, setScorecardItems] = useState(() => loadKey("scorecardLabels", defaultScorecardItems));

  const [log, setLog] = useState(() => {
    const stored = loadKey("dailyLog", null);
    if (stored && stored.date === todayStr()) {
      return { ...stored, tasks: stored.tasks.map(migrateTask) };
    }
    return freshLog(true, loadKey("taskOverrides", {}));
  });

  const [notes, setNotes] = useState(() => loadKey("notes", []));
  const [weekly, setWeekly] = useState(() => {
    const stored = loadKey("weekly", null);
    const currentWeekStart = startOfWeek(new Date()).toDateString();
    if (stored && stored.weekStart === currentWeekStart) return stored;
    // First run of a new week (or first run ever): archive the old week if it had anything in it.
    if (stored) {
      const hasData = Object.keys(weeklyDefault).some((k) => k !== "reflection" && stored[k]) || (stored.reflection && stored.reflection.trim());
      if (hasData) {
        const prevHistory = loadKey("weeklyHistory", []);
        const next = [...prevHistory, { ...stored, weekStart: stored.weekStart || currentWeekStart }].slice(-52);
        saveKey("weeklyHistory", next);
      }
    }
    return { ...weeklyDefault, weekStart: currentWeekStart };
  });
  const [weeklyHistory, setWeeklyHistory] = useState(() => loadKey("weeklyHistory", []));
  const [history, setHistory] = useState(() => {
    const stored = loadKey("history", []);
    return stored.map((h) => ({
      ...h,
      done: h.done ?? 0,
      failed: h.failed ?? 0,
      unanswered: h.unanswered ?? Math.max((h.total ?? 0) - (h.done ?? 0), 0),
      tasks: h.tasks ?? [],
      topThree: h.topThree ?? ["", "", ""],
      winToday: h.winToday ?? "",
    }));
  });

  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const firstRun = useRef(true);

  // Archive yesterday's (or older) daily log into history the first time the app
  // is opened on a new day, so weekly/monthly progress has something to show.
  useEffect(() => {
    const stored = loadKey("dailyLog", null);
    if (stored && stored.date !== todayStr() && stored.tasks && stored.tasks.length) {
      const migrated = stored.tasks.map(migrateTask);
      const total = migrated.length;
      const done = migrated.filter((t) => t.status === "done").length;
      const failed = migrated.filter((t) => t.status === "failed").length;
      const unanswered = total - done - failed;
      setHistory((prev) => {
        if (prev.some((h) => h.date === stored.date)) return prev;
        const next = [
          ...prev,
          {
            date: stored.date, mode: stored.mode, done, failed, unanswered, total,
            topThree: stored.topThree, winToday: stored.winToday, tasks: migrated,
          },
        ].slice(-180);
        saveKey("history", next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveKey("dailyLog", log);
      setSaving(false);
    }, 300);
  }, [log]);

  useEffect(() => { saveKey("notes", notes); }, [notes]);
  useEffect(() => { saveKey("weekly", weekly); }, [weekly]);
  useEffect(() => { saveKey("scorecardLabels", scorecardItems); }, [scorecardItems]);

  // Rolling safety snapshot — protects against a bad edit, not against iOS wiping the whole site.
  const autoBackupTimer = useRef(null);
  useEffect(() => {
    clearTimeout(autoBackupTimer.current);
    autoBackupTimer.current = setTimeout(() => {
      saveKey("autoBackup", {
        dailyLog: log,
        notes,
        weekly,
        history,
        taskOverrides,
        scorecardLabels: scorecardItems,
        weeklyHistory,
        savedAt: new Date().toISOString(),
      });
    }, 1500);
  }, [log, notes, weekly, history, taskOverrides, scorecardItems, weeklyHistory]);

  const addNote = ({ title, prompt, body, type }) => {
    setNotes((prev) => [
      { id: crypto.randomUUID(), date: new Date().toLocaleDateString(), title, prompt, body, type },
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
        {tab === "today" && (
          <TodayView log={log} setLog={setLog} saving={saving} taskOverrides={taskOverrides} setTaskOverrides={setTaskOverrides} />
        )}
        {tab === "faith" && <FaithView addNote={addNote} />}
        {tab === "notes" && <NotesView notes={notes} addNote={addNote} />}
        {tab === "weekly" && (
          <WeeklyView weekly={weekly} setWeekly={setWeekly} scorecardItems={scorecardItems} setScorecardItems={setScorecardItems} />
        )}
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
