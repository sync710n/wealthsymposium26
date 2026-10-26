import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EMPTY_BRIEF, PAINPOINTS, type Brief, type BriefKey, type StepId } from "@/lib/content";
import { clearImages, savePrototype, type ImageSlot } from "@/lib/media-db";

export type FocusTarget =
  | { kind: "pain" }
  | { kind: "field"; key: BriefKey }
  | { kind: "scene"; index: 0 | 1 | 2 }
  | { kind: "prototype"; step: 1 | 2 | 3 }
  | null;

export type PhaseClocks = {
  idea: number | null;
  scenes: number | null;
  prototype: number | null;
};

const emptyClocks = (): PhaseClocks => ({ idea: null, scenes: null, prototype: null });

export type SessionState = {
  hydrated: boolean;
  mediaReady: boolean;
  groupName: string;
  startedAt: number | null;
  step: StepId;
  reached: StepId;
  painId: string | null;
  painOwn: string;
  brief: Brief;
  scenes: [string, string, string];
  activeScene: 0 | 1 | 2;
  images: [ImageSlot, ImageSlot, ImageSlot];
  prototypeHtml: string | null;
  prototypeBasis: string | null;
  prototypePreview: string | null;
  previewSide: "before" | "after";
  clocks: PhaseClocks;
  focus: FocusTarget;
  assistField: BriefKey | null;
  resumeAt: StepId | null;
  setHydrated: (value: boolean) => void;
  setMedia: (images: [ImageSlot, ImageSlot, ImageSlot]) => void;
  setGroupName: (value: string) => void;
  startFresh: () => Promise<void>;
  resume: () => void;
  go: (step: StepId) => void;
  selectPain: (id: string) => void;
  setPainOwn: (value: string) => void;
  setBriefField: (key: keyof Brief, value: string) => void;
  setBrief: (brief: Brief) => void;
  setScene: (index: 0 | 1 | 2, value: string) => void;
  setActiveScene: (index: 0 | 1 | 2) => void;
  setImage: (index: 0 | 1 | 2, slot: ImageSlot) => void;
  setPrototype: (html: string, basis: string) => void;
  setPrototypePreview: (html: string | null) => void;
  setPreviewSide: (side: "before" | "after") => void;
  setFocus: (focus: FocusTarget) => void;
  setAssistField: (key: BriefKey | null) => void;
  reset: () => Promise<void>;
};

const ORDER: StepId[] = ["overview", "pain", "brief", "scenes", "prototype"];

export function stepIndex(step: StepId) {
  return ORDER.indexOf(step);
}

const emptyImages = (): [ImageSlot, ImageSlot, ImageSlot] => [null, null, null];

const initial = {
  hydrated: false,
  mediaReady: false,
  groupName: "",
  startedAt: null as number | null,
  step: "overview" as StepId,
  reached: "overview" as StepId,
  painId: null as string | null,
  painOwn: "",
  brief: { ...EMPTY_BRIEF },
  scenes: ["", "", ""] as [string, string, string],
  activeScene: 0 as 0 | 1 | 2,
  images: emptyImages(),
  prototypeHtml: null as string | null,
  prototypeBasis: null as string | null,
  prototypePreview: null as string | null,
  previewSide: "after" as "before" | "after",
  clocks: emptyClocks(),
  focus: null as FocusTarget,
  assistField: null as BriefKey | null,
  resumeAt: null as StepId | null,
};

export function painText(state: Pick<SessionState, "painId" | "painOwn">) {
  if (state.painId === "own") return state.painOwn.trim();
  const item = PAINPOINTS.find((point) => point.id === state.painId);
  return item ? `${item.title}. ${item.text}` : "";
}

export function briefReady(brief: Brief) {
  return (["name", "agentDoes", "rmSees", "benefits"] as const).every((key) => brief[key].trim().length > 0);
}

export function sceneReady(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length >= 8;
}

