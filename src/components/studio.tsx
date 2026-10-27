import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ClipboardList,
  Clock,
  Expand,
  Eye,
  Globe,
  Goal,
  Layers,
  ListChecks,
  ListTodo,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Pencil,
  Scale,
  Search,
  Shrink,
  Tag,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { BRIEF_FIELDS, FLOW, PAINPOINTS, SCENE_HINTS, briefGuide, painGuide, type Brief, type BriefKey, type StepId } from "@/lib/content";
import { type PrototypeEngine } from "@/lib/ai.functions";
import { WORKSHOP_URL, workshopAction } from "@/lib/workshop-api";
import { debugClearClient, debugClientLog, debugModels, debugPush, debugSubscribe, MODEL_OPTIONS, saveDebugModels, saveOpenRouterKey, savedOpenRouterKey, traced, type DebugModels } from "@/lib/debug";
import { loadImages, loadPrototype, saveImage } from "@/lib/media-db";
import {
  briefReady,
  currentBasis,
  imageStale,
  painText,
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

const BOT_GAITS = ["walk", "jog", "run"] as const;

function AgentBot() {
  const [gait] = useState(() => BOT_GAITS[Math.floor(Math.random() * BOT_GAITS.length)]);
  return (
    <div className={`bot-track bot-${gait}`} aria-hidden>
      <div className="bot-fit">
        <div className="bot-scale">
          <div className="bot">
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
          </div>
        </div>
      </div>
    </div>
  );
}

function Working({ label, seconds }: { label: string; seconds: number }) {
  return (
    <div className="flex h-full w-full flex-col justify-center">
      <AgentBot />
      <p className="text-center text-xl">
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

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
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

function isolateStep(html: string, step: number, present = false) {
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
function magnify(){
  if(!${present ? "true" : "false"})return;
  var fit=document.getElementById("cya-fit");
  var section=document.querySelector("section[data-step]");
  if(!fit||!section)return;
  section.style.zoom="1";
  var top=fit.getBoundingClientRect().top;
  var room=fit.clientHeight;
  var used=0;
  [].forEach.call(section.querySelectorAll("h1,h2,h3,p,button,table,li,article,div"),function(el){
    if(el===section||el.classList.contains("cya-main")||el.classList.contains("cya-agent"))return;
    var r=el.getBoundingClientRect();
    if(r.height<16||r.width<16||r.height>room*0.82)return;
    used=Math.max(used,r.bottom-top);
  });
  if(used<80||room<80)return;
  var scale=Math.max(1,Math.min(room/used,1.6));
  section.style.zoom=String(Math.round(scale*100)/100);
}
magnify();
setTimeout(function(){pin();faces();magnify();},40);
window.addEventListener("resize",magnify);
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
  const [zoom, setZoom] = useState(readZoom);
  useEffect(() => {
    document.documentElement.style.fontSize = `${Math.round(zoom * 100)}%`;
    try {
      window.localStorage.setItem("cya-zoom", String(zoom));
    } catch {
      /* The size still applies for this visit. */
    }
  }, [zoom]);
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

  const kicker = step === "overview" ? "" : (FLOW.find((item) => item.id === step)?.kicker ?? "");
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
            <div className="flex h-9 items-center border border-line bg-sheet" aria-label="Zoom">
              <button
                type="button"
                className="h-9 w-9 text-xl font-medium disabled:opacity-40"
                aria-label="Zoom out"
                disabled={zoom <= 0.85}
                onClick={() => setZoom((current) => Math.round(Math.max(0.85, current - 0.1) * 10) / 10)}
              >
                −
              </button>
              <span className="w-12 text-center text-base font-medium">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="h-9 w-9 text-xl font-medium disabled:opacity-40"
                aria-label="Zoom in"
                disabled={zoom >= 1.4}
                onClick={() => setZoom((current) => Math.round(Math.min(1.4, current + 0.1) * 10) / 10)}
              >
                +
              </button>
            </div>
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
          <div className="flex w-72 flex-col items-center gap-4 border border-line bg-sheet px-6 py-6 shadow-[6px_6px_0_0_#111]">
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
          AI assistant
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
    { n: "0", title: "Painpoint", body: "Choose the painpoint your group feels most strongly. If it is not listed, write your own.", icon: ListChecks, tone: "#F8D0D4" },
    { n: "1", title: "Idea brief", body: "Name the agent. Say what it does, what you receive, and who it helps.", icon: Bot, tone: "#D6E4F0" },
    { n: "2", title: "Design 3 screens", body: "Design three screens in order, then generate a screen for each.", icon: Clapperboard, tone: "#D4EDE4" },
    { n: "3", title: "Prototype", body: "Generate the clickable prototype, make one or two edits, then present it.", icon: MonitorSmartphone, tone: "#F3E6C8" },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-4xl leading-tight">AI Powered, Human Led</h1>
        <p className="mt-2 max-w-4xl text-xl leading-snug text-muted">Ideate your agent</p>
        {typeof window !== "undefined" && window.localStorage?.getItem("cya-desktop") === "1" && !window.localStorage.getItem("cya-supabase-fn") ? (
          <p className="mt-2 max-w-4xl text-xl leading-snug">
            This copy calls Supabase. Paste the function URL before you start.
          </p>
        ) : null}
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-3">
        {phases.map((phase) => (
          <article key={phase.n} className="flex min-h-0 flex-col rounded-2xl border border-line p-4" style={{ background: phase.tone }}>
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

function readZoom() {
  try {
    const saved = Number(window.localStorage.getItem("cya-zoom"));
    if (saved >= 0.85 && saved <= 1.4) return saved;
  } catch {
    /* Keep the default size. */
  }
  return 1;
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
    users: Users,
    clock: Clock,
    layers: Layers,
    goal: Goal,
    scale: Scale,
    clipboard: ClipboardList,
    list: ListTodo,
    messages: MessageSquare,
    globe: Globe,
    news: Newspaper,
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <h1 className="text-3xl leading-tight">Phase 0: Which one is your biggest painpoint as an RM?</h1>
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
            Next
          </button>
        </div>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-2">
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
              className={`scenario-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border px-3 py-2 text-left text-lg leading-snug ${
                selected ? "is-picked border-rule bg-soft" : "border-line bg-sheet"
              }`}
            >
              <span className="flex shrink-0 items-center gap-2">
                <Icon className="size-5 shrink-0 text-rule" aria-hidden />
                <span className="font-medium text-rule">{item.id}</span>
                <span className="font-bold leading-tight">{item.title}</span>
              </span>
              <span className="mt-1 min-h-0 flex-1 overflow-y-auto text-base leading-snug">{item.text}</span>
            </button>
          );
        })}
        </div>
        <label
          className={`flex h-14 shrink-0 flex-row items-center gap-3 rounded-xl border-2 px-3 ${ownOn ? "border-rule bg-soft" : "border-line bg-sheet"}`}
        >
          <Pencil className="size-5 shrink-0 text-rule" aria-hidden />
          <span className="shrink-0 font-medium text-rule">Your own</span>
          <textarea
            value={painOwn}
            onFocus={() => {
              selectPain("own");
              useSession.getState().setFocus({ kind: "pain" });
            }}
            onChange={(event) => setPainOwn(event.target.value)}
            placeholder="Or write a painpoint that hurts more."
            aria-label="Or add your own"
            className="min-h-0 w-full flex-1 resize-none bg-transparent text-lg leading-snug"
          />
        </label>
      </div>
    </div>
  );
}

function BriefStep() {
  const brief = useSession((state) => state.brief);
  const painId = useSession((state) => state.painId);
  const painOwn = useSession((state) => state.painOwn);
  const focus = useSession((state) => state.focus);
  const setBriefField = useSession((state) => state.setBriefField);
  const setFocus = useSession((state) => state.setFocus);
  const go = useSession((state) => state.go);
  const ready = briefReady(brief);
  const selected = (key: BriefKey) => focus?.kind === "field" && focus.key === key;
  const box = (key: BriefKey) =>
    selected(key) ? "border-2 border-rule bg-soft" : "border border-line bg-sheet";
  const icons: Record<BriefKey, typeof Tag> = {
    name: Tag,
    agentDoes: Bot,
    rmSees: Eye,
    benefits: Trophy,
  };
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
            Next
          </button>
        </div>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        <div className="shrink-0 border border-dashed border-line bg-sheet px-3 py-2">
          <p className="flex items-center gap-2 text-base font-medium text-muted">
            <ClipboardList className="size-5 shrink-0" aria-hidden />
            Painpoint
          </p>
          <p className="mt-1 text-lg leading-snug">
            {painId === "own" ? (
              painOwn.trim() || "Write your own painpoint in the previous step."
            ) : painId ? (
              <>
                <span className="font-bold">{PAINPOINTS.find((item) => item.id === painId)?.title}. </span>
                {PAINPOINTS.find((item) => item.id === painId)?.text}
              </>
            ) : (
              "Pick one in the previous step."
            )}
          </p>
        </div>
        {BRIEF_FIELDS.map((field) => {
          const Icon = icons[field.key];
          return (
            <label key={field.key} className={`flex min-h-0 flex-col text-xl font-medium leading-tight ${field.key === "name" ? "shrink-0" : "flex-1"}`}>
              <span className="flex items-center gap-2">
                <Icon className="size-5 shrink-0 text-rule" aria-hidden />
                {field.label}
              </span>
              {field.key === "name" ? (
                <input
                  value={brief.name}
                  onFocus={() => setFocus({ kind: "field", key: "name" })}
                  onChange={(event) => setBriefField("name", event.target.value)}
                  placeholder={field.hint}
                  className={`mt-1 h-12 w-full px-3 text-xl font-normal ${box("name")}`}
                />
              ) : (
                <textarea
                  value={brief[field.key]}
                  onFocus={() => setFocus({ kind: "field", key: field.key })}
                  onChange={(event) => setBriefField(field.key, event.target.value)}
                  placeholder={field.hint}
                  className={`mt-1 min-h-12 w-full flex-1 resize-none px-3 py-2 text-xl font-normal leading-snug ${box(field.key)}`}
                />
              )}
            </label>
          );
        })}
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
  const imageFn = workshopAction<{ ok: true; dataUrl: string } | { ok: false; error: string }>("image");
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
      setErrors((current) => ({ ...current, [index]: "" }));
      try {
        await saveImage(index, slot);
      } catch {
        /* The screen is already visible. Saving it must not look like a failure. */
      }
    } catch {
      setErrors((current) => ({
        ...current,
        [index]: "That screen did not come back. Try again.",
      }));
    } finally {
      setBusy((current) => ({ ...current, [index]: false }));
    }
  }

  const allFrames = images.every(Boolean);
  const anyStale = scenes.some((scene, index) => imageStale(images[index], scene));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight">Phase 2: Design 3 screens</h1>
          <p className="mt-1 text-xl text-muted">
            {anyStale
              ? "A screen is out of date. Generate it again before you press Next."
              : "Write one or two sentences, then generate the screen. Click a box if you want help with that screen."}
          </p>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <button type="button" className="h-12 rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("brief")}>
            Back
          </button>
          <button
            type="button"
            disabled={!allFrames || anyStale}
            className={`h-12 rounded-full px-4 text-xl font-medium disabled:opacity-40 ${allFrames && !anyStale ? "btn-glow" : "border border-line"}`}
            onClick={() => advance("prototype")}
          >
            Next
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
                  Screen {index + 1} prompt
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
                {errors[index] && !slot ? (
                  <p className="max-h-10 shrink-0 overflow-hidden px-3 text-base leading-tight text-rule">{errors[index]}</p>
                ) : null}
              </div>
              <div
                className="group scene-frame relative shrink-0 border-l border-line bg-sheet"
                onClick={() => {
                  setActiveScene(sceneIndex);
                  useSession.getState().setFocus({ kind: "scene", index: sceneIndex });
                }}
              >
                {slot ? <img src={slot.dataUrl} alt="" className="absolute inset-0 h-full w-full object-contain" /> : null}
                {stale ? (
                  <span className="absolute top-1 left-1 z-10 border border-line bg-soft px-2 py-1 text-base font-medium text-ink">Out of date</span>
                ) : null}
                {busy[index] ? (
                  <div className="absolute inset-0 z-10 flex flex-col bg-sheet/85">
                    <Working label="Generating this screen" seconds={seconds} />
                  </div>
                ) : slot ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-ink/45 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={!scene.trim()}
                      onClick={() => void draw(sceneIndex)}
                      className="h-11 btn-glow px-3 text-lg font-medium disabled:opacity-40"
                    >
                      Generate screen again
                    </button>
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center border border-line bg-sheet"
                      aria-label={`Open screen ${index + 1} full screen`}
                      onClick={() => setFull(slot.dataUrl)}
                    >
                      <Expand className="size-5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
                    {scene.trim() ? (
                      <button type="button" onClick={() => void draw(sceneIndex)} className="h-11 btn-glow px-4 text-lg font-medium">
                        Generate screen
                      </button>
                    ) : (
                      <p className="text-center text-lg text-muted">Write a sentence first</p>
                    )}
                  </div>
                )}
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
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("cya-supabase-fn")?.trim() : "";
    const localUrl = saved || WORKSHOP_URL;
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
  const protoFn = workshopAction<{ ok: true; html: string } | { ok: false; error: string }>("prototype");
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
  const isolated = found ? isolateStep(liveHtml, view, present) : "";
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
    useSession.getState().setPrototypeCue(false);
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
        setView(stepNo);
        useSession.getState().setFocus({ kind: "prototype", step: stepNo });
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
      setView(1);
      useSession.getState().setFocus({ kind: "prototype", step: 1 });
      useSession.getState().setPrototypeCue(true);
    } catch {
      setError("The prototype did not come back. Try again.");
    } finally {
      setBusy(false);
      setStreamText("");
    }
  }

  async function buildStep(stepNo: 1 | 2 | 3) {
    if (!framesReady) return;
    setBusy(true);
    setError("");
    setStreamText("");
    setWriting(stepNo);
    setView(stepNo);
    useSession.getState().setPrototypeCue(false);
    useSession.getState().setPrototypePreview(null);
    const previousHtml = useSession.getState().prototypeHtml ?? "";
    const push = (delta: string) => setStreamText((current) => current + delta);
    const shots = await Promise.all(
      images.map(async (slot) => {
        const shot = slot?.dataUrl ?? "";
        return shot ? shrinkImage(shot) : "";
      }),
    );
    try {
      const payload = {
        pain,
        brief,
        scenes: [...scenes],
        step: stepNo,
        previousHtml,
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
      setPrototype(streamed.html, currentBasis(useSession.getState()));
      setStreamText("");
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

  const shift = (dir: -1 | 1) => {
    const next = (view + dir) as 1 | 2 | 3;
    if (next < 1 || next > 3) return;
    if (!readySteps.includes(next) && !(busy && writing === next)) return;
    setView(next);
    useSession.getState().setFocus({ kind: "prototype", step: next });
  };

  const stepTabs = (
    <>
      {([1, 2, 3] as const).map((stepNo) => {
        const focused = view === stepNo;
        const narrative = (scenes[stepNo - 1] ?? "").replace(/\s+/g, " ").trim();
        const writingNow = busy && writing === stepNo;
        const label = writingNow ? `Screen ${stepNo} · generating` : present && focused ? `Presenting screen ${stepNo}` : `Screen ${stepNo}`;
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

  const screenBar = (
    <div className="flex min-w-0 flex-1">
      {stepTabs}
      <div className="flex shrink-0 border-l border-line">
        <button
          type="button"
          aria-label="Previous screen"
          disabled={view === 1}
          className="inline-flex w-10 items-center justify-center border-r border-line disabled:opacity-30"
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Next screen"
          disabled={view === 3 || (!readySteps.includes((view + 1) as 1 | 2 | 3) && !(busy && writing === view + 1))}
          className="inline-flex w-10 items-center justify-center disabled:opacity-30"
          onClick={() => shift(1)}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-3xl leading-tight">Phase 3: Rapid prototype</h1>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="h-12 shrink-0 whitespace-nowrap rounded-full px-3 text-xl font-medium text-rule" onClick={() => go("scenes")}>
            Back
          </button>
          <button
            type="button"
            disabled={!framesReady || busy}
            onClick={() => void (readySteps.length === 3 ? buildStep(view) : build())}
            className="h-12 shrink-0 whitespace-nowrap rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40"
          >
            {busy
              ? `Generating screen ${writing} · ${seconds}s`
              : readySteps.length === 3
                ? `Generate screen ${view} again`
                : "Generate the prototype"}
          </button>
          {liveHtml && !busy && readySteps.length === 3 && !present ? (
            <button
              type="button"
              className="inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap border border-line px-3 text-xl"
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
      <p className="mt-1 shrink-0 text-xl text-muted">Three clickable screens. One or two edits, then you're ready to share.</p>
      {stale ? <p className="mt-2 text-xl text-muted">The brief or screens changed. This prototype is still here.</p> : null}
      {!framesReady ? <p className="mt-2 text-xl">Generate all three screens first, then we can build the prototype.</p> : null}
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
            {screenBar}
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
            {screenBar}
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
  | { kind: "field"; key: BriefKey; text: string; hold?: boolean }
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
  const prototypeCue = useSession((state) => state.prototypeCue);
  const [direction, setDirection] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [prototypeUndo, setPrototypeUndo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seconds = useSeconds(busy);
  const coach = workshopAction<{ ok: true; text?: string; hold?: boolean; paragraph?: string; paragraphs?: string[]; brief?: Brief; pain?: string } | { ok: false; error: string }>("coach");
  const refine = workshopAction<{ ok: true; html: string } | { ok: false; error: string }>("refine");

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
  }, [focusKey]);

  if (forceHidden) return null;

  const field = focus?.kind === "field" ? BRIEF_FIELDS.find((item) => item.key === focus.key) : undefined;
  const briefWords = field ? wordCount(String(brief[field.key] ?? "")) : 0;
  const canSuggest = step === "scenes" || step === "prototype" || (step === "brief" && briefWords >= 10);
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
          ? !scenes[sceneIndex]?.trim()
          : false;
  const subject =
    step === "brief"
      ? (field?.refineAs ?? "")
      : step === "scenes"
        ? `screen ${sceneIndex + 1}`
        : step === "pain"
          ? "your painpoint"
          : protoStep
            ? `screen ${protoStep}`
            : "";
  const moment = scenario.replace(/[.?!]\s*$/, "");
  const hint =
    step === "overview"
      ? "Nominate one person as group leader. They drive the laptop. At the end, your group presents the prototype to the other groups."
      : step === "pain"
        ? painGuide(painId ?? "")
        : step === "brief"
          ? briefGuide(field?.key ?? "", painId ?? "", scenario) +
            (field && field.key !== "name" && briefWords < 10
              ? "\n\nOnce this box has at least 10 words, I can refine it with you."
              : "")
          : step === "scenes"
            ? (painId && SCENE_HINTS[painId]) ||
              (scenario
                ? SCENE_HINTS.own
                : "Design three screens. What are the three steps your assistant takes? Describe each screen.")
            : protoStep
              ? scenario
                ? `One change for this screen, still about this painpoint: ${moment}. The other two screens stay as they are.`
                : "Tell me the one change for this screen. The other two stay as they are."
              : "Pick a screen above the prototype. I'll only change that one.";

  async function suggest() {
    const state = useSession.getState();
    setBusy(true);
    setError("");
    const target =
      state.step === "brief"
        ? "field"
        : state.step === "scenes"
          ? state.scenes.every((item) => !item.trim())
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
      else if (result.text && fieldKey) setDraft({ kind: "field", key: fieldKey, text: result.text, hold: result.hold });
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
    if (!draft || (draft.kind === "field" && draft.hold)) return;
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
        <h2 className="text-xl font-medium">AI assistant</h2>
        <button type="button" className="h-12 rounded-full px-2 text-xl text-muted lg:hidden" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <div className="grid gap-3">
          {step === "prototype" && prototypeCue ? (
            <p className="text-xl leading-snug">All three screens are ready. Start from Screen 1. One or two refinements is enough, then present.</p>
          ) : null}
          {hint.split(/\n\n+/).map((line) => (
            <p key={line} className="text-xl leading-snug text-muted">
              {line}
            </p>
          ))}
        </div>
        {canSuggest ? (
          <>
            {needsBox || (step === "scenes" && blank) ? null : (
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
                        : "E.g., shorten it or correct typos"
                    }
                    className="mt-1 w-full resize-none border border-line bg-sheet px-3 py-2 text-xl font-normal leading-snug"
                  />
                </label>
            )}
            {step === "prototype" && needsBox ? null : (
                <button
                  type="button"
                  disabled={busy || (step === "prototype" && (direction.trim().length < 3 || !useSession.getState().prototypeHtml))}
                  onClick={() => void suggest()}
                  className="h-12 btn-glow text-xl font-medium disabled:opacity-40"
                >
                  {busy
                    ? `Thinking · ${seconds}s`
                    : step === "prototype"
                      ? "Refine screen"
                      : step === "scenes" && !blank
                        ? "Refine prompt"
                        : step === "brief"
                          ? "Refine"
                          : blank
                            ? "Get some inspiration"
                            : "Enrich"}
                </button>
            )}
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
                  <div className="flex w-full flex-col items-center gap-1">
                    <AgentBot />
                    <p className="text-center text-base leading-snug text-muted">
                      {`Thinking · ${seconds}s`}
                    </p>
                  </div>
                ) : null}
          </>
        ) : null}
        {error ? <p className="text-xl text-rule">{error}</p> : null}
        {draft ? (
          <div className="rounded-2xl border border-line bg-soft p-3">
            <p className="text-base font-medium text-muted">
              {draft.kind === "field" && draft.hold
                ? "Give this more thought first. I have not changed the box."
                : "A suggestion. It stays here until you accept it."}
            </p>
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
              {draft.kind === "field" && draft.hold ? null : (
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-1 btn-glow px-2 text-xl"
                onClick={accept}
              >
                <Check className="size-5 shrink-0" aria-hidden /> Accept
              </button>
              )}
              <button
                type="button"
                className={`inline-flex h-12 items-center justify-center gap-1 border border-line bg-sheet px-2 text-xl ${draft.kind === "field" && draft.hold ? "col-span-2" : ""}`}
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
  const readLog = workshopAction<{ at: string; name: string; ms?: number; ok?: boolean; detail: string }[]>("log");
  const clearServer = workshopAction<{ ok: boolean }>("clear");
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
