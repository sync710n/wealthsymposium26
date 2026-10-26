import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AppWindow,
  Bot,
  ChartLine,
  Check,
  Clapperboard,
  ClipboardList,
  Clock,
  Copy,
  Expand,
  FileText,
  Layers,
  ListChecks,
  Mail,
  MonitorSmartphone,
  NotebookPen,
  Pencil,
  Search,
  Shrink,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BRIEF_FIELDS, FLOW, PAINPOINTS, SCENE_HINTS, briefGuide, painGuide, type Brief, type BriefKey, type StepId } from "@/lib/content";
import { coachDraft, generatePrototype, generateSceneImage, refinePrototype, readDebugLog, clearServerDebugLog, type PrototypeEngine } from "@/lib/ai.functions";
import { debugClearClient, debugClientLog, debugModels, debugPush, debugSubscribe, MODEL_OPTIONS, saveDebugModels, saveOpenRouterKey, savedOpenRouterKey, traced, type DebugModels } from "@/lib/debug";
import { loadImages, loadPrototype, saveImage } from "@/lib/media-db";
import {
  briefReady,
  currentBasis,
  imageStale,
  painText,
  sceneReady,
  stepIndex,
  useSession,
  loadSavedSession,
} from "@/lib/session";

function useSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return active ? seconds : 0;
}

const BOT_MOODS = [
  "soccer",
  "basketball",
  "tennis",
  "golf",
  "swim",
  "run",
  "cycle",
  "ski",
  "skate",
  "yoga",
  "box",
  "guitar",
  "drums",
  "piano",
  "sing",
  "dance",
  "paint",
  "read",
  "cook",
  "photo",
  "chess",
  "hike",
] as const;

function AgentBot({ mini = false }: { mini?: boolean }) {
  const [mood] = useState(() => BOT_MOODS[Math.floor(Math.random() * BOT_MOODS.length)]);
  const bot = (
    <div className={`bot bot-${mood}`} aria-hidden>
      <div className="bot-antenna">
        <span className="bot-bulb" />
        <span className="bot-stem" />
      </div>
      <div className="bot-head">
        <span className="bot-eye" />
        <span className="bot-eye" />
      </div>
      <div className="bot-body">
        <span className="bot-arm bot-arm-left" />
        <span className="bot-screen" />
        <span className="bot-arm bot-arm-right" />
      </div>
      <div className="bot-legs">
        <span />
        <span />
      </div>
      <span className="bot-prop" />
      <span className="bot-note" />
    </div>
  );
  if (!mini) return bot;
  return (
    <div className="bot-fit">
      <div className="bot-scale">{bot}</div>
    </div>
  );
}

function Working({ label, seconds }: { label: string; seconds: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <AgentBot mini />
      <p className="text-xl">
        {label} · {seconds}s
      </p>
    </div>
  );
}

const PHASE_LIMIT = { idea: 5 * 60, scenes: 10 * 60, prototype: 15 * 60 } as const;

function clockKey(step: StepId) {
  if (step === "pain" || step === "brief") return "idea" as const;
  if (step === "scenes") return "scenes" as const;
  if (step === "prototype") return "prototype" as const;
  return null;
}

