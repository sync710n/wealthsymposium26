import { i as __toESM } from "../_runtime.mjs";
import { U as isRedirect, b as require_jsx_runtime, q as require_react, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as ListChecks, c as Check, i as MonitorSmartphone, l as Bot, o as Expand, r as Shrink, s as Clapperboard, t as X } from "../_libs/lucide-react.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BthUlT5Z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var PAINPOINTS = [
	{
		id: "01",
		text: "The leads I get are too generic, so I cannot tell who is actually worth a call."
	},
	{
		id: "02",
		text: "Only about 30% of my prospect list is useful. Many holdings are small or inactive."
	},
	{
		id: "03",
		text: "I can only filter clients by age, holdings, and funds."
	},
	{
		id: "04",
		text: "A campaign email went out in my name, and I did not know."
	},
	{
		id: "05",
		text: "I copy codes between systems just to check a profit margin."
	},
	{
		id: "06",
		text: "I jump across 7–8 systems, and I cannot search a client by name."
	},
	{
		id: "07",
		text: "I sometimes open a stale portfolio. The client sees the update before I do."
	},
	{
		id: "08",
		text: "I need transaction history beyond two years, and the system stops there."
	},
	{
		id: "09",
		text: "I spend 20–30 minutes per client on charts, bond quotes, FX, and insurance."
	},
	{
		id: "10",
		text: "I calculate by hand how taking dividends changes the portfolio."
	},
	{
		id: "11",
		text: "I keep too many tabs open across the client record, products, and forms."
	},
	{
		id: "12",
		text: "The sales process feels too bureaucratic to move while the client is with me."
	},
	{
		id: "13",
		text: "Some products take 5–7 working days here, and about two days at other banks."
	},
	{
		id: "14",
		text: "EDD reports take more of my time than the client conversation."
	},
	{
		id: "15",
		text: "In a meeting I take notes by hand, and I cannot answer until I look it up later."
	},
	{
		id: "16",
		text: "I do not have one 360 view, so I piece the client together from several screens."
	}
];
var EMPTY_BRIEF = {
	name: "",
	agentDoes: "",
	rmSees: "",
	benefits: ""
};
var BRIEF_FIELDS = [
	{
		key: "name",
		label: "Name your agent",
		hint: "A short name the group will remember",
		refineAs: "the agent name"
	},
	{
		key: "agentDoes",
		label: "What exactly is the agent doing?",
		hint: "The job, in one or two sentences",
		refineAs: "what the agent is doing"
	},
	{
		key: "rmSees",
		label: "What do you see or receive?",
		hint: "What lands in front of you",
		refineAs: "what you see or receive"
	},
	{
		key: "benefits",
		label: "Key benefits for you or your clients",
		hint: "Why this is worth it",
		refineAs: "the benefits"
	}
];
var FLOW = [
	{
		id: "pain",
		n: "0",
		short: "Scenario",
		kicker: "Phase 0"
	},
	{
		id: "brief",
		n: "1",
		short: "Brief",
		kicker: "Phase 1"
	},
	{
		id: "scenes",
		n: "2",
		short: "Scenes",
		kicker: "Phase 2"
	},
	{
		id: "prototype",
		n: "3",
		short: "Prototype",
		kicker: "Phase 3"
	}
];
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var coachDraft = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("b7eed30b32c1b603ae0c0691a34fd9ef92e4cb9f8e963fb0aa7ac68d8ca3a331"));
var generateSceneImage = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("3d65c4f9a534699f6c2b634801ca1f839c5b7b79c56d8b2d02838d01b4044eb9"));
var generatePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("5f07220d25115a1a4fe0baa47d4d702d08f8cdd64fb9d9303de59697385e361d"));
var refinePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("b2261155703b81b5d1557b75e66456c034f91741b083711947fa122dbd3118a2"));
var DB_NAME = "create-your-agent";
var STORE = "images";
function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function loadImages() {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const store = db.transaction(STORE, "readonly").objectStore(STORE);
		const slots = [
			null,
			null,
			null
		];
		let pending = 3;
		for (let i = 0; i < 3; i++) {
			const req = store.get(String(i));
			req.onsuccess = () => {
				const value = req.result;
				slots[i] = value?.dataUrl ? value : null;
				pending -= 1;
				if (pending === 0) resolve(slots);
			};
			req.onerror = () => reject(req.error);
		}
	});
}
async function saveImage(index, slot) {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(slot, String(index));
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
async function clearImages() {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
var emptyClocks = () => ({
	idea: null,
	scenes: null,
	prototype: null
});
var ORDER = [
	"overview",
	"pain",
	"brief",
	"scenes",
	"prototype"
];
function stepIndex(step) {
	return ORDER.indexOf(step);
}
var emptyImages = () => [
	null,
	null,
	null
];
var initial = {
	hydrated: false,
	mediaReady: false,
	groupName: "",
	startedAt: null,
	step: "overview",
	reached: "overview",
	painId: null,
	painOwn: "",
	brief: { ...EMPTY_BRIEF },
	scenes: [
		"",
		"",
		""
	],
	activeScene: 0,
	images: emptyImages(),
	prototypeHtml: null,
	prototypeBasis: null,
	clocks: emptyClocks(),
	focus: null,
	assistField: null
};
function painText(state) {
	if (state.painId === "own") return state.painOwn.trim();
	return PAINPOINTS.find((item) => item.id === state.painId)?.text ?? "";
}
function briefReady(brief) {
	return [
		"name",
		"agentDoes",
		"rmSees",
		"benefits"
	].every((key) => brief[key].trim().length > 0);
}
function sceneReady(text) {
	return text.trim().split(/\s+/).filter(Boolean).length >= 8;
}
function imageStale(slot, scene) {
	if (!slot) return false;
	return slot.sceneText.trim() !== scene.trim();
}
function currentBasis(state) {
	return JSON.stringify({
		pain: painText(state),
		brief: state.brief,
		scenes: state.scenes,
		frames: state.images.map((slot) => slot?.sceneText ?? "")
	});
}
function withClock(clocks, step) {
	const next = {
		...emptyClocks(),
		...clocks ?? {}
	};
	const now = Date.now();
	if ((step === "pain" || step === "brief") && !next.idea) next.idea = now;
	if (step === "scenes" && !next.scenes) next.scenes = now;
	if (step === "prototype" && !next.prototype) next.prototype = now;
	return next;
}
var useSession = create()(persist((set, get) => ({
	...initial,
	setHydrated: (value) => set({ hydrated: value }),
	setMedia: (images) => set({
		images,
		mediaReady: true
	}),
	setGroupName: (value) => set({ groupName: value.slice(0, 40) }),
	begin: () => set((state) => ({
		startedAt: state.startedAt ?? Date.now(),
		step: "pain",
		reached: stepIndex(state.reached) > stepIndex("pain") ? state.reached : "pain",
		clocks: withClock(state.clocks, "pain")
	})),
	go: (step) => {
		const reached = get().reached;
		if (step !== "overview" && stepIndex(step) > stepIndex(reached)) return;
		set((state) => ({
			step,
			clocks: withClock(state.clocks, step)
		}));
	},
	selectPain: (id) => set((state) => ({
		painId: id,
		reached: stepIndex(state.reached) > stepIndex("pain") ? state.reached : "pain"
	})),
	setPainOwn: (value) => set({
		painOwn: value.slice(0, 400),
		painId: "own"
	}),
	setBriefField: (key, value) => set((state) => ({ brief: {
		...state.brief,
		[key]: value.slice(0, 800)
	} })),
	setBrief: (brief) => set({ brief: {
		...EMPTY_BRIEF,
		...brief
	} }),
	setScene: (index, value) => set((state) => {
		const scenes = [...state.scenes];
		scenes[index] = value.slice(0, 1e3);
		return {
			scenes,
			activeScene: index
		};
	}),
	setActiveScene: (index) => set({ activeScene: index }),
	setImage: (index, slot) => set((state) => {
		const images = [...state.images];
		images[index] = slot;
		return { images };
	}),
	setPrototype: (html, basis) => set({
		prototypeHtml: html,
		prototypeBasis: basis
	}),
	setFocus: (focus) => set({ focus }),
	setAssistField: (key) => set({ assistField: key }),
	reset: async () => {
		await clearImages().catch(() => void 0);
		set({
			...initial,
			hydrated: true,
			mediaReady: true,
			images: emptyImages()
		});
	}
}), {
	name: "cya-session",
	storage: createJSONStorage(() => typeof window === "undefined" ? {
		getItem: () => null,
		setItem: () => void 0,
		removeItem: () => void 0
	} : localStorage),
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
		prototypeHtml: state.prototypeHtml,
		prototypeBasis: state.prototypeBasis,
		clocks: state.clocks
	}),
	onRehydrateStorage: () => (state) => {
		useSession.setState({
			hydrated: true,
			brief: {
				...EMPTY_BRIEF,
				...state?.brief ?? {}
			},
			clocks: {
				...emptyClocks(),
				...state?.clocks ?? {}
			}
		});
	},
	skipHydration: true
}));
function useSeconds(active) {
	const [seconds, setSeconds] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		const started = Date.now();
		const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1e3)), 250);
		return () => window.clearInterval(id);
	}, [active]);
	return active ? seconds : 0;
}
function Working({ label, seconds }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "flex items-center gap-3 text-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex items-end gap-1",
			"aria-hidden": true,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nb-dot size-2 bg-ink" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nb-dot size-2 bg-ink" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nb-dot size-2 bg-ink" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
			label,
			" · ",
			seconds,
			"s"
		] })]
	});
}
var PHASE_LIMIT = {
	idea: 300,
	scenes: 600,
	prototype: 900
};
function clockKey(step) {
	if (step === "pain" || step === "brief") return "idea";
	if (step === "scenes") return "scenes";
	if (step === "prototype") return "prototype";
	return null;
}
function formatLeft(total) {
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function embedScenes(html, images) {
	let out = html;
	images.forEach((url, index) => {
		if (!url) return;
		out = out.split(`__SCENE_${index + 1}__`).join(url);
	});
	return out;
}
function hasStep(html, step) {
	return new RegExp(`data-step=["']${step}["']`).test(html);
}
function shrinkImage(dataUrl) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const width = 480;
			const height = Math.max(1, Math.round(img.height / Math.max(img.width, 1) * width));
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d");
			if (!context) {
				resolve("");
				return;
			}
			context.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/jpeg", .6));
		};
		img.onerror = () => resolve("");
		img.src = dataUrl;
	});
}
function Studio() {
	const step = useSession((state) => state.step);
	const clocks = useSession((state) => state.clocks);
	const key = clockKey(step);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [coachOpen, setCoachOpen] = (0, import_react.useState)(false);
	const [present, setPresent] = (0, import_react.useState)(false);
	const [armReset, setArmReset] = (0, import_react.useState)(false);
	const startRequested = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		const load = () => {
			if (cancel || useSession.getState().mediaReady) return;
			loadImages().then((images) => {
				if (!cancel) useSession.getState().setMedia(images);
			}).catch(() => {
				if (!cancel) useSession.getState().setMedia([
					null,
					null,
					null
				]);
			});
		};
		const finish = () => {
			if (cancel) return;
			useSession.setState({ hydrated: true });
			load();
			if (startRequested.current && useSession.getState().step === "overview") useSession.getState().begin();
		};
		Promise.resolve(useSession.persist.rehydrate()).then(finish);
		if (useSession.persist.hasHydrated()) finish();
		const unsub = useSession.persist.onFinishHydration(finish);
		return () => {
			cancel = true;
			unsub();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		setArmReset(false);
	}, [step]);
	(0, import_react.useEffect)(() => {
		const onFullscreen = () => {
			if (!document.fullscreenElement) setPresent(false);
		};
		document.addEventListener("fullscreenchange", onFullscreen);
		return () => document.removeEventListener("fullscreenchange", onFullscreen);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!present) return;
		const onKey = (event) => {
			if (event.key !== "Escape") return;
			setPresent(false);
			if (document.fullscreenElement) document.exitFullscreen().catch(() => void 0);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [present]);
	const kicker = step === "overview" ? "Create Your Agent" : FLOW.find((item) => item.id === step)?.kicker ?? "";
	const started = key && clocks ? clocks[key] : null;
	const left = started && key ? Math.max(0, PHASE_LIMIT[key] - Math.floor((now - started) / 1e3)) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "aurora-app flex h-dvh flex-col overflow-hidden p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "shell-glow mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex h-12 shrink-0 items-center gap-2 border-b border-line px-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-head shrink-0 text-xl text-ink",
							children: "Wealth Symposium"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "shrink-0 text-xl text-muted",
							children: kicker
						}),
						left !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: `shrink-0 border border-line px-2 text-xl font-medium text-ink ${left === 0 ? "bg-soft" : "bg-sheet"}`,
							"aria-label": left === 0 ? "Time is up" : `${formatLeft(left)} remaining`,
							children: left === 0 ? "Time is up" : `${formatLeft(left)} left`
						}) : null,
						step !== "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, { placement: "header" }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ml-auto flex shrink-0 items-center gap-2",
							children: step !== "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "h-12 shrink-0 rounded-full px-2 text-xl font-medium text-rule",
								onClick: () => {
									if (!armReset) {
										setArmReset(true);
										return;
									}
									useSession.getState().reset();
									setArmReset(false);
									setPresent(false);
								},
								children: armReset ? "Confirm clear" : "Start again"
							}) : null
						})
					]
				}),
				step !== "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, { placement: "bar" }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 flex-1 flex-col lg:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
						className: "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 py-2 xl:overflow-hidden",
						children: [
							step === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, { onStart: () => {
								startRequested.current = true;
								if (useSession.persist.hasHydrated()) useSession.getState().begin();
							} }) : null,
							step === "pain" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PainStep, {}) : null,
							step === "brief" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BriefStep, {}) : null,
							step === "scenes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScenesStep, {}) : null,
							step === "prototype" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrototypeStep, {
								present,
								onPresent: () => setPresent((value) => !value)
							}) : null
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoachPanel, {
						open: coachOpen,
						forceHidden: present,
						onClose: () => setCoachOpen(false)
					})]
				})
			]
		}), step !== "overview" && !present ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "fixed right-4 bottom-4 z-20 h-12 rounded-full btn-glow px-4 text-xl font-medium lg:hidden",
			onClick: () => setCoachOpen(true),
			children: "Assistant"
		}) : null]
	});
}
function Stepper({ placement }) {
	const step = useSession((state) => state.step);
	const reached = useSession((state) => state.reached);
	const go = useSession((state) => state.go);
	const inHeader = placement === "header";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: inHeader ? "ios-segment hidden min-w-0 flex-1 items-center justify-center xl:flex" : "ios-segment mx-2 my-1.5 flex shrink-0 overflow-x-auto xl:hidden",
		"aria-label": "Stages",
		children: FLOW.map((item) => {
			const locked = stepIndex(item.id) > stepIndex(reached);
			const current = step === item.id;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: locked,
				onClick: () => go(item.id),
				className: `${inHeader ? "h-9" : "h-10"} shrink-0 rounded-full px-3 text-left text-xl whitespace-nowrap disabled:opacity-35 ${current ? "ios-seg-on" : "text-ink"}`,
				children: [
					item.n,
					" ",
					item.short
				]
			}, item.id);
		})
	});
}
function Overview({ onStart }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-4xl leading-tight",
				children: "Create your agent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-4xl text-xl leading-snug text-muted",
				children: "About 30 minutes on one laptop. Pick a leader to drive. No real client names or account numbers."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid min-h-0 flex-1 grid-cols-2 gap-3",
				children: [
					{
						n: "0",
						title: "Scenario",
						body: "Pick the moment that hurts most.",
						icon: ListChecks
					},
					{
						n: "1",
						title: "Idea brief",
						body: "Name the agent and what it does for you.",
						icon: Bot
					},
					{
						n: "2",
						title: "Cut scenes",
						body: "Direct three steps. We draw each one.",
						icon: Clapperboard
					},
					{
						n: "3",
						title: "Prototype",
						body: "A clickable app, then one or two edits.",
						icon: MonitorSmartphone
					}
				].map((phase) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "flex min-h-0 flex-col rounded-2xl border border-line bg-soft p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(phase.icon, {
							className: "size-10 text-rule",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-base font-semibold text-rule",
							children: ["Phase ", phase.n]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 text-2xl font-semibold",
							children: phase.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xl leading-snug text-muted",
							children: phase.body
						})
					]
				}, phase.n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-12 rounded-full btn-glow px-6 text-xl font-medium",
					onClick: onStart,
					children: "Start now"
				})
			})
		]
	});
}
function advance(next) {
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
	const focus = useSession((state) => state.focus);
	const ownReady = painId === "own" && painOwn.trim().length > 0;
	const ready = painId && painId !== "own" || ownReady;
	const ownOn = painId === "own" || focus?.kind === "pain";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "shrink-0 text-3xl leading-tight",
				children: "Phase 0: Which moment hurts?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid min-h-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-4 xl:gap-1",
				children: PAINPOINTS.map((item) => {
					const selected = painId === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => selectPain(item.id),
						className: `h-full min-h-12 overflow-hidden rounded-xl border px-2 py-0.5 text-left type-seen ${selected ? "border-rule bg-soft" : "border-line bg-sheet"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-1.5 font-medium text-rule",
							children: item.id
						}), item.text]
					}, item.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1.5 flex shrink-0 items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: painOwn,
						onFocus: () => useSession.getState().setFocus({ kind: "pain" }),
						onChange: (event) => setPainOwn(event.target.value),
						placeholder: "Or write a scenario that hurts more.",
						"aria-label": "Or add your own",
						className: `h-12 min-w-0 flex-1 rounded-xl border-2 px-3 text-xl ${ownOn ? "border-rule bg-soft" : "border-line bg-sheet"}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-12 rounded-full px-3 text-xl font-medium text-rule",
						onClick: () => go("overview"),
						children: "Back"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !ready,
						className: "h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40",
						onClick: () => advance("brief"),
						children: "Move on"
					})
				]
			})
		]
	});
}
function BriefStep() {
	const brief = useSession((state) => state.brief);
	const pain = useSession((state) => painText(state));
	const focus = useSession((state) => state.focus);
	const setBriefField = useSession((state) => state.setBriefField);
	const setFocus = useSession((state) => state.setFocus);
	const go = useSession((state) => state.go);
	const ready = briefReady(brief);
	const assistField = useSession((state) => state.assistField);
	const name = BRIEF_FIELDS[0];
	const rest = BRIEF_FIELDS.slice(1);
	const selected = (key) => focus?.kind === "field" && focus.key === key;
	const box = (key) => selected(key) ? "border-2 border-rule bg-soft" : "border border-line bg-sheet";
	const waitFor = (key) => {
		const index = BRIEF_FIELDS.findIndex((item) => item.key === key);
		const current = index > 0 ? BRIEF_FIELDS[index - 1] : void 0;
		if (!current || assistField !== current.key) return "";
		return `I am working on ${current.key === "name" ? "the name" : current.key === "agentDoes" ? "what the agent is doing" : current.key === "rmSees" ? "what you see" : "the benefits"}. Please wait a moment before I ideate "${BRIEF_FIELDS[index]?.label}" with you.`;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl leading-tight",
					children: "Phase 1: Idea brief"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xl text-muted",
					children: "Click a box if you want the assistant to help with that one."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-12 rounded-full px-3 text-xl font-medium text-rule",
						onClick: () => go("pain"),
						children: "Back"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !ready,
						className: "h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40",
						onClick: () => advance("scenes"),
						children: "Move on"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border border-line bg-soft px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-base font-medium text-muted",
						children: "Painpoint scenario"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xl leading-snug",
						children: pain || "Pick one in the previous step."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex flex-col text-xl font-medium leading-tight",
					children: [name.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: brief.name,
						onFocus: () => setFocus({
							kind: "field",
							key: "name"
						}),
						onChange: (event) => setBriefField("name", event.target.value),
						placeholder: name.hint,
						className: `mt-1 h-12 w-full px-3 text-xl font-normal ${box("name")}`
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex min-h-0 flex-1 flex-col gap-2",
				children: rest.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex min-h-0 flex-1 flex-col text-xl font-medium leading-tight",
					children: [
						field.label,
						waitFor(field.key) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 text-base font-normal text-muted",
							children: waitFor(field.key)
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: brief[field.key],
							onFocus: () => setFocus({
								kind: "field",
								key: field.key
							}),
							onChange: (event) => setBriefField(field.key, event.target.value),
							placeholder: field.hint,
							className: `mt-1 min-h-12 w-full flex-1 resize-none px-3 py-2 text-xl font-normal leading-snug ${box(field.key)}`
						})
					]
				}, field.key))
			})
		]
	});
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
	const [busy, setBusy] = (0, import_react.useState)({});
	const [errors, setErrors] = (0, import_react.useState)({});
	const [full, setFull] = (0, import_react.useState)(null);
	const anyBusy = Object.values(busy).some(Boolean);
	const seconds = useSeconds(anyBusy);
	(0, import_react.useEffect)(() => {
		if (!full) return;
		const onKey = (event) => {
			if (event.key === "Escape") setFull(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [full]);
	async function draw(index) {
		const state = useSession.getState();
		const paragraph = state.scenes[index];
		const context = [state.brief.agentDoes, state.brief.rmSees].filter(Boolean).join(" ").slice(0, 500);
		setBusy((current) => ({
			...current,
			[index]: true
		}));
		setErrors((current) => ({
			...current,
			[index]: ""
		}));
		try {
			const result = await imageFn({ data: {
				index,
				paragraph,
				context
			} });
			if (!result.ok) {
				setErrors((current) => ({
					...current,
					[index]: result.error
				}));
				return;
			}
			const slot = {
				dataUrl: result.dataUrl,
				sceneText: paragraph
			};
			setImage(index, slot);
			await saveImage(index, slot);
		} catch {
			setErrors((current) => ({
				...current,
				[index]: "That screen did not come back. Try again."
			}));
		} finally {
			setBusy((current) => ({
				...current,
				[index]: false
			}));
		}
	}
	const paragraphsReady = scenes.every((scene) => sceneReady(scene));
	const allFrames = images.every(Boolean);
	const anyStale = scenes.some((scene, index) => imageStale(images[index], scene));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl leading-tight",
					children: "Phase 2: Three cut scenes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xl text-muted",
					children: anyStale ? "A picture is out of date. Draw it again before you move on." : "Write one or two sentences, then draw it. Click a box if you want help with that scene."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap justify-end gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-12 rounded-full px-3 text-xl font-medium text-rule",
							onClick: () => go("brief"),
							children: "Back"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !paragraphsReady || anyBusy,
							className: "h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40",
							onClick: () => {
								Promise.all([
									0,
									1,
									2
								].map((index) => draw(index)));
							},
							children: anyBusy ? `Drawing · ${seconds}s` : "Draw all 3"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !allFrames || anyStale,
							className: "h-12 rounded-full border border-line px-4 text-xl font-medium disabled:opacity-40",
							onClick: () => advance("prototype"),
							children: "Move on"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3",
				children: scenes.map((scene, index) => {
					const slot = images[index];
					const stale = imageStale(slot, scene);
					const sceneIndex = index;
					const picked = focus?.kind === "scene" && focus.index === sceneIndex;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: `flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 ${picked ? "border-rule" : "border-line"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
								className: `shrink-0 border-b border-line px-3 py-1.5 text-xl font-medium leading-tight ${picked ? "bg-soft" : ""}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-rule",
										children: ["0", index + 1]
									}),
									" Cut scene",
									stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 font-normal text-muted",
										children: "Out of date"
									}) : null
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: scene,
								placeholder: "What is on this screen, what the agent says, and what you do.",
								onFocus: () => {
									setActiveScene(sceneIndex);
									useSession.getState().setFocus({
										kind: "scene",
										index: sceneIndex
									});
								},
								onChange: (event) => setScene(sceneIndex, event.target.value),
								className: `h-36 w-full shrink-0 resize-none border-0 px-3 py-2 text-xl leading-snug ${picked ? "bg-soft" : "bg-sheet"}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !sceneReady(scene) || busy[index],
								onClick: () => void draw(sceneIndex),
								className: "h-12 shrink-0 border-t border-line text-xl font-medium disabled:opacity-40",
								children: busy[index] ? `Drawing · ${seconds}s` : !sceneReady(scene) ? "Write a full sentence" : slot ? "Draw this screen again" : "Draw this screen"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex min-h-0 flex-1 items-center justify-center border-t border-line bg-soft",
								children: slot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-full w-full",
									"aria-label": `Open cut scene ${index + 1} full screen`,
									onClick: () => setFull(slot.dataUrl),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: slot.dataUrl,
										alt: "",
										className: "h-full w-full bg-sheet object-contain"
									})
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-3 text-center text-xl text-muted",
									children: busy[index] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Working, {
										label: "Drawing this screen",
										seconds
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The screen lands here" })
								})
							}),
							errors[index] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-3 py-1 text-base text-rule",
								children: errors[index]
							}) : null
						]
					}, index);
				})
			}),
			full ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-6",
				"aria-label": "Close full screen",
				onClick: () => setFull(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: full,
					alt: "",
					className: "max-h-full max-w-full rounded-2xl object-contain"
				})
			}) : null
		]
	});
}
function PrototypeStep({ present, onPresent }) {
	const pain = useSession((state) => painText(state));
	const brief = useSession((state) => state.brief);
	const scenes = useSession((state) => state.scenes);
	const images = useSession((state) => state.images);
	const mediaReady = useSession((state) => state.mediaReady);
	const prototypeHtml = useSession((state) => state.prototypeHtml);
	const prototypeBasis = useSession((state) => state.prototypeBasis);
	const setPrototype = useSession((state) => state.setPrototype);
	const go = useSession((state) => state.go);
	const protoFn = useServerFn(generatePrototype);
	const frameRef = (0, import_react.useRef)(null);
	const stageRef = (0, import_react.useRef)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [writing, setWriting] = (0, import_react.useState)(1);
	const [error, setError] = (0, import_react.useState)("");
	const [view, setView] = (0, import_react.useState)(1);
	const seconds = useSeconds(busy);
	const framesReady = images.every((slot) => slot?.dataUrl);
	const basis = currentBasis({
		painId: useSession.getState().painId,
		painOwn: useSession.getState().painOwn,
		brief,
		scenes,
		images
	});
	const stale = Boolean(mediaReady && prototypeHtml && prototypeBasis && prototypeBasis !== basis);
	const liveHtml = prototypeHtml ? embedScenes(prototypeHtml, images.map((slot) => slot?.dataUrl ?? null)) : "";
	(0, import_react.useEffect)(() => {
		const frame = frameRef.current;
		if (!frame || !liveHtml) return;
		const send = () => frame.contentWindow?.postMessage({
			type: "cya-step",
			step: view
		}, "*");
		frame.addEventListener("load", send);
		send();
		return () => frame.removeEventListener("load", send);
	}, [liveHtml, view]);
	async function build() {
		if (!framesReady) return;
		setBusy(true);
		setError("");
		let html = "";
		try {
			for (const stepNo of [
				1,
				2,
				3
			]) {
				setWriting(stepNo);
				const shot = images[stepNo - 1]?.dataUrl ?? "";
				const image = shot ? await shrinkImage(shot) : "";
				const result = await protoFn({ data: {
					pain,
					brief,
					scenes: [...scenes],
					step: stepNo,
					previousHtml: html,
					image
				} });
				if (!result.ok) {
					setError(result.error);
					return;
				}
				html = result.html;
				setPrototype(html, "");
				setView(stepNo);
			}
			setPrototype(html, currentBasis(useSession.getState()));
		} catch {
			setError("The prototype did not come back. Try again.");
		} finally {
			setBusy(false);
		}
	}
	const readySteps = [
		1,
		2,
		3
	].filter((stepNo) => hasStep(prototypeHtml ?? "", stepNo));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl leading-tight",
					children: "Phase 3: Rapid prototype"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xl text-muted",
					children: "Three clickable steps. One or two edits, then you're ready to share."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-12 rounded-full px-3 text-xl font-medium text-rule",
							onClick: () => go("scenes"),
							children: "Back"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !framesReady || busy,
							onClick: () => void build(),
							className: "h-12 rounded-full btn-glow px-4 text-xl font-medium disabled:opacity-40",
							children: busy ? `Writing step ${writing} · ${seconds}s` : prototypeHtml ? "Write it again" : "Write the prototype"
						}),
						liveHtml && !busy && readySteps.length === 3 && !present ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-12 items-center gap-2 border border-line px-3 text-xl",
							onClick: () => {
								onPresent();
								const node = stageRef.current;
								if (node?.requestFullscreen) node.requestFullscreen().catch(() => void 0);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Expand, {
								className: "size-5",
								"aria-hidden": true
							}), "Present"]
						}) : null
					]
				})]
			}),
			stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xl text-muted",
				children: "The brief or screens changed. This prototype is still here."
			}) : null,
			!framesReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xl",
				children: "Draw all three screens first, then we can build the prototype."
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xl text-rule",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: stageRef,
				className: present ? "fixed inset-0 z-40 flex flex-col bg-sheet" : "mt-2 flex min-h-0 flex-1 flex-col overflow-hidden border border-line bg-sheet",
				children: [
					present ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 items-center justify-between border-b border-line bg-soft px-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xl font-medium",
							children: "Presenting"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "inline-flex h-12 items-center gap-2 px-3 text-xl font-medium",
							onClick: () => {
								onPresent();
								if (document.fullscreenElement) document.exitFullscreen().catch(() => void 0);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shrink, {
								className: "size-5",
								"aria-hidden": true
							}), " Exit"]
						})]
					}) : null,
					liveHtml ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex shrink-0 border-b border-line",
						"aria-label": "Cut scenes",
						children: [
							1,
							2,
							3
						].map((stepNo) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !readySteps.includes(stepNo),
							className: `h-10 flex-1 border-r border-line text-xl last:border-r-0 disabled:opacity-40 ${view === stepNo ? "bg-soft font-bold" : "bg-sheet"}`,
							onClick: () => {
								setView(stepNo);
								useSession.getState().setFocus({
									kind: "prototype",
									step: stepNo
								});
							},
							children: busy && writing === stepNo && !readySteps.includes(stepNo) ? `Step ${stepNo} · writing` : `Step ${stepNo}`
						}, stepNo))
					}) : null,
					busy && !liveHtml ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex flex-1 items-center px-4 text-xl text-muted",
						children: ["Writing step ", writing]
					}) : liveHtml ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						ref: frameRef,
						title: "Prototype",
						sandbox: "allow-scripts",
						srcDoc: liveHtml,
						className: "min-h-0 w-full flex-1 bg-sheet"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-4 py-6 text-xl text-muted",
						children: "The prototype appears here, one cut scene at a time."
					})
				]
			})
		]
	});
}
function CoachPanel({ open, forceHidden, onClose }) {
	const step = useSession((state) => state.step);
	const focus = useSession((state) => state.focus);
	const activeScene = useSession((state) => state.activeScene);
	const [direction, setDirection] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [allScenes, setAllScenes] = (0, import_react.useState)(true);
	const seconds = useSeconds(busy);
	const coach = useServerFn(coachDraft);
	const refine = useServerFn(refinePrototype);
	(0, import_react.useEffect)(() => {
		setDraft(null);
		setError("");
		setDirection("");
	}, [step]);
	const focusKey = focus?.kind === "field" ? focus.key : focus?.kind === "scene" ? `scene-${focus.index}` : focus?.kind === "prototype" ? `step-${focus.step}` : focus?.kind === "pain" ? "pain" : "";
	(0, import_react.useEffect)(() => {
		setDirection("");
	}, [focusKey, allScenes]);
	(0, import_react.useEffect)(() => {
		if (focus?.kind === "scene") setAllScenes(false);
	}, [focus]);
	if (forceHidden) return null;
	const canSuggest = step === "pain" || step === "brief" || step === "scenes" || step === "prototype";
	const field = focus?.kind === "field" ? BRIEF_FIELDS.find((item) => item.key === focus.key) : void 0;
	const sceneIndex = focus?.kind === "scene" ? focus.index : activeScene;
	const protoStep = focus?.kind === "prototype" ? focus.step : null;
	const needsBox = step === "brief" && !field || step === "pain" && focus?.kind !== "pain" || step === "prototype" && !protoStep;
	const subject = step === "brief" ? field?.refineAs ?? "" : step === "scenes" ? allScenes ? "the three cut scenes" : `cut scene ${sceneIndex + 1}` : step === "pain" ? "your scenario" : protoStep ? `step ${protoStep}` : "";
	const hint = step === "overview" ? "Someone needs to drive the laptop. Agree who that is before you start." : step === "pain" ? "Pick the scenario your group feels most. If yours is missing, click the box at the bottom and I'll help you write it." : step === "brief" ? field ? "Tell me how you want this box to sound. Nothing changes until you accept it." : "Click the box you want help with. Imagine you have an assistant sitting next to you." : step === "scenes" ? "You're directing. Click a scene if you want help with that beat, or let me draft all three." : protoStep ? "Tell me the one change for this step. The other two stay as they are." : "Pick a step above the prototype. I'll only change that one.";
	async function suggest() {
		const state = useSession.getState();
		setBusy(true);
		setError("");
		const target = state.step === "brief" ? "field" : state.step === "scenes" ? allScenes ? "scenes" : "scene" : "pain";
		const scenePick = state.focus?.kind === "scene" ? state.focus.index : state.activeScene;
		const fieldKey = state.focus?.kind === "field" ? state.focus.key : void 0;
		const pickedStep = state.focus?.kind === "prototype" ? state.focus.step : null;
		if (fieldKey) state.setAssistField(fieldKey);
		try {
			if (state.step === "prototype") {
				if (!pickedStep) return;
				const result = await refine({ data: {
					html: state.prototypeHtml ?? "",
					direction,
					pain: painText(state),
					brief: state.brief,
					scenes: [...state.scenes],
					step: pickedStep
				} });
				if (!result.ok) {
					setError(result.error);
					return;
				}
				setDraft({
					kind: "prototype",
					html: result.html
				});
				return;
			}
			const result = await coach({ data: {
				target,
				field: fieldKey,
				sceneIndex: scenePick,
				direction,
				pain: painText(state),
				brief: state.brief,
				scenes: [...state.scenes]
			} });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			if (result.pain) setDraft({
				kind: "pain",
				text: result.pain
			});
			else if (result.text && fieldKey) setDraft({
				kind: "field",
				key: fieldKey,
				text: result.text
			});
			else if (result.brief) setDraft({
				kind: "brief",
				brief: result.brief
			});
			else if (result.paragraphs && result.paragraphs.length === 3) setDraft({
				kind: "scenes",
				texts: [
					result.paragraphs[0],
					result.paragraphs[1],
					result.paragraphs[2]
				]
			});
			else if (result.paragraph) setDraft({
				kind: "scene",
				index: scenePick,
				text: result.paragraph
			});
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
		else if (draft.kind === "scenes") draft.texts.forEach((text, index) => state.setScene(index, text));
		else if (draft.kind === "prototype") state.setPrototype(draft.html, currentBasis(state));
		else state.setScene(draft.index, draft.text);
		setDraft(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: `${open ? "fixed inset-x-0 bottom-0 z-20 flex max-h-96" : "hidden"} w-full shrink-0 flex-col overflow-hidden border-t border-line bg-sheet lg:static lg:z-0 lg:flex lg:h-full lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-center justify-between border-b border-line px-4 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-medium",
				children: "Workshop assistant"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "h-12 rounded-full px-2 text-xl text-muted lg:hidden",
				onClick: onClose,
				children: "Close"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xl leading-snug text-muted",
					children: hint
				}),
				canSuggest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [step === "scenes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ios-segment flex",
					"aria-label": "How many scenes to draft",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `h-9 flex-1 rounded-full px-2 text-lg ${allScenes ? "ios-seg-on" : "text-ink"}`,
						onClick: () => setAllScenes(true),
						children: "All 3"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `h-9 flex-1 rounded-full px-2 text-lg ${allScenes ? "text-ink" : "ios-seg-on"}`,
						onClick: () => setAllScenes(false),
						children: "This scene"
					})]
				}) : null, needsBox ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-xl font-medium",
					children: [subject ? `How do you want ${subject} to be refined?` : "How do you want this to be refined?", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: direction,
						onChange: (event) => setDirection(event.target.value.slice(0, 400)),
						rows: 2,
						placeholder: step === "brief" && field?.key === "name" ? "Two or three words." : "Shorter. More like a meeting.",
						className: "mt-1 w-full resize-none border border-line bg-sheet px-3 py-2 text-xl font-normal leading-snug"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: busy || step === "prototype" && (direction.trim().length < 3 || !useSession.getState().prototypeHtml),
					onClick: () => void suggest(),
					className: "h-12 btn-glow text-xl font-medium disabled:opacity-40",
					children: busy ? `Thinking · ${seconds}s` : "Try a version"
				})] })] }) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xl text-rule",
					children: error
				}) : null,
				draft ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-line bg-soft p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-base font-medium text-muted",
							children: "A suggestion. It stays here until you accept it."
						}),
						draft.kind === "pain" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xl",
							children: draft.text
						}) : null,
						draft.kind === "field" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xl",
							children: draft.text
						}) : null,
						draft.kind === "scene" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium",
								children: [
									"Scene ",
									draft.index + 1,
									". "
								]
							}), draft.text]
						}) : null,
						draft.kind === "scenes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-2 grid gap-2 text-xl",
							children: draft.texts.map((text, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium",
								children: [index + 1, ". "]
							}), text] }, index))
						}) : null,
						draft.kind === "prototype" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xl",
							children: "Here's a new version of the prototype. Accept it if the group likes it."
						}) : null,
						draft.kind === "brief" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
							className: "mt-2 grid gap-2 text-xl",
							children: BRIEF_FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-base text-muted",
								children: field.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: draft.brief[field.key] || "—" })] }, field.key))
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex h-12 items-center justify-center gap-1 btn-glow px-2 text-xl",
								onClick: accept,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
									className: "size-5 shrink-0",
									"aria-hidden": true
								}), " Accept"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex h-12 items-center justify-center gap-1 border border-line bg-sheet px-2 text-xl",
								onClick: () => setDraft(null),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									className: "size-5 shrink-0",
									"aria-hidden": true
								}), " Dismiss"]
							})]
						})
					]
				}) : null
			]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Studio, {});
}
//#endregion
export { Home as component };