export function imageStale(slot: ImageSlot, scene: string) {
  if (!slot) return false;
  return slot.sceneText.trim() !== scene.trim();
}

export function currentBasis(state: Pick<SessionState, "painId" | "painOwn" | "brief" | "scenes" | "images">) {
  return JSON.stringify({
    pain: painText(state),
    brief: state.brief,
    scenes: state.scenes,
    frames: state.images.map((slot) => slot?.sceneText ?? ""),
  });
}

function withClock(clocks: PhaseClocks | undefined, step: StepId): PhaseClocks {
  const next = { ...emptyClocks(), ...(clocks ?? {}) };
  const now = Date.now();
  if ((step === "pain" || step === "brief") && !next.idea) next.idea = now;
  if (step === "scenes" && !next.scenes) next.scenes = now;
  if (step === "prototype" && !next.prototype) next.prototype = now;
  return next;
}

let abandonHydration = false;

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initial,
      setHydrated: (value) => set({ hydrated: value }),
      setMedia: (images) => set({ images, mediaReady: true }),
      setGroupName: (value) => set({ groupName: value.slice(0, 40) }),
      startFresh: async () => {
        abandonHydration = true;
        const clocks = withClock(emptyClocks(), "pain");
        set({
          ...initial,
          hydrated: true,
          mediaReady: true,
          images: emptyImages(),
          startedAt: Date.now(),
          step: "pain",
          reached: "pain",
          resumeAt: "pain",
          clocks,
        });
        window.setTimeout(() => {
          try {
            localStorage.removeItem("cya-session");
          } catch {
            /* The save can be large. Clearing it must not block the click. */
          }
          void clearImages().catch(() => undefined);
        }, 0);
      },
      resume: () => {
        const at = get().resumeAt;
        if (!at || at === "overview") return;
        set((state) => ({ step: at, clocks: withClock(state.clocks, at) }));
      },
      go: (step) => {
        const reached = get().reached;
        if (step !== "overview" && stepIndex(step) > stepIndex(reached)) return;
        set((state) => ({
          step,
          resumeAt: step === "overview" ? state.resumeAt : step,
          clocks: withClock(state.clocks, step),
        }));
      },
      selectPain: (id) =>
        set((state) => ({
          painId: id,
          reached: stepIndex(state.reached) > stepIndex("pain") ? state.reached : "pain",
        })),
      setPainOwn: (value) => set({ painOwn: value.slice(0, 400), painId: "own" }),
      setBriefField: (key, value) =>
        set((state) => ({ brief: { ...state.brief, [key]: value.slice(0, 800) } })),
      setBrief: (brief) => set({ brief: { ...EMPTY_BRIEF, ...brief } }),
      setScene: (index, value) =>
        set((state) => {
          const scenes = [...state.scenes] as [string, string, string];
          scenes[index] = value.slice(0, 1000);
          return { scenes, activeScene: index };
        }),
      setActiveScene: (index) => set({ activeScene: index }),
      setImage: (index, slot) =>
        set((state) => {
          const images = [...state.images] as [ImageSlot, ImageSlot, ImageSlot];
          images[index] = slot;
          return { images };
        }),
      setPrototype: (html, basis) => {
        set({ prototypeHtml: html, prototypeBasis: basis, prototypePreview: null, previewSide: "after" });
        void savePrototype(html).catch(() => undefined);
      },
      setPrototypePreview: (html) => set({ prototypePreview: html, previewSide: html ? "after" : "after" }),
      setPreviewSide: (side) => set({ previewSide: side }),
      setFocus: (focus) => set({ focus }),
      setAssistField: (key) => set({ assistField: key }),
      reset: async () => {
        await clearImages().catch(() => undefined);
        set({
          ...initial,
          hydrated: true,
          mediaReady: true,
          images: emptyImages(),
        });
      },
    }),
    {
      name: "cya-session",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : localStorage,
      ),
      partialize: (state) => ({
        groupName: state.groupName,
        startedAt: state.startedAt,
        step: state.step,
        reached: state.reached,
        painId: state.painId,
        painOwn: state.painOwn,
        brief: state.brief,
        scenes: state.scenes,
        activeScene: state.activeScene,
        prototypeBasis: state.prototypeBasis,
        clocks: state.clocks,
        resumeAt: state.resumeAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (abandonHydration) {
          const clocks = withClock(emptyClocks(), "pain");
          useSession.setState({
            ...initial,
            hydrated: true,
            mediaReady: true,
            images: emptyImages(),
            startedAt: Date.now(),
            step: "pain",
            reached: "pain",
            resumeAt: "pain",
            clocks,
          });
          return;
        }
        const saved =
          state?.resumeAt && state.resumeAt !== "overview"
            ? state.resumeAt
            : state?.step && state.step !== "overview"
              ? state.step
              : state?.reached && state.reached !== "overview"
                ? state.reached
                : null;
        useSession.setState({
          hydrated: true,
          step: "overview",
          resumeAt: saved,
          brief: { ...EMPTY_BRIEF, ...(state?.brief ?? {}) },
          clocks: { ...emptyClocks(), ...(state?.clocks ?? {}) },
        });
        if (state?.prototypeHtml) void savePrototype(state.prototypeHtml).catch(() => undefined);
      },
      skipHydration: true,
    },
  ),
);