function formatLeft(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function embedScenes(html: string, images: (string | null)[]) {
  let out = html;
  images.forEach((url, index) => {
    if (!url) return;
    out = out.split(`__SCENE_${index + 1}__`).join(url);
  });
  return out;
}

function hasStep(html: string, step: number) {
  return new RegExp(`data-step=["']${step}["']`).test(html);
}

function cutOtherSteps(section: string, step: number) {
  let out = section;
  for (const other of [1, 2, 3]) {
    if (other === step) continue;
    const open = new RegExp(`<section\\b[^>]*\\bdata-step\\s*=\\s*["']${other}["'][^>]*>`, "i");
    let guard = 0;
    while (open.test(out) && guard < 6) {
      guard += 1;
      const start = out.search(open);
      const openTag = out.slice(start).match(/^<section\b[^>]*>/i)?.[0] ?? "";
      let depth = 1;
      const rest = out.slice(start + openTag.length);
      const token = /<\/?section\b[^>]*>/gi;
      let match: RegExpExecArray | null;
      let end = -1;
      while ((match = token.exec(rest))) {
        depth += match[0].startsWith("</") ? -1 : 1;
        if (depth === 0) {
          end = start + openTag.length + match.index + match[0].length;
          break;
        }
      }
      if (end < 0) {
        const nextStep = rest.search(/<section\b[^>]*data-step\s*=/i);
        end = start + openTag.length + (nextStep >= 0 ? nextStep : rest.length);
      }
      out = `${out.slice(0, start)}${out.slice(end)}`;
    }
  }
  return out;
}

function isolateStep(html: string, step: number) {
  const open = new RegExp(`<section\\b[^>]*\\bdata-step\\s*=\\s*["']${step}["'][^>]*>`, "i");
  const start = html.search(open);
  const lock = `<style>[data-step]:not([data-step="${step}"]){display:none!important}[hidden]{display:none!important}html,body{height:100%;margin:0;overflow:auto}</style>`;
  if (start < 0) return html.includes("</head>") ? html.replace("</head>", `${lock}</head>`) : `${lock}${html}`;
  const openTag = html.slice(start).match(/^<section\b[^>]*>/i)?.[0] ?? "";
  let depth = 1;
  const rest = html.slice(start + openTag.length);
  const token = /<\/?section\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let section = "";
  while ((match = token.exec(rest))) {
    const isClose = match[0].startsWith("</");
    if (!isClose && depth === 1 && /data-step\s*=/i.test(match[0])) {
      section = `${html.slice(start, start + openTag.length + match.index)}</section>`;
      break;
    }
    depth += isClose ? -1 : 1;
    if (depth === 0) {
      section = html.slice(start, start + openTag.length + match.index + match[0].length);
      break;
    }
  }
  if (!section) return html.includes("</head>") ? html.replace("</head>", `${lock}</head>`) : `${lock}${html}`;
  section = section.replace(/^<section\b([^>]*)>/i, (_full, attrs: string) => {
    const cleaned = attrs
      .replace(/\shidden\b/gi, "")
      .replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (_m, quote: string, style: string) => {
        const next = style.replace(/display\s*:\s*none\s*;?/gi, "").replace(/visibility\s*:\s*hidden\s*;?/gi, "");
        return `style=${quote}${next}${quote}`;
      });
    return `<section${cleaned}>`;
  });
  const ownStyles = [...section.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((item) => item[0]).join("");
  const screenBg = section.match(/background(?:-color)?\s*:\s*([^;}"]+)/i)?.[1]?.trim() || "#16121f";
  const show = `<style>
html,body{height:100%;margin:0;overflow:hidden;background:${screenBg};color:#161616}
[hidden]{display:none!important}
#cya-fit{height:100%;width:100%;overflow:auto}
html body section[data-step]{width:100%!important;height:100%!important;max-width:none!important;margin:0!important;min-height:100%!important;box-sizing:border-box!important}
section[data-step] *{max-width:none!important}
.cya-main{flex:1 1 auto!important;min-width:0!important;height:100%!important;overflow:auto!important}
.cya-agent{flex:0 0 min(16rem,24%)!important;width:min(16rem,24%)!important;height:100%!important;max-height:100%!important;overflow:auto!important;position:sticky!important;top:0!important;align-self:stretch!important}
</style><script>(function(){
function panel(input, section){
  var box=input;
  var limit=section.clientWidth*0.42;
  while(box.parentElement&&box.parentElement!==section){
    if(box.offsetWidth>limit&&box.offsetHeight>70)break;
    var parent=box.parentElement;
    if(parent.offsetHeight>box.offsetHeight*1.7&&box.offsetHeight>70)break;
    box=parent;
  }
  if(box===section||box.offsetWidth>section.clientWidth*0.55)return null;
  return box;
}
function pin(){
  var section=document.querySelector("section[data-step]");
  if(!section)return;
  var inputs=[].slice.call(section.querySelectorAll("input,textarea"));
  var best=null,bestScore=-1;
  inputs.forEach(function(input){
    var hint=((input.getAttribute("placeholder")||"")+" "+(input.getAttribute("aria-label")||"")).toLowerCase();
    var score=/ask|message|chat/.test(hint)?3:/search/.test(hint)?0:1;
    if(score>bestScore){bestScore=score;best=input;}
  });
  var chat=best&&bestScore>0?panel(best,section):null;
  if(!chat)return;
  if(chat.parentElement!==section)section.appendChild(chat);
  chat.classList.add("cya-agent");
  var others=[].filter.call(section.children,function(el){return el!==chat&&el.tagName!=="STYLE"&&el.tagName!=="SCRIPT";});
  var main=section.querySelector(":scope>.cya-main");
  if(!main){
    main=document.createElement("div");
    main.className="cya-main";
    section.insertBefore(main,section.firstChild);
    others.forEach(function(el){main.appendChild(el);});
  }
  section.style.display="flex";
  section.style.flexDirection="row";
  section.style.flexWrap="nowrap";
  section.style.alignItems="stretch";
  section.style.overflow="hidden";
  section.style.height="100%";
}
window.addEventListener("load",function(){pin();faces();});
function avatar(name){
  var parts=String(name||"Client").trim().split(/\\s+/).filter(Boolean);
  var initials=(parts[0]?parts[0][0]:"")+(parts[1]?parts[1][0]:"");
  initials=(initials||"C").toUpperCase();
  var fills=["#6d4aff","#2f7d6d","#c46b2f","#3a5fcd"];
  var fill=fills[initials.charCodeAt(0)%fills.length];
  return '<svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="'+name+'"><rect width="64" height="64" rx="12" fill="'+fill+'"/><text x="32" y="40" text-anchor="middle" font-size="22" font-family="sans-serif" font-weight="700" fill="#fff">'+initials+'</text></svg>';
}
function faces(){
  document.querySelectorAll("img").forEach(function(img){
    var src=img.getAttribute("src")||"";
    if(src.indexOf("pravatar")<0&&src.indexOf("data:image")===0)return;
    var name=img.getAttribute("alt")||"Client";
    var holder=document.createElement("span");
    holder.innerHTML=avatar(name);
    holder.style.display="block";
    holder.style.width=(img.width||64)+"px";
    holder.style.height=(img.height||64)+"px";
    img.replaceWith(holder);
  });
  document.querySelectorAll("div").forEach(function(el){
    if(el.children.length||(el.textContent||"").trim())return;
    var r=el.getBoundingClientRect();
    if(r.width<56||r.height<56||r.width>240||r.height>240)return;
    var ratio=r.width/Math.max(r.height,1);
    if(ratio<0.75||ratio>1.35)return;
    var card=el.parentElement;
    var name="Client";
    if(card){
      var line=(card.innerText||"").split("\\n").map(function(s){return s.trim();}).filter(Boolean).find(function(s){return /^[A-Z][a-z]+\\s+[A-Z]/.test(s);});
      if(line)name=line;
    }
    el.innerHTML=avatar(name);
  });
}
pin();
faces();
setTimeout(function(){pin();faces();},40);
})();</script>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${ownStyles}${show}</head><body><div id="cya-fit">${cutOtherSteps(section, step)}</div></body></html>`;
}

function shrinkImage(dataUrl: string) {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = 960;
      const height = Math.max(1, Math.round((img.height / Math.max(img.width, 1)) * width));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve("");
        return;
      }
      context.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

export function Studio() {
  const step = useSession((state) => state.step);
  const clocks = useSession((state) => state.clocks);
  const key = clockKey(step);
  const [now, setNow] = useState(() => Date.now());
  const [, setEngine] = useState<PrototypeEngine>("grok");
  useEffect(() => {
    setEngine(chosenEngine());
  }, []);
  const [coachOpen, setCoachOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [armReset, setArmReset] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  useEffect(() => {
    const onError = (event: ErrorEvent) => debugPush({ name: "window", ok: false, detail: event.message });
    const onReject = (event: PromiseRejectionEvent) =>
      debugPush({ name: "unhandled", ok: false, detail: event.reason instanceof Error ? event.reason.message : String(event.reason) });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  const hydrated = useSession((state) => state.hydrated);
  const loadingCover = step === "overview" && !hydrated;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (cancel) return;
      loadSavedSession();
      if (useSession.getState().mediaReady) return;
      void Promise.all([loadImages(), loadPrototype()])
        .then(([images, prototypeHtml]) => {
          if (cancel || useSession.getState().mediaReady) return;
          useSession.setState({
            images,
            mediaReady: true,
            ...(prototypeHtml ? { prototypeHtml } : {}),
          });
        })
        .catch(() => {
          if (!cancel) useSession.getState().setMedia([null, null, null]);
        });
    }, 0);
    const giveUp = window.setTimeout(() => {
      if (!cancel && !useSession.getState().hydrated) useSession.setState({ hydrated: true });
    }, 8000);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      window.clearTimeout(giveUp);
    };
  }, []);

  useEffect(() => {
    setArmReset(false);
  }, [step]);

  useEffect(() => {
    const onFullscreen = () => {
      if (!document.fullscreenElement) setPresent(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (!present) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPresent(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present]);

  const kicker = step === "overview" ? "Create Your Agent" : (FLOW.find((item) => item.id === step)?.kicker ?? "");
  const started = key && clocks ? clocks[key] : null;
  const left = started && key ? Math.max(0, PHASE_LIMIT[key] - Math.floor((now - started) / 1000)) : null;

  return (
    <div className="aurora-app flex h-dvh flex-col overflow-hidden p-3">
      <div
        className={`shell-glow mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden ${loadingCover ? "pointer-events-none opacity-50" : ""}`}
        aria-hidden={loadingCover || undefined}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
          <p className="font-head shrink-0 text-xl text-ink" onDoubleClick={() => setDebugOpen(true)}>
            Wealth Symposium
          </p>
          <p className="shrink-0 text-xl text-muted">{kicker}</p>
          {left !== null ? (
            <p
              className={`shrink-0 border border-line px-2 text-xl font-medium text-ink ${left === 0 ? "bg-soft" : "bg-sheet"}`}
              aria-label={left === 0 ? "Time is up" : `${formatLeft(left)} remaining`}
            >
              {left === 0 ? "Time is up" : `${formatLeft(left)} left`}
            </p>
          ) : null}
          {step !== "overview" ? <Stepper placement="header" /> : null}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {step !== "overview" ? (
              <button
                type="button"
                className="h-12 shrink-0 rounded-full px-2 text-xl font-medium text-rule"
                onClick={() => {
                  if (!armReset) {
                    setArmReset(true);
                    return;
                  }
                  void useSession.getState().reset();
                  setArmReset(false);
                  setPresent(false);
                }}
              >
                {armReset ? "Confirm clear" : "Start again"}
              </button>
            ) : null}
          </div>
        </header>
        {debugOpen ? <DebugMenu onClose={() => setDebugOpen(false)} onEngine={setEngine} /> : null}

        {step !== "overview" ? <Stepper placement="bar" /> : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 py-2 xl:overflow-hidden">
            {step === "overview" ? (
              <Overview
                onFresh={() => {
                  void useSession.getState().startFresh();
                }}
                onResume={() => useSession.getState().resume()}
              />
            ) : null}
            {step === "pain" ? <PainStep /> : null}
            {step === "brief" ? <BriefStep /> : null}
            {step === "scenes" ? <ScenesStep /> : null}
            {step === "prototype" ? (
              <PrototypeStep present={present} onPresent={() => setPresent((value) => !value)} />
            ) : null}
          </main>
          <CoachPanel open={coachOpen} forceHidden={present} onClose={() => setCoachOpen(false)} />
        </div>
      </div>
      {loadingCover ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-4 border border-line bg-sheet px-10 py-6 shadow-[6px_6px_0_0_#111]">
            <AgentBot />
            <p className="text-xl font-medium">The agent is getting the room ready</p>
          </div>
        </div>
      ) : null}
      {step !== "overview" && !present ? (
        <button
          type="button"
          className="fixed right-4 bottom-4 z-20 h-12 rounded-full btn-glow px-4 text-xl font-medium lg:hidden"
          onClick={() => setCoachOpen(true)}
        >
          Assistant
        </button>
      ) : null}
    </div>
  );
}

function Stepper({ placement }: { placement: "bar" | "header" }) {
  const step = useSession((state) => state.step);
  const reached = useSession((state) => state.reached);
  const go = useSession((state) => state.go);
  const inHeader = placement === "header";
  return (
    <nav
      className={
        inHeader
          ? "ios-segment hidden min-w-0 flex-1 items-center justify-center xl:flex"
          : "ios-segment mx-2 my-1.5 flex shrink-0 overflow-x-auto xl:hidden"
      }
      aria-label="Stages"
    >
      {FLOW.map((item) => {
        const locked = stepIndex(item.id) > stepIndex(reached);
        const current = step === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={locked}
            onClick={() => go(item.id)}
            className={`${inHeader ? "h-9" : "h-10"} shrink-0 rounded-full px-3 text-left text-xl whitespace-nowrap disabled:opacity-35 ${
              current ? "ios-seg-on" : "text-ink"
            }`}
          >
            {item.n} {item.short}
          </button>
        );
      })}
    </nav>
  );
}

function Overview({ onFresh, onResume }: { onFresh: () => void; onResume: () => void }) {
  const hydrated = useSession((state) => state.hydrated);
  const resumeAt = useSession((state) => state.resumeAt);
  const canResume = hydrated && Boolean(resumeAt && resumeAt !== "overview");
  const phases = [
    { n: "0", title: "Scenario", body: "Choose the moment your group feels most. If it is not listed, write your own.", icon: ListChecks },
    { n: "1", title: "Idea brief", body: "Name the agent. Say what it does, what you receive, and who it helps.", icon: Bot },
    { n: "2", title: "Design 3 screens", body: "Design three screens in order, then generate a picture for each.", icon: Clapperboard },
    { n: "3", title: "Prototype", body: "Generate the clickable prototype, make one or two edits, then present it.", icon: MonitorSmartphone },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-4xl leading-tight">Create your agent</h1>
        <p className="mt-2 max-w-4xl text-xl leading-snug text-muted">
          About 30 minutes on one laptop. No real client names or account numbers.
        </p>
        {typeof window !== "undefined" && window.localStorage?.getItem("cya-desktop") === "1" && !window.localStorage.getItem("cya-supabase-fn") ? (
          <p className="mt-2 max-w-4xl text-xl leading-snug">
            This copy calls Supabase. Double-click Wealth Symposium and paste the function URL before you start.
          </p>
        ) : null}
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-3">
        {phases.map((phase) => (
          <article key={phase.n} className="flex min-h-0 flex-col rounded-2xl border border-line bg-soft p-4">
            <phase.icon className="size-10 text-rule" aria-hidden />
            <p className="mt-3 text-base font-semibold text-rule">Phase {phase.n}</p>
            <h2 className="mt-1 text-2xl font-semibold">{phase.title}</h2>
            <p className="mt-2 text-xl leading-snug text-muted">{phase.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {canResume ? (
          <button type="button" className="h-12 rounded-full border border-line bg-sheet px-6 text-xl font-medium" onClick={onResume}>
            Resume
          </button>
        ) : null}
        <button
          type="button"
          disabled={!hydrated}
          className="h-12 rounded-full btn-glow px-6 text-xl font-medium disabled:opacity-40"
          onClick={onFresh}
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}

function chosenEngine(): PrototypeEngine {
  try {
    return window.localStorage.getItem("cya-engine") === "grok" ? "grok" : "deepseek";
  } catch {
    return "deepseek";
  }
}

function advance(next: StepId) {
  const reached = useSession.getState().reached;
  if (stepIndex(next) > stepIndex(reached)) useSession.setState({ reached: next });
  useSession.getState().go(next);
}

function PainStep() {
  const painId = useSession((state) => state.painId);
  const painOwn = useSession((state) => state.painOwn);
  const selectPain = useSession((state) => state.selectPain);
  const setPainOwn = useSession((state) => state.setPainOwn);
  const go = useSession((state) => state.go);
  const ownReady = painId === "own" && painOwn.trim().length > 0;
  const ready = (painId && painId !== "own") || ownReady;
  const ownOn = painId === "own";
  const icons = {
    search: Search,
    filter: SlidersHorizontal,
    mail: Mail,
    copy: Copy,
    layers: Layers,
    clock: Clock,
    chart: ChartLine,
    tabs: AppWindow,
    clipboard: ClipboardList,
    file: FileText,
    notes: NotebookPen,
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <h1 className="text-3xl leading-tight">Phase 0: Which moment hurts?</h1>
        <div className="flex gap-2">
          <button type="button" className="h-12 rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("overview")}>
            Back
          </button>
          <button
            type="button"
            disabled={!ready}
            className="h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40"
            onClick={() => advance("brief")}
          >
            Move on
          </button>
        </div>
      </div>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-2">
        {PAINPOINTS.map((item) => {
          const selected = painId === item.id;
          const Icon = icons[item.icon as keyof typeof icons] ?? Search;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                selectPain(item.id);
                if (useSession.getState().focus?.kind === "pain") useSession.getState().setFocus(null);
              }}
              className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border px-2 py-2 text-left type-seen ${
                selected ? "border-rule bg-soft" : "border-line bg-sheet"
              }`}
            >
              <Icon className="size-6 shrink-0 text-rule" aria-hidden />
              <span className="mt-1 font-medium text-rule">{item.id}</span>
              <span className="mt-0.5 leading-snug">{item.text}</span>
            </button>
          );
        })}
        <label
          className={`flex h-full min-h-0 flex-col rounded-xl border-2 px-2 py-2 ${ownOn ? "border-rule bg-soft" : "border-line bg-sheet"}`}
        >
          <Pencil className="size-6 shrink-0 text-rule" aria-hidden />
          <span className="mt-1 font-medium text-rule">12</span>
          <textarea
            value={painOwn}
            onFocus={() => {
              selectPain("own");
              useSession.getState().setFocus({ kind: "pain" });
            }}
            onChange={(event) => setPainOwn(event.target.value)}
            placeholder="Or write a scenario that hurts more."
            aria-label="Or add your own"
            className="mt-0.5 min-h-0 w-full flex-1 resize-none bg-transparent text-xl leading-snug"
          />
        </label>
      </div>
    </div>
  );
}

function BriefStep() {
  const brief = useSession((state) => state.brief);
  const pain = useSession((state) => painText(state));
  const focus = useSession((state) => state.focus);
  const setBriefField = useSession((state) => state.setBriefField);
  const setFocus = useSession((state) => state.setFocus);
  const go = useSession((state) => state.go);
  const ready = briefReady(brief);
  const name = BRIEF_FIELDS[0];
  const rest = BRIEF_FIELDS.slice(1);
  const selected = (key: BriefKey) => focus?.kind === "field" && focus.key === key;
  const box = (key: BriefKey) =>
    selected(key) ? "border-2 border-rule bg-soft" : "border border-line bg-sheet";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight">Phase 1: Idea brief</h1>
          <p className="mt-1 text-xl text-muted">Click a box. The assistant tells you what to write. The group fills it in.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="h-12 rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("pain")}>
            Back
          </button>
          <button
            type="button"
            disabled={!ready}
            className="h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40"
            onClick={() => advance("scenes")}
          >
            Move on
          </button>
        </div>
      </div>
      <div className="mt-2 grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="border border-dashed border-line bg-sheet px-3 py-2">
          <p className="text-base font-medium text-muted">Painpoint scenario</p>
          <p className="text-base text-muted">From the last step. Not one of the boxes.</p>
          <p className="text-xl leading-snug">{pain || "Pick one in the previous step."}</p>
        </div>
        <label className="flex flex-col text-xl font-medium leading-tight">
          {name.label}
          <input
            value={brief.name}
            onFocus={() => setFocus({ kind: "field", key: "name" })}
            onChange={(event) => setBriefField("name", event.target.value)}
            placeholder={name.hint}
            className={`mt-1 h-12 w-full px-3 text-xl font-normal ${box("name")}`}
          />
        </label>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        {rest.map((field) => (
          <label key={field.key} className="flex min-h-0 flex-1 flex-col text-xl font-medium leading-tight">
            {field.label}
            <textarea
              value={brief[field.key]}
              onFocus={() => setFocus({ kind: "field", key: field.key })}
              onChange={(event) => setBriefField(field.key, event.target.value)}
              placeholder={field.hint}
              className={`mt-1 min-h-12 w-full flex-1 resize-none px-3 py-2 text-xl font-normal leading-snug ${box(field.key)}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ScenesStep() {
  const scenes = useSession((state) => state.scenes);
  const images = useSession((state) => state.images);
  const setScene = useSession((state) => state.setScene);
  const setActiveScene = useSession((state) => state.setActiveScene);
  const setImage = useSession((state) => state.setImage);
  const go = useSession((state) => state.go);
  const focus = useSession((state) => state.focus);
  const imageFn = useServerFn(generateSceneImage);
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [full, setFull] = useState<string | null>(null);
  const anyBusy = Object.values(busy).some(Boolean);
  const seconds = useSeconds(anyBusy);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  async function draw(index: 0 | 1 | 2) {
    const state = useSession.getState();
    const paragraph = state.scenes[index];
    const context = [state.brief.name ? `Agent name: ${state.brief.name}` : "No brand name. Do not invent one.", state.brief.agentDoes, state.brief.rmSees]
      .filter(Boolean)
      .join(" ")
      .slice(0, 400);
    const others = state.scenes
      .map((text, sceneIndex) => (sceneIndex === index ? "" : `Step ${sceneIndex + 1}: ${text}`))
      .filter(Boolean)
      .join(" ")
      .slice(0, 700);
    setBusy((current) => ({ ...current, [index]: true }));
    setErrors((current) => ({ ...current, [index]: "" }));
    try {
      const result = await traced("image", { index, model: debugModels().image, paragraph, context, others }, () =>
        imageFn({ data: { index, paragraph, context, others, model: debugModels().image } }),
      );
      if (!result.ok) {
        setErrors((current) => ({ ...current, [index]: result.error }));
        return;
      }
      const slot = { dataUrl: result.dataUrl, sceneText: paragraph };
      setImage(index, slot);
      await saveImage(index, slot);
    } catch {
      setErrors((current) => ({
        ...current,
        [index]: "That screen did not come back. Try again.",
      }));
    } finally {
      setBusy((current) => ({ ...current, [index]: false }));
    }
  }

  const paragraphsReady = scenes.every((scene) => sceneReady(scene));
  const allFrames = images.every(Boolean);
  const anyStale = scenes.some((scene, index) => imageStale(images[index], scene));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight">Phase 2: Design 3 screens</h1>
          <p className="mt-1 text-xl text-muted">
            {anyStale
              ? "A picture is out of date. Generate it again before you move on."
              : "Write one or two sentences, then generate the image. Click a box if you want help with that screen."}
          </p>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <button type="button" className="h-12 rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("brief")}>
            Back
          </button>
          <button
            type="button"
            disabled={!paragraphsReady || anyBusy}
            className={`h-12 rounded-full px-4 text-xl font-medium disabled:opacity-40 ${allFrames && !anyStale ? "border border-line" : "btn-glow"}`}
            onClick={() => {
              void Promise.all([0, 1, 2].map((index) => draw(index as 0 | 1 | 2)));
            }}
          >
            {anyBusy ? `Generating · ${seconds}s` : "Generate images"}
          </button>
          <button
            type="button"
            disabled={!allFrames || anyStale}
            className={`h-12 rounded-full px-4 text-xl font-medium disabled:opacity-40 ${allFrames && !anyStale ? "btn-glow" : "border border-line"}`}
            onClick={() => advance("prototype")}
          >
            Move on
          </button>
        </div>
      </div>
      <div className="mt-2 grid min-h-0 flex-1 grid-rows-3 gap-2">
        {scenes.map((scene, index) => {
          const slot = images[index];
          const stale = imageStale(slot, scene);
          const sceneIndex = index as 0 | 1 | 2;
          const picked = focus?.kind === "scene" && focus.index === sceneIndex;
          return (
            <article
              key={index}
              className={`flex min-h-0 flex-row overflow-hidden rounded-2xl border-2 ${picked ? "border-rule" : "border-line"}`}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <header className={`shrink-0 border-b border-line px-3 py-1 text-xl font-medium leading-tight ${picked ? "bg-soft" : ""}`}>
                  <span className="text-rule">0{index + 1}</span> Screen
                </header>
                <textarea
                  value={scene}
                  placeholder="What is on this screen, what the agent says, and what you do."
                  onFocus={() => {
                    setActiveScene(sceneIndex);
                    useSession.getState().setFocus({ kind: "scene", index: sceneIndex });
                  }}
                  onChange={(event) => setScene(sceneIndex, event.target.value)}
                  className={`min-h-0 w-full flex-1 resize-none border-0 px-3 py-2 text-xl leading-snug ${picked ? "bg-soft" : "bg-sheet"}`}
                />
                {errors[index] ? (
                  <p className="max-h-10 shrink-0 overflow-hidden px-3 text-base leading-tight text-rule">The picture did not come back. Try again.</p>
                ) : null}
                <button
                  type="button"
                  disabled={!sceneReady(scene) || busy[index]}
                  onClick={() => void draw(sceneIndex)}
                  className="h-11 shrink-0 border-t border-line text-xl font-medium disabled:opacity-40"
                >
                  {busy[index]
                    ? `Generating · ${seconds}s`
                    : !sceneReady(scene)
                      ? "Write a full sentence"
                      : slot
                        ? "Generate image again"
                        : "Generate image"}
                </button>
              </div>
              <div className="scene-frame relative shrink-0 border-l border-line bg-sheet">
                {slot ? (
                  <>
                    <img src={slot.dataUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 inline-flex size-10 items-center justify-center border border-line bg-sheet"
                      aria-label={`Open screen ${index + 1} full screen`}
                      onClick={() => setFull(slot.dataUrl)}
                    >
                      <Expand className="size-5" aria-hidden />
                    </button>
                    {stale ? (
                      <span className="absolute top-1 left-1 border border-line bg-soft px-2 py-1 text-base font-medium">Out of date</span>
                    ) : null}
                  </>
                ) : busy[index] ? null : (
                  <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-lg text-muted">
                    The screen lands here
                  </p>
                )}
                {busy[index] ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-sheet/85">
                    <Working label="Generating this image" seconds={seconds} />
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {full ? (
        <button
          type="button"
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-6"
          aria-label="Close full screen"
          onClick={() => setFull(null)}
        >
          <img src={full} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </div>
  );
}

async function readPrototypeStream(
  payload: {
    pain: string;
    brief: Brief;
    scenes: string[];
    step: number;
    previousHtml: string;
    image: string;
    images: string[];
    engine: PrototypeEngine;
    htmlModel?: string;
    openRouterKey?: string;
  },
  onDelta: (delta: string) => void,
  onReset: () => void,
  fallback: (payload: {
    pain: string;
    brief: Brief;
    scenes: string[];
    step: number;
    previousHtml: string;
    image: string;
    images: string[];
    engine: PrototypeEngine;
    htmlModel?: string;
  }) => Promise<{ ok: true; html: string } | { ok: false; error: string }>,
) {
  try {
    const localUrl = typeof window !== "undefined" ? window.localStorage.getItem("cya-supabase-fn")?.trim() : "";
    const anon = typeof window !== "undefined" ? window.localStorage.getItem("cya-supabase-anon")?.trim() ?? "" : "";
    const res = await fetch(localUrl || "/api/prototype", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(localUrl && anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {}),
      },
      body: JSON.stringify(localUrl ? { action: "prototype-stream", data: payload } : payload),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
      return fallback(payload);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
      let html = "";
      let error = "";
      let lastPaint = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim()) as { delta?: string; reset?: boolean; html?: string; error?: string };
          if (event.reset) onReset();
          if (event.delta) onDelta(event.delta);
          if (event.html) html = event.html;
          if (event.error) error = event.error;
        }
        if (performance.now() - lastPaint > 40) {
          lastPaint = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    if (error) return { ok: false as const, error };
    if (!html) return { ok: false as const, error: "The prototype did not come back. Try again." };
    return { ok: true as const, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/timeout|aborted|abort/i.test(message)) return { ok: false as const, error: `timeout: ${message}` };
    return fallback(payload);
  }
}

function PrototypeStep({ present, onPresent }: { present: boolean; onPresent: () => void }) {
  const pain = useSession((state) => painText(state));
  const brief = useSession((state) => state.brief);
  const scenes = useSession((state) => state.scenes);
  const images = useSession((state) => state.images);
  const mediaReady = useSession((state) => state.mediaReady);
  const prototypeHtml = useSession((state) => state.prototypeHtml);
  const prototypePreview = useSession((state) => state.prototypePreview);
  const compare = useSession((state) => state.previewSide);
  const prototypeBasis = useSession((state) => state.prototypeBasis);
  const setPrototype = useSession((state) => state.setPrototype);
  const go = useSession((state) => state.go);
  const protoFn = useServerFn(generatePrototype);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const keptFrame = useRef<Partial<Record<1 | 2 | 3, string>>>({});
  const shownDoc = useRef("");
  const leavingView = useRef<1 | 2 | 3>(1);
  const [leaving, setLeaving] = useState<{ html: string; dir: 1 | -1 } | null>(null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState<1 | 2 | 3>(1);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<1 | 2 | 3>(1);
  const seconds = useSeconds(busy);
  const codeRef = useRef<HTMLPreElement>(null);

  const framesReady = images.every((slot) => slot?.dataUrl);
  const basis = currentBasis({
    painId: useSession.getState().painId,
    painOwn: useSession.getState().painOwn,
    brief,
    scenes,
    images,
  });
  const stale = Boolean(mediaReady && prototypeHtml && prototypeBasis && prototypeBasis !== basis);
  const sourceHtml = prototypePreview && compare === "after" ? prototypePreview : prototypeHtml;
  const liveHtml = sourceHtml
    ? embedScenes(
        sourceHtml,
        images.map((slot) => slot?.dataUrl ?? null),
      )
    : "";
  const found = liveHtml ? hasStep(liveHtml, view) : false;
  const isolated = found ? isolateStep(liveHtml, view) : "";
  const frameWords = isolated.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!prototypePreview && frameWords.length > 40) keptFrame.current[view] = isolated;
  const frameHtml = frameWords.length > 40 ? isolated : prototypePreview ? isolated : keptFrame.current[view] || isolated;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !liveHtml) return;
    const send = () => frame.contentWindow?.postMessage({ type: "cya-step", step: view }, "*");
    frame.addEventListener("load", send);
    send();
    return () => frame.removeEventListener("load", send);
  }, [liveHtml, view]);

  useEffect(() => {
    const node = codeRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [streamText]);

  async function build() {
    if (!framesReady) return;
    setBusy(true);
    setError("");
    setStreamText("");
    useSession.getState().setPrototypePreview(null);
    let html = "";
    const push = (delta: string) => setStreamText((current) => current + delta);
    const shots = await Promise.all(
      images.map(async (slot) => {
        const shot = slot?.dataUrl ?? "";
        return shot ? shrinkImage(shot) : "";
      }),
    );
    try {
      for (const stepNo of [1, 2, 3] as const) {
        setWriting(stepNo);
        if (stepNo === 1) setView(1);
        setStreamText("");
        const payload = {
          pain,
          brief,
          scenes: [...scenes],
          step: stepNo,
          previousHtml: html,
          image: shots[stepNo - 1] ?? "",
          images: shots,
          engine: chosenEngine(),
          htmlModel: debugModels().html,
          openRouterKey: savedOpenRouterKey(),
        };
        const streamed = await traced(`prototype-step-${stepNo}`, payload, () =>
          readPrototypeStream(payload, push, () => setStreamText(""), (body) => protoFn({ data: body })),
        );
        if (!streamed.ok) {
          setError(streamed.error);
          return;
        }
        html = streamed.html;
        setPrototype(html, "");
        setStreamText("");
      }
      setPrototype(html, currentBasis(useSession.getState()));
    } catch {
      setError("The prototype did not come back. Try again.");
    } finally {
      setBusy(false);
      setStreamText("");
    }
  }

  const readySteps = [1, 2, 3].filter(
    (stepNo) => hasStep(prototypeHtml ?? "", stepNo) || hasStep(prototypePreview ?? "", stepNo),
  );

  const stepTabs = (
    <>
      {([1, 2, 3] as const).map((stepNo) => {
        const focused = view === stepNo;
        const narrative = (scenes[stepNo - 1] ?? "").replace(/\s+/g, " ").trim();
        const writingNow = busy && writing === stepNo && !readySteps.includes(stepNo);
        const label = writingNow ? `Step ${stepNo} · generating` : present && focused ? `Presenting step ${stepNo}` : `Step ${stepNo}`;
        return (
          <button
            key={stepNo}
            type="button"
            disabled={!readySteps.includes(stepNo) && !writingNow}
            className={`flex h-16 min-w-0 flex-col items-start justify-center overflow-hidden border-r border-line px-3 py-1 text-left last:border-r-0 disabled:opacity-40 ${
              focused ? `flex-1 ${present ? "bg-sheet" : "bg-soft"}` : "shrink-0 bg-sheet"
            }`}
            onClick={() => {
              setView(stepNo);
              useSession.getState().setFocus({ kind: "prototype", step: stepNo });
            }}
          >
            <span className={`text-lg leading-none whitespace-nowrap ${focused && !present ? "font-bold" : ""}`}>{label}</span>
            {focused && narrative ? <span className="mt-1 line-clamp-2 text-sm font-normal leading-tight text-muted">{narrative}</span> : null}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight">Phase 3: Rapid prototype</h1>
          <p className="mt-1 text-xl text-muted">Three clickable steps. One or two edits, then you're ready to share.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="h-12 rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("scenes")}>
            Back
          </button>
          <button
            type="button"
            disabled={!framesReady || busy}
            onClick={() => void build()}
            className="h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40"
          >
            {busy ? `Generating step ${writing} · ${seconds}s` : prototypeHtml ? "Generate again" : "Generate the prototype"}
          </button>
          {liveHtml && !busy && readySteps.length === 3 && !present ? (
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 border border-line px-3 text-xl"
              onClick={() => {
                onPresent();
                const node = stageRef.current;
                if (node?.requestFullscreen) void node.requestFullscreen().catch(() => undefined);
              }}
            >
              <Expand className="size-5" aria-hidden />
              Present
            </button>
          ) : null}
        </div>
      </div>
      {stale ? <p className="mt-2 text-xl text-muted">The brief or screens changed. This prototype is still here.</p> : null}
      {!framesReady ? <p className="mt-2 text-xl">Generate all three images first, then we can build the prototype.</p> : null}
      {error ? <p className="mt-2 text-xl text-rule">{error}</p> : null}
      <div
        ref={stageRef}
        className={
          present
            ? "fixed inset-0 z-40 flex flex-col bg-sheet"
            : "mt-2 flex min-h-0 flex-1 flex-col overflow-hidden border border-line bg-sheet"
        }
      >
        {present ? null : (
          <div className="flex shrink-0 border-b border-line" aria-label="Screens">
            {stepTabs}
          </div>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            {liveHtml && !(busy && view === writing) ? (
              <iframe
                key={`${view}-${compare}-${present ? "full" : "edit"}-${prototypePreview ? "preview" : "live"}`}
                ref={frameRef}
                title="Prototype"
                sandbox="allow-scripts"
                srcDoc={frameHtml}
                className="absolute inset-0 h-full w-full bg-sheet"
              />
            ) : !busy ? (
              <p className="px-4 py-6 text-xl text-muted">The prototype appears here, one screen at a time.</p>
            ) : null}
            {busy && view === writing ? (
              <pre
                ref={codeRef}
                className="absolute inset-0 overflow-auto whitespace-pre-wrap break-all bg-sheet p-4 font-mono text-sm leading-snug"
              >
                {streamText || "Generating the HTML…"}
              </pre>
            ) : null}
          </div>
        </div>
        {present ? (
          <div className="sticky bottom-0 z-10 flex shrink-0 border-t border-line bg-sheet" aria-label="Screens">
            {stepTabs}
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 border-l border-line px-3 text-lg"
              onClick={() => {
                onPresent();
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
              }}
            >
              <Shrink className="size-5" aria-hidden /> Exit
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type Draft =
  | { kind: "pain"; text: string }
  | { kind: "field"; key: BriefKey; text: string }
  | { kind: "brief"; brief: Brief }
  | { kind: "scene"; index: 0 | 1 | 2; text: string }
  | { kind: "scenes"; texts: [string, string, string] }
  | { kind: "prototype"; html: string };

function briefWait(key: BriefKey) {
  const index = BRIEF_FIELDS.findIndex((item) => item.key === key);
  const next = BRIEF_FIELDS[index + 1];
  const busy =
    key === "name" ? "the name" : key === "agentDoes" ? "what the agent is doing" : key === "rmSees" ? "what you expect to see" : "the benefits";
  if (!next) return `I am working on ${busy}.`;
  return `I am working on ${busy}. Please wait a moment before I ideate "${next.label}" with you.`;
}

function CoachPanel({
  open,
  forceHidden,
  onClose,
}: {
  open: boolean;
  forceHidden: boolean;
  onClose: () => void;
}) {
  const step = useSession((state) => state.step);
  const focus = useSession((state) => state.focus);
  const assistField = useSession((state) => state.assistField);
  const activeScene = useSession((state) => state.activeScene);
  const scenario = useSession((state) => painText(state));
  const painId = useSession((state) => state.painId);
  const painOwn = useSession((state) => state.painOwn);
  const brief = useSession((state) => state.brief);
  const scenes = useSession((state) => state.scenes);
  const previewSide = useSession((state) => state.previewSide);
  const [direction, setDirection] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [prototypeUndo, setPrototypeUndo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allScenes, setAllScenes] = useState(true);
  const seconds = useSeconds(busy);
  const coach = useServerFn(coachDraft);
  const refine = useServerFn(refinePrototype);

  useEffect(() => {
    setDraft(null);
    setError("");
    setDirection("");
    useSession.getState().setPrototypePreview(null);
  }, [step]);

  const focusKey =
    focus?.kind === "field"
      ? focus.key
      : focus?.kind === "scene"
        ? `scene-${focus.index}`
        : focus?.kind === "prototype"
          ? `step-${focus.step}`
          : focus?.kind === "pain"
            ? "pain"
            : "";

  useEffect(() => {
    setDirection("");
  }, [focusKey, allScenes]);

  if (forceHidden) return null;

  const canSuggest = step === "scenes" || step === "prototype";
  const field = focus?.kind === "field" ? BRIEF_FIELDS.find((item) => item.key === focus.key) : undefined;
  const sceneIndex = focus?.kind === "scene" ? focus.index : activeScene;
  const protoStep = focus?.kind === "prototype" ? focus.step : null;
  const needsBox =
    (step === "brief" && !field) || (step === "pain" && focus?.kind !== "pain") || (step === "prototype" && !protoStep);
  const blank =
    step === "pain"
      ? painId === "own" || !painId
        ? !painOwn.trim()
        : false
      : step === "brief"
        ? !String(field ? brief[field.key] : "").trim()
        : step === "scenes"
          ? allScenes
            ? scenes.every((scene) => !scene.trim())
            : !scenes[sceneIndex]?.trim()
          : false;
  const subject =
    step === "brief"
      ? (field?.refineAs ?? "")
      : step === "scenes"
        ? allScenes
          ? "the three screens"
          : `screen ${sceneIndex + 1}`
        : step === "pain"
          ? "your scenario"
          : protoStep
            ? `step ${protoStep}`
            : "";
  const moment = scenario.replace(/[.?!]\s*$/, "");
  const hint =
    step === "overview"
      ? "Nominate one person as group leader. They drive the laptop. At the end, your group presents the prototype to the other groups."
      : step === "pain"
        ? painGuide(painId)
        : step === "brief"
          ? briefGuide(field?.key ?? "", painId, scenario)
          : step === "scenes"
            ? (painId && SCENE_HINTS[painId]) ||
              (scenario
                ? SCENE_HINTS.own
                : "Design three screens. What are the three steps your assistant takes? Describe each screen.")
            : protoStep
              ? scenario
                ? `One change for this step, still about this scenario: ${moment}. The other two steps stay as they are.`
                : "Tell me the one change for this step. The other two stay as they are."
              : "Pick a step above the prototype. I'll only change that one.";

  async function suggest() {
    const state = useSession.getState();
    setBusy(true);
    setError("");
    const target =
      state.step === "brief"
        ? "field"
        : state.step === "scenes"
          ? allScenes
            ? "scenes"
            : "scene"
          : "pain";
    const scenePick = state.focus?.kind === "scene" ? state.focus.index : state.activeScene;
    const fieldKey = state.focus?.kind === "field" ? state.focus.key : undefined;
    const pickedStep = state.focus?.kind === "prototype" ? state.focus.step : null;
    if (fieldKey) state.setAssistField(fieldKey);
    try {
      if (state.step === "prototype") {
        if (!pickedStep) return;
        const shots = await Promise.all(
          state.images.map(async (slot) => {
            const shot = slot?.dataUrl ?? "";
            return shot ? shrinkImage(shot) : "";
          }),
        );
        const result = await traced("refine", { step: pickedStep, engine: chosenEngine(), htmlModel: debugModels().html, direction }, () =>
          refine({
            data: {
              html: state.prototypeHtml ?? "",
              direction,
              pain: painText(state),
              brief: state.brief,
              scenes: [...state.scenes],
              step: pickedStep,
              image: shots[pickedStep - 1] ?? "",
              images: shots,
              engine: chosenEngine(),
              htmlModel: debugModels().html,
              openRouterKey: savedOpenRouterKey(),
            },
          }),
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDraft({ kind: "prototype", html: result.html });
        useSession.getState().setPrototypePreview(result.html);
        return;
      }
      const result = await traced("coach", { target, field: fieldKey, sceneIndex: scenePick, direction, model: debugModels().coach }, () =>
        coach({
          data: {
            target,
            field: fieldKey,
            sceneIndex: scenePick,
            direction,
            pain: painText(state),
            brief: state.brief,
            scenes: [...state.scenes],
            model: debugModels().coach,
            openRouterKey: savedOpenRouterKey(),
          },
        }),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.pain) setDraft({ kind: "pain", text: result.pain });
      else if (result.text && fieldKey) setDraft({ kind: "field", key: fieldKey, text: result.text });
      else if (result.brief) setDraft({ kind: "brief", brief: result.brief });
      else if (result.paragraphs && result.paragraphs.length === 3) {
        setDraft({ kind: "scenes", texts: [result.paragraphs[0], result.paragraphs[1], result.paragraphs[2]] });
      } else if (result.paragraph) setDraft({ kind: "scene", index: scenePick, text: result.paragraph });
    } catch {
      setError("That didn't come back. Give it another go.");
    } finally {
      setBusy(false);
      useSession.getState().setAssistField(null);
    }
  }

  function accept() {
    if (!draft) return;
    const state = useSession.getState();
    if (draft.kind === "pain") state.setPainOwn(draft.text);
    else if (draft.kind === "field") state.setBriefField(draft.key, draft.text);
    else if (draft.kind === "brief") state.setBrief(draft.brief);
    else if (draft.kind === "scenes") draft.texts.forEach((text, index) => state.setScene(index as 0 | 1 | 2, text));
    else if (draft.kind === "prototype") {
      setPrototypeUndo(state.prototypeHtml);
      state.setPrototype(draft.html, currentBasis(state));
    } else state.setScene(draft.index, draft.text);
    setDraft(null);
    setDirection("");
  }

  return (
    <aside
      className={`${
        open ? "fixed inset-x-0 bottom-0 z-20 flex max-h-96" : "hidden"
      } w-full shrink-0 flex-col overflow-hidden border-t border-line bg-sheet lg:static lg:z-0 lg:flex lg:h-full lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
        <h2 className="text-xl font-medium">Workshop assistant</h2>
        <button type="button" className="h-12 rounded-full px-2 text-xl text-muted lg:hidden" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <div className="grid gap-3">
          {hint.split(/\n\n+/).map((line) => (
            <p key={line} className="text-xl leading-snug text-muted">
              {line}
            </p>
          ))}
        </div>
        {canSuggest ? (
          <>
            {step === "scenes" ? (
              <div className="ios-segment flex" aria-label="How many screens to draft">
                <button
                  type="button"
                  className={`h-9 flex-1 rounded-full px-2 text-lg ${allScenes ? "ios-seg-on" : "text-ink"}`}
                  onClick={() => setAllScenes(true)}
                >
                  All 3 screens
                </button>
                <button
                  type="button"
                  className={`h-9 flex-1 rounded-full px-2 text-lg ${allScenes ? "text-ink" : "ios-seg-on"}`}
                  onClick={() => setAllScenes(false)}
                >
                  This screen
                </button>
              </div>
            ) : null}
            {needsBox ? null : (
              <>
                <label className="block text-xl font-medium">
                  {blank
                    ? "Want a starting point? Add a steer if you like."
                    : subject
                      ? `How do you want ${subject} to be further refined?`
                      : "How do you want this to be further refined?"}
                  <textarea
                    value={direction}
                    onChange={(event) => setDirection(event.target.value.slice(0, 400))}
                    rows={2}
                    placeholder={
                      step === "prototype"
                        ? "E.g., add a section for recent trades"
                        : blank
                          ? "E.g., keep it practical"
                          : "E.g., shorten it or correct typos"
                    }
                    className="mt-1 w-full resize-none border border-line bg-sheet px-3 py-2 text-xl font-normal leading-snug"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || (step === "prototype" && (direction.trim().length < 3 || !useSession.getState().prototypeHtml))}
                  onClick={() => void suggest()}
                  className="h-12 btn-glow text-xl font-medium disabled:opacity-40"
                >
                  {busy ? `Thinking · ${seconds}s` : blank ? "Get some inspiration" : step === "brief" ? "Enrich selected" : "Enrich"}
                </button>
                {step === "prototype" ? (
                  <div className="border border-line p-3">
                    <p className="text-lg font-medium leading-snug">If you are done, be prepared to present to other groups in 90s.</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-lg leading-snug">
                      <li>Your group painpoint</li>
                      <li>Your agent idea</li>
                      <li>Walk us through the prototype</li>
                      <li>The key benefit as closing</li>
                    </ol>
                  </div>
                ) : null}
                {busy ? (
                  <div className="flex flex-col items-center gap-1">
                    <AgentBot mini />
                    <p className="text-center text-base leading-snug text-muted">
                      {step === "brief" && assistField ? briefWait(assistField) : `Thinking · ${seconds}s`}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
        {error ? <p className="text-xl text-rule">{error}</p> : null}
        {draft ? (
          <div className="rounded-2xl border border-line bg-soft p-3">
            <p className="text-base font-medium text-muted">A suggestion. It stays here until you accept it.</p>
            {draft.kind === "pain" ? <p className="mt-2 text-xl">{draft.text}</p> : null}
            {draft.kind === "field" ? <p className="mt-2 text-xl">{draft.text}</p> : null}
            {draft.kind === "scene" ? (
              <p className="mt-2 text-xl">
                <span className="font-medium">Screen {draft.index + 1}. </span>
                {draft.text}
              </p>
            ) : null}
            {draft.kind === "scenes" ? (
              <ol className="mt-2 grid gap-2 text-xl">
                {draft.texts.map((text, index) => (
                  <li key={index}>
                    <span className="font-medium">{index + 1}. </span>
                    {text}
                  </li>
                ))}
              </ol>
            ) : null}
            {draft.kind === "prototype" ? (
              <>
                <p className="mt-2 text-xl">The new version is in the frame. Flip between them, then accept it if the group likes it.</p>
                <div className="mt-2 flex border border-line" aria-label="Compare the edit">
                  <button
                    type="button"
                    className={`h-12 flex-1 text-xl ${previewSide === "before" ? "bg-soft font-bold" : "bg-sheet"}`}
                    onClick={() => useSession.getState().setPreviewSide("before")}
                  >
                    Before
                  </button>
                  <button
                    type="button"
                    className={`h-12 flex-1 border-l border-line text-xl ${previewSide === "after" ? "bg-soft font-bold" : "bg-sheet"}`}
                    onClick={() => useSession.getState().setPreviewSide("after")}
                  >
                    After
                  </button>
                </div>
              </>
            ) : null}
            {draft.kind === "brief" ? (
              <dl className="mt-2 grid gap-2 text-xl">
                {BRIEF_FIELDS.map((field) => (
                  <div key={field.key}>
                    <dt className="text-base text-muted">{field.label}</dt>
                    <dd>{draft.brief[field.key] || "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-1 btn-glow px-2 text-xl"
                onClick={accept}
              >
                <Check className="size-5 shrink-0" aria-hidden /> Accept
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-1 border border-line bg-sheet px-2 text-xl"
                onClick={() => {
                  if (draft?.kind === "prototype") useSession.getState().setPrototypePreview(null);
                  setDraft(null);
                }}
              >
                <X className="size-5 shrink-0" aria-hidden /> Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {step === "prototype" && prototypeUndo && !draft ? (
          <button
            type="button"
            className="h-12 border border-line bg-sheet text-xl"
            onClick={() => {
              const html = prototypeUndo;
              setPrototypeUndo(null);
              if (html) useSession.getState().setPrototype(html, currentBasis(useSession.getState()));
            }}
          >
            Undo last enrich
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function DebugMenu({ onClose, onEngine }: { onClose: () => void; onEngine: (engine: PrototypeEngine) => void }) {
  const readLog = useServerFn(readDebugLog);
  const clearServer = useServerFn(clearServerDebugLog);
  const [models, setModels] = useState<DebugModels>(() => debugModels());
  const [engine, setEngine] = useState<PrototypeEngine>(() => chosenEngine());
  const [clientLines, setClientLines] = useState(() => debugClientLog());
  const [serverLines, setServerLines] = useState<{ at: string; name: string; ms?: number; ok?: boolean; detail: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [routerKey, setRouterKey] = useState(() => savedOpenRouterKey());
  const desktop = typeof window !== "undefined" && window.localStorage?.getItem("cya-desktop") === "1";
  const [supabaseUrl, setSupabaseUrl] = useState(() => window.localStorage?.getItem("cya-supabase-fn") ?? "");
  const [supabaseAnon, setSupabaseAnon] = useState(() => window.localStorage?.getItem("cya-supabase-anon") ?? "");

  const refresh = async () => {
    setClientLines(debugClientLog());
    try {
      const lines = await readLog();
      setServerLines(Array.isArray(lines) ? lines : []);
    } catch (error) {
      debugPush({ name: "debug-log", ok: false, detail: error instanceof Error ? error.message : "Could not read the server log." });
    }
  };

  useEffect(() => {
    void refresh();
    return debugSubscribe(() => setClientLines(debugClientLog()));
  }, []);

  const report = [
    "=== client ===",
    ...clientLines.map((entry) => `${entry.at} ${entry.name} ${entry.ok === false ? "FAIL" : "ok"} ${entry.ms ?? ""}ms\n${entry.detail}`),
    "=== server ===",
    ...serverLines.map((entry) => `${entry.at} ${entry.name} ${entry.ok === false ? "FAIL" : "ok"} ${entry.ms ?? ""}ms\n${entry.detail}`),
  ].join("\n\n");

  return (
    <section className="fixed top-14 right-3 z-50 flex max-h-[78vh] w-[28rem] flex-col border border-line bg-sheet shadow-lg">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-lg font-medium">Debug</h2>
        <button type="button" className="text-lg" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="flex flex-col gap-2 overflow-auto p-3">
        {(
          [
            ["Text generation", "coach"],
            ["Prototype", "html"],
            ["Image", "image"],
          ] as const
        ).map(([label, key]) => (
          <label key={key} className="text-base">
            {label}
            <select
              className="mt-1 h-10 w-full border border-line bg-sheet px-2 text-base"
              value={
                key === "html" && engine === "deepseek"
                  ? "deepseek"
                  : models[key]
              }
              onChange={(event) => {
                const value = event.target.value;
                if ((key === "html" || key === "coach") && value === "deepseek") {
                  if (key === "html") {
                    setEngine("deepseek");
                    onEngine("deepseek");
                    try {
                      window.localStorage.setItem("cya-engine", "deepseek");
                    } catch {
                      /* The model choice is still stored below. */
                    }
                  }
                  const next = { ...models, [key]: "deepseek" };
                  setModels(next);
                  saveDebugModels(next);
                  return;
                }
                if (key === "html") {
                  setEngine("grok");
                  onEngine("grok");
                  try {
                    window.localStorage.setItem("cya-engine", "grok");
                  } catch {
                    /* The model choice is still stored below. */
                  }
                }
                const next = { ...models, [key]: value };
                setModels(next);
                saveDebugModels(next);
              }}
            >
              {MODEL_OPTIONS[key].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
              {key === "html" || key === "coach" ? <option value="deepseek">DeepSeek</option> : null}
            </select>
          </label>
        ))}
        <label className="text-base">
          Bring your own key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="OpenRouter key for DeepSeek"
            value={routerKey}
            onChange={(event) => {
              const value = event.target.value;
              setRouterKey(value);
              saveOpenRouterKey(value);
            }}
            className="mt-1 h-10 w-full border border-line bg-sheet px-2 text-base"
          />
        </label>
        <p className="text-sm leading-snug text-muted">Stays in this browser. Sent only when DeepSeek runs.</p>
        {desktop ? (
          <>
            <label className="text-base">
              Supabase function URL
              <input
                type="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://xxxx.supabase.co/functions/v1/workshop"
                value={supabaseUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setSupabaseUrl(value);
                  const next = value.trim();
                  if (next) window.localStorage.setItem("cya-supabase-fn", next);
                  else window.localStorage.removeItem("cya-supabase-fn");
                }}
                className="mt-1 h-10 w-full border border-line bg-sheet px-2 text-base"
              />
            </label>
            <label className="text-base">
              Supabase anon key
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Only if the function asks for it"
                value={supabaseAnon}
                onChange={(event) => {
                  const value = event.target.value;
                  setSupabaseAnon(value);
                  const next = value.trim();
                  if (next) window.localStorage.setItem("cya-supabase-anon", next);
                  else window.localStorage.removeItem("cya-supabase-anon");
                }}
                className="mt-1 h-10 w-full border border-line bg-sheet px-2 text-base"
              />
            </label>
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-10 border border-line px-3 text-base" onClick={() => void refresh()}>
            Refresh log
          </button>
          <button
            type="button"
            className="h-10 border border-line px-3 text-base"
            onClick={() => {
              void navigator.clipboard.writeText(report).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              });
            }}
          >
            {copied ? "Copied" : "Copy log"}
          </button>
          <button
            type="button"
            className="h-10 border border-line px-3 text-base"
            onClick={() => {
              debugClearClient();
              void clearServer().catch(() => undefined);
              setServerLines([]);
            }}
          >
            Clear log
          </button>
          <button
            type="button"
            className="h-10 border border-line bg-soft px-3 text-base"
            onClick={() => {
              void useSession.getState().reset();
            }}
          >
            Clear all caches
          </button>
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all border border-line p-2 text-xs leading-snug">{report || "No log yet."}</pre>
      </div>
    </section>
  );
}