function savedStep(value: unknown): StepId | null {
  return value === "pain" || value === "brief" || value === "scenes" || value === "prototype" || value === "overview"
    ? value
    : null;
}

function applySaved(state: Record<string, unknown>) {
  const step = savedStep(state.step);
  const resumeAt = savedStep(state.resumeAt);
  const reached = savedStep(state.reached);
  const saved = resumeAt && resumeAt !== "overview" ? resumeAt : step && step !== "overview" ? step : reached && reached !== "overview" ? reached : null;
  const html = typeof state.prototypeHtml === "string" ? state.prototypeHtml : "";
  const scenes = Array.isArray(state.scenes) ? state.scenes.map((item) => String(item ?? "")).slice(0, 3) : [];
  while (scenes.length < 3) scenes.push("");
  useSession.setState({
    hydrated: true,
    step: "overview",
    resumeAt: saved,
    groupName: typeof state.groupName === "string" ? state.groupName.slice(0, 40) : "",
    startedAt: typeof state.startedAt === "number" ? state.startedAt : null,
    reached: reached && reached !== "overview" ? reached : (saved ?? "overview"),
    painId: typeof state.painId === "string" ? state.painId : null,
    painOwn: typeof state.painOwn === "string" ? state.painOwn : "",
    brief: { ...EMPTY_BRIEF, ...(state.brief && typeof state.brief === "object" ? (state.brief as Brief) : {}) },
    scenes: [scenes[0] ?? "", scenes[1] ?? "", scenes[2] ?? ""] as [string, string, string],
    activeScene: state.activeScene === 1 || state.activeScene === 2 ? state.activeScene : 0,
    prototypeBasis: typeof state.prototypeBasis === "string" ? state.prototypeBasis : null,
    clocks: { ...emptyClocks(), ...(state.clocks && typeof state.clocks === "object" ? (state.clocks as PhaseClocks) : {}) },
    ...(html ? { prototypeHtml: html } : {}),
  });
  if (html) void savePrototype(html).catch(() => undefined);
}

export function loadSavedSession() {
  if (abandonHydration || typeof window === "undefined") return;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("cya-session");
  } catch {
    raw = null;
  }
  if (abandonHydration) return;
  if (!raw) {
    useSession.setState({ hydrated: true });
    return;
  }
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | Record<string, unknown>;
    const state =
      parsed && typeof parsed === "object" && "state" in parsed && parsed.state && typeof parsed.state === "object"
        ? parsed.state
        : (parsed as Record<string, unknown>);
    applySaved(state as Record<string, unknown>);
  } catch {
    useSession.setState({ hydrated: true });
  }
}
