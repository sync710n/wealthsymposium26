//#region desktop-local/shims/server-fn.ts
function createServerFn() {
	const api = {
		validator(_parse) {
			return api;
		},
		handler(fn) {
			return (input) => fn({ data: input?.data ?? {} });
		}
	};
	return api;
}
//#endregion
//#region src/lib/content.ts
var BRIEF_FIELDS = [
	{
		key: "name",
		label: "Name your agent",
		hint: "A short name the group will remember",
		refineAs: "the agent name"
	},
	{
		key: "agentDoes",
		label: "What exactly is the agent doing as your assistant?",
		hint: "The job your assistant does, in one or two sentences",
		refineAs: "what the agent does as your assistant"
	},
	{
		key: "rmSees",
		label: "As the RM, what do you expect to see and receive from your assistant?",
		hint: "What you expect it to hand you",
		refineAs: "what you expect to see and receive from your assistant"
	},
	{
		key: "benefits",
		label: "Key benefits for you or your clients",
		hint: "Why this is worth it",
		refineAs: "the benefits"
	}
];
//#endregion
//#region src/lib/prompts.ts
var join = (lines) => lines.filter(Boolean).join("\n");
function ideaBrief(brief) {
	return join([
		`Agent name: ${brief.name || "(empty)"}`,
		`What the agent does: ${brief.agentDoes || "(empty)"}`,
		`What the RM expects to see and receive: ${brief.rmSees || "(empty)"}`,
		`Benefits: ${brief.benefits || "(empty)"}`
	]);
}
var prompts = {
	coach: {
		system: [
			"You help a group of wealth relationship managers in a live 30-minute workshop.",
			"Write in plain English. Be concrete and short. Use fictional clients only — never real names, account numbers, or HKID.",
			"Do not mention that you are a model. Return JSON only, no markdown.",
			"Stay on their chosen painpoint. Do not invent a different problem."
		].join(" "),
		jsonRetry: "That was not valid JSON. Return the JSON object only.",
		pain(current, direction) {
			return join([
				"Question: Write the scenario that hurts.",
				`Already in the box: ${current || "(empty)"}`,
				`Enrich direction: ${direction || "(none)"}`,
				"Rewrite the scenario using the enrich direction. One or two short sentences, about 25 words, the same length as a card on the wall. First person, as the relationship manager. No story, no dialogue, and no time of day. Do not copy these labels. Do not return the box unchanged.",
				"JSON: {\"pain\":\"...\"}"
			]);
		},
		brief(shared) {
			return join([
				"Draft the idea brief for this scenario. Write it the way a relationship manager would say it to a colleague: plain, concrete, and calm.",
				"No slogans. Do not say you. Do not invent a boss, a product push, or a new problem.",
				"name: 2 to 4 words. A helper they would want beside them. Positive. Not the name of the problem. No period.",
				"agentDoes: two sentences, about 40 words. Third person. The assistant you want, doing the job that fixes this scenario. It does not cause the problem. Do not start with I.",
				"rmSees: two sentences, about 40 words. First person, as the RM. I see or I get the thing the assistant hands over.",
				"benefits: two sentences, about 40 words. First person. One practical gain for the RM and one for the client.",
				"JSON keys: name, agentDoes, rmSees, benefits.",
				JSON.stringify(shared)
			]);
		},
		agentName(current, direction, scenario) {
			return join([
				"Question: Name your agent",
				`Scenario: ${scenario || "(not chosen)"}`,
				`Already in the box: ${current || "(empty)"}`,
				`Enrich direction: ${direction || "(none)"}`,
				"The name must be about this scenario. Make it positive: a helper the RM would want beside them. Never name the problem, and never use words like thief, killer, burden, pain, or chaos. 2 to 4 words. No period. Do not copy these labels.",
				"JSON: {\"text\":\"...\"}"
			]);
		},
		field(question, current, direction, scenario, voice = "") {
			return join([
				`Question: ${question}`,
				`Scenario: ${scenario || "(not chosen)"}`,
				`Already in the box: ${current || "(empty)"}`,
				`Enrich direction: ${direction || "(none)"}`,
				voice,
				"Write it the way a relationship manager would say it to a colleague. Plain and concrete. No slogans, and do not say you. Two sentences, about 40 words, unless the enrich direction asks for a different length. Do not answer in one short clause. Follow the enrich direction. Do not copy these labels. Do not switch to a different problem.",
				"JSON: {\"text\":\"...\"}"
			]);
		},
		scenes(currents, direction, scenario, brief) {
			return join([
				`Enrich direction, obey this first: ${direction || "(none — draft the three steps)"}`,
				"If the direction says shorten, cut, or brief: each scene is one sentence, under 18 words. Do not keep the old length.",
				"Otherwise each scene is two sentences, about 45 words. Name what is on the screen, what the assistant does or says, and what the RM does next. Do not stop after one short clause.",
				"Three steps in order. Scene 2 follows scene 1. Scene 3 follows scene 2. Different actions.",
				"Voice: the assistant does the work, and the RM receives something. Do not say you. Do not invent a boss or a product push.",
				`Scenario: ${scenario || "(not chosen)"}`,
				"Idea brief:",
				ideaBrief(brief),
				`Scene 1 now: ${currents[0] || "(empty)"}`,
				`Scene 2 now: ${currents[1] || "(empty)"}`,
				`Scene 3 now: ${currents[2] || "(empty)"}`,
				"JSON: {\"scenes\":[\"...\",\"...\",\"...\"]}"
			]);
		},
		scene(index, current, direction, scenario, brief) {
			return join([
				`Enrich direction, obey this first: ${direction || "(none — draft this step)"}`,
				"If the direction says shorten, cut, or brief: one sentence, under 18 words.",
				"Otherwise two sentences, about 45 words. Say what is on this screen, what the assistant does or says, and what the RM does next. Do not stop after one short clause.",
				`Scenario: ${scenario || "(not chosen)"}`,
				"Idea brief:",
				ideaBrief(brief),
				`Screen ${index + 1} now: ${current || "(empty)"}`,
				"JSON: {\"paragraph\":\"...\"}"
			]);
		}
	},
	sceneImage: {
		bitmap: [
			"A crisp 16:9 desktop screenshot of a futuristic wealth relationship-manager workbench. Not an illustration, not a painting, not a photo of a person or a desk, not a device mockup.",
			"No bezel, no browser chrome, no hands, no perspective, no watermark, no caption, and do not write a screen number.",
			"Light visual style: a white or pale page, soft gradient accents, light cards, and dark text. Not a dark theme and not a flat gray admin screen.",
			"If an agent name is given, that is the only product name on the screen. Do not invent a brand, a company, or a title of your own.",
			"Show a different moment each step: what the agent is doing, and what the RM is looking at. Do not repeat the same screen.",
			"Sharp sans-serif type, aligned controls, real buttons, and short readable English labels. Fictional sample data only."
		].join(" "),
		build(index, paragraph, context, others) {
			return [
				prompts.sceneImage.bitmap,
				`This is step ${index + 1} of 3 in one linear story. Draw only this step's screen.`,
				context ? `Product: ${context}` : "",
				others ? `The other steps, which must look different: ${others}` : "",
				`Show what the agent does here, and what the RM sees: ${paragraph}`
			].filter(Boolean).join(" ");
		}
	},
	prototype: {
		system: "You output one HTML section and nothing else. No markdown.",
		emptyRetry: "That section was empty. Put the whole screen inside the section and do not close it early.",
		repeatRetry: "Keep the same header and the same right-hand agent panel. Change the work area so it matches this screen, not the previous table.",
		styleFallback: "Match the attached picture. Do not invent a simpler screen.",
		styleWithColors(colors) {
			return `Use these colors only${colors.length ? ` (${colors.join(", ")})` : ""}. Do not copy the previous step's cards or layout.`;
		},
		instruction(input) {
			return join([
				`Build ONLY step ${input.step}. Return one element: <section data-step="${input.step}">...</section>`,
				"The attached picture for THIS step is the work area. Copy its regions and enrich them: every card, list, number, and name in the picture belongs on the screen.",
				"If the picture has a chart, draw that chart in inline SVG with the same labels and figures. A donut, bars, or a line. Do not skip a chart, and do not replace it with a sentence.",
				"The section fills the frame: width 100%, height 100%, no max-width, no auto margin, and no centered card floating in empty space. In a wide frame the columns grow. The work area and the agent panel both stretch to the full height.",
				"One row: the work area, then a chat about 16rem wide. Inside the work area, at most two columns. Put any further cards on a second row. Width 100%. No overlap. No position:absolute.",
				"Font sizes are rem only: body 0.85rem, labels 0.75rem, titles 1rem.",
				"Copy the gradient from the attached picture onto the page background and the main panels. Keep that gradient visible. Do not flatten it to a plain white or plain gray page. Text stays dark enough to read.",
				"Inline CSS only. No external scripts or fonts. A click can do something small.",
				"When the picture shows a person, do not use an empty box or an external image. Use an inline SVG avatar with their initials, for example <svg viewBox=\"0 0 64 64\" width=\"64\" height=\"64\"><rect width=\"64\" height=\"64\" rx=\"12\" fill=\"#6d4aff\"/><text x=\"32\" y=\"40\" text-anchor=\"middle\" font-size=\"22\" font-family=\"sans-serif\" fill=\"#fff\">EV</text></svg>.",
				"Every part of the screen goes inside the section. Do not close the section before the screen is finished.",
				input.step === 1 ? "This is step 1. The header and the right-hand agent panel you build here are the shell. Later steps must copy them." : join([
					"This is a later step. Copy the shell. Change only the work area.",
					"Header: same product name, same height, same alignment, same small status. Do not add a new title bar.",
					"Agent panel: copy the markup below. Same colors, border, radius, title, avatar, and reply box. Change only the words inside the two messages.",
					input.agent ? `Agent panel to copy:\n${input.agent}` : "",
					"Work area: follow the attached picture. Different cards, list, or chart. Do not repeat the earlier layout. Keep the same people and the same holdings, each with their own figure.",
					input.prior ? `Header to copy:\n${input.prior}` : ""
				]),
				input.style,
				"",
				`Painpoint scenario: ${input.pain}`,
				`Agent name: ${input.brief.name || "Do not invent a brand. Call it the agent."}`,
				`What the agent does: ${input.brief.agentDoes}`,
				`What the RM expects to see and receive: ${input.brief.rmSees}`,
				`This step's screen: ${input.scene}`,
				"One scenario, one story. Invent a small cast that fits this scenario: one client the RM is with, plus other clients only if a list or ranking needs them. Every person has a different full name. Every row has a different figure. Never print the same name twice in one list, and never give two clients the same percentage, amount, or count. Across the three screens, reuse that cast and those figures. Do not rename anyone, and do not add a new client on a later screen. Move the story forward: what the agent does next, and what the RM then sees.",
				`The other beats. Do not redraw the same screen, but keep the same facts:\n${input.others}`,
				input.already ? `Facts already on the other screens. Copy these names and numbers. Do not replace them:\n${input.already}` : ""
			]);
		}
	},
	refine: {
		system: "You output one HTML section and nothing else.",
		instruction(input) {
			return [
				`Revise ONLY <section data-step="${input.step}">. Return that one section and nothing else.`,
				"The attached picture is this step's original screen. Keep what the agent does and what the RM sees in that picture.",
				"Keep visual continuity with the other steps: same navigation, gradient colors, type, spacing, and the right-hand agent chat. Do not invent a new shell.",
				"Nothing may overlap. Work area plus chat, and at most two columns inside the work area. Extra cards go on the next row. Readable at 900px wide, not only full screen. No position:absolute or position:fixed.",
				"The right-hand agent panel stays the same card: same colors, border, radius, title, and reply box. Change only the message text. Do not restyle it.",
				"Keep the client names and fund names already in this section. Each person keeps their own figure. Do not duplicate a name in a list, and do not give two rows the same number.",
				"The screen fills the frame, width 100% and height 100%. No max-width and no centered card.",
				"No position:fixed. No external images. Fictional sample data only. A person is an inline SVG avatar with their initials.",
				"",
				`Edit: ${input.direction}`,
				`Painpoint scenario: ${input.pain}`,
				`Agent name: ${input.brief.name || "Do not invent a brand. Call it the agent."}`,
				`This screen: ${input.scene}`,
				"",
				"Current section:",
				input.current
			].join("\n");
		}
	}
};
//#endregion
//#region src/lib/ai.functions.ts
var PROTOTYPE_MODELS = ["grok-4.5", "grok-4.7"];
var HTML_MODELS = ["grok-4.7", "grok-4.5"];
var COACH_MODELS = [
	"grok-4-1-fast-non-reasoning",
	"grok-code-fast-1",
	"grok-4.5"
];
var shared = globalThis;
var serverNotes = shared.__cyaServerNotes ??= [];
function debugNote(name, detail, extra) {
	let text = "";
	try {
		text = typeof detail === "string" ? detail : JSON.stringify(detail);
	} catch {
		text = String(detail);
	}
	serverNotes.push({
		at: (/* @__PURE__ */ new Date()).toISOString(),
		name,
		detail: text.slice(0, 12e3),
		...extra
	});
	if (serverNotes.length > 60) serverNotes.shift();
}
function modelList(preferred, fallback) {
	const name = (preferred ?? "").trim();
	if (!name) return fallback;
	return [name, ...fallback.filter((item) => item !== name)];
}
function summarizeMessages(messages) {
	return messages.map((message) => {
		if (!message || typeof message !== "object") return message;
		const role = "role" in message ? String(message.role ?? "") : "";
		const content = "content" in message ? message.content : "";
		if (typeof content === "string") return {
			role,
			length: content.length,
			text: content.slice(0, 1800)
		};
		if (!Array.isArray(content)) return { role };
		return {
			role,
			parts: content.map((part) => {
				if (!part || typeof part !== "object") return "part";
				if ("text" in part) {
					const text = String(part.text ?? "");
					return {
						length: text.length,
						text: text.slice(0, 1200)
					};
				}
				if ("image_url" in part) return { image: true };
				return "part";
			})
		};
	});
}
var readDebugLog = createServerFn({ method: "POST" }).handler(async () => serverNotes.slice());
var clearServerDebugLog = createServerFn({ method: "POST" }).handler(async () => {
	serverNotes.length = 0;
	return { ok: true };
});
function modelFields(model) {
	return model === "grok-4.7" ? { reasoning_effort: "low" } : {};
}
function keyOrError() {
	const xai = process.env.XAI_API_KEY?.trim();
	if (xai) return xai;
	const open = process.env.OPENROUTER_API_KEY?.trim() || shared.__cyaOpenRouterKey || "";
	if (open) return open;
	return {
		ok: false,
		error: "AI is not available in this environment. Ask a facilitator."
	};
}
function routeModel(apiKey, model) {
	const xai = process.env.XAI_API_KEY?.trim();
	if (xai && apiKey === xai) return {
		url: "https://api.x.ai/v1/chat/completions",
		model,
		extra: modelFields(model)
	};
	return {
		url: "https://openrouter.ai/api/v1/chat/completions",
		model: model.includes("/") ? model : {
			"grok-4.7": "x-ai/grok-4.7",
			"grok-4.5": "x-ai/grok-4.5",
			"grok-4-1-fast-non-reasoning": "x-ai/grok-4.5",
			"grok-code-fast-1": "x-ai/grok-4.5"
		}[model] ?? "x-ai/grok-4.5",
		extra: {}
	};
}
async function readError(res) {
	const text = await res.text().catch(() => "");
	if (res.status === 429) return "AI is busy. Wait a few seconds and try again.";
	if (res.status >= 500) return "AI had a server error. Try once more.";
	return text.slice(0, 180) || `AI error ${res.status}`;
}
async function postJson(url, apiKey, body) {
	const run = () => fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(18e4)
	});
	try {
		let res = await run();
		if (res.status === 429 || res.status >= 500) {
			await new Promise((resolve) => setTimeout(resolve, 700));
			res = await run();
		}
		return res;
	} catch (error) {
		const reason = error instanceof Error ? error.message : "network";
		await new Promise((resolve) => setTimeout(resolve, 700));
		try {
			return await run();
		} catch (again) {
			const second = again instanceof Error ? again.message : reason;
			throw new Error(/timeout|aborted|abort/i.test(second) ? `timeout: ${second}` : second);
		}
	}
}
function parseJsonObject(text) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const raw = fenced ? fenced[1] : trimmed;
	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("The coach did not return a draft.");
	const value = JSON.parse(raw.slice(start, end + 1));
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The coach did not return a draft.");
	return value;
}
function asText(value, max) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function readable(value, max) {
	const text = asText(value, max).replace(/^(?:agentDoes|rmSees|benefits|name|text)\s*:\s*/i, "").trim();
	if (!text || text.startsWith("{") || text.startsWith("[") || text.includes("\"painpoint\"") || text.includes("\"brief\"")) return "";
	return text;
}
function asAgentName(value) {
	let text = asText(value, 200).replace(/^(?:call it|it's called|it is called|the name is|name)\b:?\s+/i, "");
	text = (text.split(/[.!?]/)[0] ?? text).replace(/[^\w\s'-]/g, " ");
	return text.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ").slice(0, 40);
}
function field(source, names) {
	for (const name of names) {
		const value = asText(source[name], 800);
		if (value) return value;
	}
	return "";
}
async function chat(apiKey, messages, maxTokens, temperature, models = PROTOTYPE_MODELS) {
	let last = "AI request failed";
	for (let i = 0; i < models.length; i++) {
		const started = Date.now();
		debugNote("chat", {
			model: models[i],
			maxTokens,
			temperature,
			messages: summarizeMessages(messages)
		});
		const route = routeModel(apiKey, models[i]);
		const res = await postJson(route.url, apiKey, {
			model: route.model,
			...route.extra,
			temperature,
			max_tokens: maxTokens,
			messages
		});
		if (res.ok) {
			const text = (await res.json()).choices?.[0]?.message?.content ?? "";
			debugNote("chat", {
				model: models[i],
				status: res.status,
				text: text.slice(0, 4e3)
			}, {
				ms: Date.now() - started,
				ok: Boolean(text.trim())
			});
			if (!text.trim()) return {
				ok: false,
				error: "AI returned an empty answer."
			};
			return {
				ok: true,
				text
			};
		}
		last = await readError(res);
		debugNote("chat", {
			model: models[i],
			status: res.status,
			error: last
		}, {
			ms: Date.now() - started,
			ok: false
		});
		if (!((res.status === 400 || res.status === 404) && i < models.length - 1)) break;
	}
	return {
		ok: false,
		error: last
	};
}
var DEEPSEEK_MODEL = "~deepseek/deepseek-flash-latest";
var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var openRouterKeyProblem = "";
async function openRouterKey(pasted) {
	const fromClient = pasted?.trim();
	if (fromClient) {
		shared.__cyaOpenRouterKey = fromClient;
		return fromClient;
	}
	if (shared.__cyaOpenRouterKey) return shared.__cyaOpenRouterKey;
	const env = process.env;
	const fromEnv = env["OPENROUTER_API_KEY"]?.trim();
	if (fromEnv) {
		shared.__cyaOpenRouterKey = fromEnv;
		return fromEnv;
	}
	const paths = ["/workspace/.grok/openrouter-inference-key", "/workspace/.grok/openrouter-key"];
	const errors = [];
	const readers = [];
	if (typeof process.getBuiltinModule === "function") try {
		const fs = process.getBuiltinModule("fs");
		readers.push((path) => fs.readFileSync(path, "utf8"));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : "builtin fs failed");
	}
	else errors.push("no builtin fs");
	try {
		const fs = await new Function("return import('node:fs')")();
		readers.push((path) => fs.readFileSync(path, "utf8"));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : "node:fs import failed");
	}
	for (const read of readers) for (const path of paths) try {
		const text = read(path).trim();
		if (!text) {
			errors.push(`${path} empty`);
			continue;
		}
		shared.__cyaOpenRouterKey = text;
		try {
			env["OPENROUTER_API_KEY"] = text;
		} catch {}
		return text;
	} catch (error) {
		errors.push(`${path}: ${error instanceof Error ? error.message : "unreadable"}`);
	}
	openRouterKeyProblem = errors.join(" | ") || "OpenRouter key missing";
	debugNote("deepseek", { error: openRouterKeyProblem });
	return "";
}
function textOnly(messages) {
	return messages.map((message) => {
		if (!message || typeof message !== "object" || !("content" in message)) return message;
		const content = message.content;
		if (!Array.isArray(content)) return message;
		const text = content.map((part) => part && typeof part === "object" && "text" in part ? String(part.text ?? "") : "").filter(Boolean).join("\n");
		return {
			...message,
			content: text
		};
	});
}
async function readStream(res, onDelta) {
	if (!res.body) return "";
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buf = "";
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });
		const lines = buf.split("\n");
		buf = lines.pop() ?? "";
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("data:")) continue;
			const data = trimmed.slice(5).trim();
			if (!data || data === "[DONE]") continue;
			try {
				const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
				if (!delta) continue;
				text += delta;
				onDelta(delta);
			} catch {}
		}
	}
	return text;
}
async function streamChat(apiKey, messages, maxTokens, temperature, onDelta, models = PROTOTYPE_MODELS) {
	let last = "AI request failed";
	for (let i = 0; i < models.length; i++) {
		const started = Date.now();
		debugNote("stream", {
			model: models[i],
			maxTokens,
			temperature,
			messages: summarizeMessages(messages)
		});
		const route = routeModel(apiKey, models[i]);
		const res = await postJson(route.url, apiKey, {
			model: route.model,
			...route.extra,
			temperature,
			max_tokens: maxTokens,
			stream: true,
			messages
		});
		if (!res.ok || !res.body) {
			last = res.ok ? "AI returned an empty answer." : await readError(res);
			debugNote("stream", {
				model: models[i],
				status: res.status,
				error: last
			}, {
				ms: Date.now() - started,
				ok: false
			});
			if (!((res.status === 400 || res.status === 404) && i < models.length - 1)) break;
			continue;
		}
		const text = await readStream(res, onDelta);
		debugNote("stream", {
			model: models[i],
			status: res.status,
			length: text.length,
			text: text.slice(0, 2e3)
		}, {
			ms: Date.now() - started,
			ok: Boolean(text.trim())
		});
		if (text.trim()) return {
			ok: true,
			text
		};
		last = "AI returned an empty answer.";
		break;
	}
	return {
		ok: false,
		error: last
	};
}
async function streamHtml(engine, messages, maxTokens, temperature, onDelta, htmlModel, openRouter) {
	if (engine === "deepseek") {
		const key = await openRouterKey(openRouter);
		if (!key) {
			debugNote("deepseek", {
				fallback: "grok",
				reason: openRouterKeyProblem || "OpenRouter key missing"
			});
			const keyed = keyOrError();
			if (typeof keyed !== "string") return keyed;
			return streamChat(keyed, messages, maxTokens, temperature, onDelta, modelList(htmlModel, HTML_MODELS));
		}
		const ask = (body) => postJson(OPENROUTER_URL, key, {
			model: DEEPSEEK_MODEL,
			temperature,
			max_tokens: maxTokens,
			stream: true,
			reasoning: { effort: "none" },
			messages: body
		});
		const started = Date.now();
		debugNote("deepseek", {
			model: DEEPSEEK_MODEL,
			messages: summarizeMessages(messages)
		});
		let res = await ask(messages);
		if (!res.ok) res = await ask(textOnly(messages));
		if (!res.ok || !res.body) {
			const error = res.ok ? "DeepSeek returned nothing." : await readError(res);
			debugNote("deepseek", {
				status: res.status,
				error
			}, {
				ms: Date.now() - started,
				ok: false
			});
			return {
				ok: false,
				error
			};
		}
		const text = await readStream(res, onDelta);
		debugNote("deepseek", {
			status: res.status,
			length: text.length,
			text: text.slice(0, 1500)
		}, {
			ms: Date.now() - started,
			ok: Boolean(text.trim())
		});
		if (!text.trim()) return {
			ok: false,
			error: "DeepSeek returned an empty answer."
		};
		return {
			ok: true,
			text
		};
	}
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	return streamChat(keyed, messages, maxTokens, temperature, onDelta, modelList(htmlModel, HTML_MODELS));
}
async function chatHtml(engine, messages, maxTokens, temperature, htmlModel, openRouter) {
	if (engine === "deepseek") {
		const key = await openRouterKey(openRouter);
		if (!key) {
			debugNote("deepseek", {
				fallback: "grok",
				reason: openRouterKeyProblem || "OpenRouter key missing"
			});
			const keyed = keyOrError();
			if (typeof keyed !== "string") return keyed;
			return chat(keyed, messages, maxTokens, temperature, modelList(htmlModel, HTML_MODELS));
		}
		const ask = (body) => postJson(OPENROUTER_URL, key, {
			model: DEEPSEEK_MODEL,
			temperature,
			max_tokens: maxTokens,
			reasoning: { effort: "none" },
			messages: body
		});
		let res = await ask(messages);
		if (!res.ok) res = await ask(textOnly(messages));
		if (!res.ok) return {
			ok: false,
			error: await readError(res)
		};
		const text = (await res.json()).choices?.[0]?.message?.content ?? "";
		if (!text.trim()) return {
			ok: false,
			error: "DeepSeek returned an empty answer."
		};
		return {
			ok: true,
			text
		};
	}
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	return chat(keyed, messages, maxTokens, temperature, modelList(htmlModel, HTML_MODELS));
}
var coachDraft = createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const keyed = data.model === "deepseek" ? "" : keyOrError();
	if (typeof keyed !== "string") return keyed;
	const direction = (data.direction ?? "").slice(0, 400);
	const pain = (data.pain ?? "").slice(0, 500);
	const scenes = (data.scenes ?? []).slice(0, 3).map((scene) => scene.slice(0, 1e3));
	const system = prompts.coach.system;
	const shared = {
		painpoint: pain || "(not chosen yet)",
		direction: direction || "(none)",
		brief: data.brief,
		scenes
	};
	let user = "";
	if (data.target === "pain") user = prompts.coach.pain(pain, direction);
	else if (data.target === "brief") user = prompts.coach.brief(shared);
	else if (data.target === "field") {
		const key = data.field ?? "agentDoes";
		const question = BRIEF_FIELDS.find((item) => item.key === key)?.label ?? key;
		const current = key === "name" ? data.brief.name : data.brief[key] ?? "";
		const written = current.trim().split(/\s+/).filter(Boolean).length;
		if (written < 10) return {
			ok: false,
			error: "Write at least 10 words in this box before I refine it."
		};
		const voice = key === "rmSees" || key === "benefits" ? "Voice: first person, as the relationship manager. Use I and my. Do not start with The agent." : key === "agentDoes" ? "Voice: third person. The assistant you want does the job that fixes the scenario. It does not cause the problem. Do not use I or you." : "";
		user = key === "name" ? prompts.coach.agentName(current, direction, pain) : prompts.coach.field(question, current, direction, pain, voice);
	} else if (data.target === "scenes") user = prompts.coach.scenes(scenes, direction, pain, data.brief);
	else {
		const index = data.sceneIndex ?? 0;
		user = prompts.coach.scene(index, scenes[index] ?? "", direction, pain, data.brief);
	}
	const messages = [{
		role: "system",
		content: system
	}, {
		role: "user",
		content: user
	}];
	const coachModels = modelList(data.model, COACH_MODELS);
	const askCoach = (msgs, max, temperature, models = coachModels) => data.model === "deepseek" ? chatHtml("deepseek", msgs, max, temperature, void 0, data.openRouterKey) : chat(keyed, msgs, max, temperature, models);
	let result = await askCoach(messages, 700, .4);
	if (!result.ok) return result;
	let parsed;
	try {
		parsed = parseJsonObject(result.text);
	} catch {
		const again = await askCoach([
			...messages,
			{
				role: "assistant",
				content: result.text.slice(0, 1500)
			},
			{
				role: "user",
				content: prompts.coach.jsonRetry
			}
		], 700, .2);
		if (!again.ok) return {
			ok: false,
			error: "The coach draft could not be read. Try again."
		};
		try {
			parsed = parseJsonObject(again.text);
		} catch {
			return {
				ok: false,
				error: "The coach draft could not be read. Try again."
			};
		}
	}
	if (data.target === "pain") {
		const next = readable(parsed.pain ?? parsed.text, 220);
		if (!next) return {
			ok: false,
			error: "The coach returned an empty painpoint."
		};
		return {
			ok: true,
			pain: next
		};
	}
	if (data.target === "scene") {
		const paragraph = readable(parsed.paragraph ?? parsed.scene ?? parsed.text, 500);
		if (!paragraph) return {
			ok: false,
			error: "The coach returned an empty scene."
		};
		return {
			ok: true,
			paragraph
		};
	}
	if (data.target === "field") {
		const pick = () => data.field === "name" ? asAgentName(readable(parsed.text ?? parsed.value ?? parsed.name, 80)) : readable(parsed.text ?? parsed.value ?? parsed.paragraph, 400);
		let text = pick();
		if (!text) {
			const again = await askCoach([...messages, {
				role: "user",
				content: "That copied the notes. Return only {\"text\":\"the sentence\"}."
			}], 400, .2);
			if (again.ok) try {
				parsed = parseJsonObject(again.text);
				text = pick();
			} catch {
				text = "";
			}
		}
		if (!text) return {
			ok: false,
			error: "The assistant came back empty. Try once more."
		};
		if (data.field === "name" && /\b(thief|killer|burden|pain|chaos|nightmare|enemy)\b/i.test(text)) {
			const again = await askCoach([...messages, {
				role: "user",
				content: "That name is negative. Return a positive helper name only, JSON: {\"text\":\"...\"}"
			}], 80, .2);
			if (again.ok) try {
				parsed = parseJsonObject(again.text);
				const renamed = pick();
				if (renamed && !/\b(thief|killer|burden|pain|chaos|nightmare|enemy)\b/i.test(renamed)) text = renamed;
			} catch {}
		}
		return {
			ok: true,
			text
		};
	}
	if (data.target === "scenes") {
		const raw = Array.isArray(parsed.scenes) ? parsed.scenes : Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
		const paragraphs = [
			0,
			1,
			2
		].map((index) => readable(raw[index], 500));
		if (paragraphs.some((item) => !item)) return {
			ok: false,
			error: "The coach left a scene empty. Try again."
		};
		return {
			ok: true,
			paragraphs
		};
	}
	const source = parsed.brief && typeof parsed.brief === "object" && !Array.isArray(parsed.brief) ? parsed.brief : parsed;
	const brief = {
		name: asAgentName(readable(field(source, [
			"name",
			"agentName",
			"title"
		]), 80)),
		agentDoes: readable(field(source, [
			"agentDoes",
			"agent",
			"whatTheAgentShouldDo",
			"does"
		]), 400),
		rmSees: readable(field(source, [
			"rmSees",
			"sees",
			"whatTheRmSees",
			"output"
		]), 400),
		benefits: readable(field(source, [
			"benefits",
			"benefit",
			"conversation",
			"value"
		]), 400)
	};
	if ([
		"name",
		"agentDoes",
		"rmSees",
		"benefits"
	].filter((key) => !brief[key]).length > 0) return {
		ok: false,
		error: "The coach left part of the brief empty. Try again."
	};
	return {
		ok: true,
		brief
	};
});
var generateSceneImage = createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	const paragraph = (data.paragraph ?? "").trim().slice(0, 1e3);
	if (paragraph.length < 8) return {
		ok: false,
		error: "Write the scene paragraph first."
	};
	const context = (data.context ?? "").trim().slice(0, 400);
	const others = (data.others ?? "").trim().slice(0, 700);
	const prompt = prompts.sceneImage.build(data.index ?? 0, paragraph, context, others);
	const attempts = [{
		model: (data.model ?? "").trim() || "grok-imagine-image-quality",
		resolution: "1k"
	}, {
		model: "grok-imagine-image",
		resolution: "1k"
	}];
	let last = "Image generation failed.";
	for (const attempt of attempts) {
		const started = Date.now();
		debugNote("image", {
			model: attempt.model,
			prompt: prompt.slice(0, 2e3)
		});
		const res = await postJson("https://api.x.ai/v1/images/generations", keyed, {
			model: attempt.model,
			prompt,
			n: 1,
			resolution: attempt.resolution,
			response_format: "b64_json"
		});
		if (res.ok) {
			const first = (await res.json()).data?.[0];
			if (first?.b64_json) {
				debugNote("image", {
					model: attempt.model,
					status: res.status,
					bytes: first.b64_json.length
				}, {
					ms: Date.now() - started,
					ok: true
				});
				return {
					ok: true,
					dataUrl: `data:image/png;base64,${first.b64_json}`
				};
			}
			if (first?.url) {
				const fetched = await fetch(first.url);
				if (!fetched.ok) return {
					ok: false,
					error: "The image link could not be saved. Try again."
				};
				const bytes = new Uint8Array(await fetched.arrayBuffer());
				let binary = "";
				const chunk = 32768;
				for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
				return {
					ok: true,
					dataUrl: `data:${fetched.headers.get("content-type") || "image/png"};base64,${btoa(binary)}`
				};
			}
			return {
				ok: false,
				error: "Image generation returned nothing. Try again."
			};
		}
		last = await readError(res);
		debugNote("image", {
			model: attempt.model,
			status: res.status,
			error: last
		}, {
			ms: Date.now() - started,
			ok: false
		});
		if (!(res.status === 400 || res.status === 404)) break;
	}
	return {
		ok: false,
		error: last
	};
});
function engineOf(value) {
	return value === "deepseek" ? "deepseek" : "grok";
}
function prototypeRequest(data) {
	const step = data.step === 2 || data.step === 3 ? data.step : 1;
	const scene = data.scenes[step - 1] ?? "";
	const previous = data.previousHtml ?? "";
	const others = [
		0,
		1,
		2
	].filter((index) => index !== step - 1).map((index) => `Step ${index + 1}: ${data.scenes[index] ?? ""}`).join("\n");
	const already = [
		1,
		2,
		3
	].filter((item) => item !== step).map((item) => {
		const text = plainText(findSection(previous, item)).slice(0, 700);
		return text ? `Step ${item} already shows: ${text}` : "";
	}).filter(Boolean).join("\n");
	const prior = step > 1 ? shellOf(previous) : "";
	const instruction = prompts.prototype.instruction({
		step,
		style: styleHint(previous),
		pain: data.pain,
		brief: data.brief,
		scene,
		others,
		already,
		prior,
		agent: step > 1 ? agentOf(previous) : ""
	});
	const shot = (data.image || data.images?.[step - 1] || "").trim();
	const shots = shot.startsWith("data:image/") ? [shot] : [];
	const messages = (extra) => [{
		role: "system",
		content: prompts.prototype.system
	}, {
		role: "user",
		content: shots.length ? [...shots.flatMap((url) => [{
			type: "text",
			text: "This picture is the work area. Include its chart if it has one, drawn as inline SVG, plus the cards, numbers, and names. Do not leave those out."
		}, {
			type: "image_url",
			image_url: {
				url,
				detail: "high"
			}
		}]), {
			type: "text",
			text: `${instruction}\n${extra}`
		}] : `${instruction}\n${extra}`
	}];
	return {
		step,
		previous,
		messages
	};
}
function assemblePrototype(text, data, step, previous, strict = true) {
	const section = cleanFragment(extractSection(text, step));
	const stripped = cleanFragment(stripOtherSteps(section, step));
	const chosen = plainText(stripped).length >= 40 ? stripped : section;
	if (plainText(chosen).length < 40) return "";
	if (strict && previous && tooSimilar(chosen, previous)) return "";
	return sanitizeHtml(previous.includes("<") ? rebuildPrototype(previous, chosen, step) : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${chosen}</body></html>`);
}
var generatePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const engine = engineOf(data.engine);
	const { step, previous, messages } = prototypeRequest(data);
	const ask = (extra) => chatHtml(engine, messages(extra), 8e3, step === 1 ? .3 : .5, data.htmlModel, data.openRouterKey);
	let result = await ask("");
	if (!result.ok) return result;
	let html = assemblePrototype(result.text, data, step, previous);
	if (!html) {
		const again = await ask(plainText(extractSection(result.text, step)).length < 40 ? prompts.prototype.emptyRetry : prompts.prototype.repeatRetry);
		if (again.ok) html = assemblePrototype(again.text, data, step, previous);
	}
	if (!html) return {
		ok: false,
		error: `Step ${step} repeated an earlier screen. Generate again.`
	};
	return {
		ok: true,
		html
	};
});
function openPrototypeStream(data) {
	const encoder = new TextEncoder();
	return new ReadableStream({ async start(controller) {
		const send = (payload) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
		try {
			const engine = engineOf(data.engine);
			const { step, previous, messages } = prototypeRequest(data);
			const temperature = step === 1 ? .3 : .5;
			let result = await streamHtml(engine, messages(""), 8e3, temperature, (delta) => send({ delta }), data.htmlModel, data.openRouterKey);
			if (!result.ok) {
				send({ error: result.error });
				return;
			}
			let html = assemblePrototype(result.text, data, step, previous);
			if (!html) {
				send({ reset: true });
				result = await streamHtml(engine, messages(plainText(extractSection(result.text, step)).length < 40 ? prompts.prototype.emptyRetry : prompts.prototype.repeatRetry), 8e3, temperature, (delta) => send({ delta }), data.htmlModel, data.openRouterKey);
				if (result.ok) html = assemblePrototype(result.text, data, step, previous);
			}
			if (!html) {
				send({ error: `Step ${step} repeated an earlier screen. Generate again.` });
				return;
			}
			send({ html });
		} catch {
			send({ error: "The prototype did not come back. Try again." });
		} finally {
			controller.close();
		}
	} });
}
function sanitizeHtml(raw) {
	let html = raw.trim();
	const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
	if (fenced) html = fenced[1].trim();
	if (!html.includes("<")) return "";
	if (!/^<!doctype html>|^<html/i.test(html)) html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
	html = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, "");
	html = html.replace(/<link\b[^>]*>/gi, "");
	html = html.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
	html = html.replace(/<iframe\b[^>]*\/?>/gi, "");
	html = html.replace(/<object\b[\s\S]*?<\/object>/gi, "");
	html = html.replace(/<embed\b[^>]*\/?>/gi, "");
	html = html.replace(/<img\b[^>]*>/gi, "");
	const csp = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';\">";
	const fit = "<style>html,body{height:100%;margin:0;overflow:auto;background:#fff;color:#161616;font-family:system-ui,sans-serif}[hidden]{display:none!important}[data-step]{box-sizing:border-box;min-height:100%}[data-step][hidden]{display:none!important}*{box-sizing:border-box}</style>";
	if (!html.includes("data-step]{box-sizing")) {
		if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (match) => `${match}${csp}${fit}`);
		else html = html.replace(/<html[^>]*>/i, (match) => `${match}<head>${csp}${fit}</head>`);
	}
	const stepper = `<script>(function(){function show(step){var nodes=document.querySelectorAll("[data-step]");var note=document.getElementById("cya-missing");var found=false;nodes.forEach(function(el){var on=el.getAttribute("data-step")===String(step);el.hidden=!on;if(on)found=true;});if(!found){if(!note){note=document.createElement("p");note.id="cya-missing";note.style.cssText="margin:0;padding:24px;font:18px/1.4 system-ui,sans-serif";document.body.appendChild(note);}note.hidden=false;note.textContent="Step "+step+" is not ready yet.";}else if(note){note.hidden=true;}}show(1);window.addEventListener("message",function(event){if(!event.data||event.data.type!=="cya-step")return;show(event.data.step);});})();<\/script>`;
	if (!html.includes("cya-step")) {
		if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${stepper}</body>`);
		else html += stepper;
	}
	return html;
}
function findSection(html, step) {
	const open = new RegExp(`<section\\b[^>]*\\bdata-step\\s*=\\s*["']${step}["'][^>]*>`, "i");
	const start = html.search(open);
	if (start < 0) return "";
	const openTag = html.slice(start).match(/^<section\b[^>]*>/i)?.[0] ?? "";
	let depth = 1;
	const rest = html.slice(start + openTag.length);
	const token = /<\/?section\b[^>]*>/gi;
	let match;
	while (match = token.exec(rest)) {
		const isClose = match[0].startsWith("</");
		if (!isClose && depth === 1 && /data-step\s*=/i.test(match[0])) return `${html.slice(start, start + openTag.length + match.index)}</section>`;
		depth += isClose ? -1 : 1;
		if (depth === 0) return html.slice(start, start + openTag.length + match.index + match[0].length);
	}
	const bodyEnd = rest.search(/<\/body>/i);
	const cut = bodyEnd >= 0 ? bodyEnd : rest.length;
	return `${html.slice(start, start + openTag.length + cut)}</section>`;
}
function extractSection(raw, step) {
	let html = raw.trim();
	const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
	if (fenced) html = fenced[1].trim();
	const exact = findSection(html, step);
	if (exact && plainText(exact).length >= 40) return exact;
	let rest = html;
	for (const other of [
		1,
		2,
		3
	]) {
		if (other === step) continue;
		let nested = findSection(rest, other);
		while (nested) {
			rest = rest.replace(nested, "");
			nested = findSection(rest, other);
		}
	}
	const inner = rest.replace(/```[\s\S]*?```/g, " ").replace(/^<!doctype html>|<html\b[^>]*>|<\/html>|<head\b[\s\S]*?<\/head>|<body\b[^>]*>|<\/body>/gi, " ").trim();
	if (plainText(inner).length >= 40) return `<section data-step="${step}">${inner}</section>`;
	if (plainText(html).length >= 40 && !/data-step\s*=/i.test(html)) return `<section data-step="${step}">${html}</section>`;
	return exact || "";
}
function lostChat(before, after) {
	if (!/chat|assistant|message/i.test(before)) return false;
	return !/chat|assistant|message/i.test(after);
}
function stripOtherSteps(section, step) {
	let out = section;
	for (const other of [
		1,
		2,
		3
	]) {
		if (other === step) continue;
		let nested = findSection(out, other);
		while (nested) {
			out = out.replace(nested, "");
			nested = findSection(out, other);
		}
	}
	return out;
}
function plainText(html) {
	return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function agentOf(html) {
	const section = extractSection(html, 1);
	const at = section.search(/placeholder="[^"]*(ask|reply|message|chat)/i);
	if (at < 0) return section.slice(-900);
	const start = section.lastIndexOf("<div", at);
	return section.slice(start < 0 ? Math.max(0, at - 600) : start, (start < 0 ? at : start) + 1400);
}
function shellOf(html) {
	const section = extractSection(html, 1);
	return (section.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] || section).slice(0, 700);
}
function tooSimilar(section, previousHtml) {
	const nextWords = new Set(plainText(section).toLowerCase().split(" ").filter((word) => word.length > 4));
	if (nextWords.size < 12) return false;
	let prior = "";
	for (const step of [
		3,
		2,
		1
	]) {
		prior = plainText(findSection(previousHtml, step));
		if (prior.length > 40) break;
	}
	const priorWords = prior.toLowerCase().split(" ").filter((word) => word.length > 4);
	if (priorWords.length < 12) return false;
	const priorSet = new Set(priorWords);
	let shared = 0;
	for (const word of nextWords) if (priorSet.has(word)) shared += 1;
	const union = nextWords.size + priorSet.size - shared;
	return union > 0 && shared / union > .72;
}
function styleHint(html) {
	if (!html) return prompts.prototype.styleFallback;
	const colors = [...new Set([...html.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((match) => match[0].toLowerCase()))].slice(0, 6);
	return prompts.prototype.styleWithColors(colors);
}
function cleanFragment(section) {
	return section.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<img\b[^>]*>/gi, "").replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "").replace(/<iframe\b[^>]*\/?>/gi, "").replace(/<link\b[^>]*>/gi, "");
}
function rebuildPrototype(previous, section, step) {
	const parts = [];
	for (let item = 1; item <= 3; item += 1) {
		if (item === step) {
			parts.push(section);
			continue;
		}
		const prior = findSection(previous, item);
		if (plainText(prior).length >= 40) parts.push(prior);
	}
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${parts.join("")}</body></html>`;
}
function upsertSection(doc, step, section) {
	let next = doc;
	for (let guard = 0; guard < 6; guard += 1) {
		const existing = findSection(next, step);
		if (!existing) break;
		next = next.replace(existing, "");
	}
	if (/<body[^>]*>/i.test(next)) return next.replace(/<body[^>]*>/i, (match) => `${match}${section}`);
	return `${next}${section}`;
}
var refinePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const current = (data.html ?? "").slice(0, 8e4);
	if (!current.includes("<")) return {
		ok: false,
		error: "Generate a prototype before asking for an edit."
	};
	const direction = (data.direction ?? "").trim().slice(0, 400);
	if (direction.length < 3) return {
		ok: false,
		error: "Say what to change."
	};
	const step = data.step === 2 || data.step === 3 ? data.step : 1;
	const before = extractSection(current, step);
	const instruction = prompts.refine.instruction({
		step,
		direction,
		pain: data.pain,
		brief: data.brief,
		scene: data.scenes[step - 1] ?? "",
		current: before || current.slice(0, 8e3)
	});
	const shots = (data.images ?? []).map((url) => (url ?? "").trim()).slice(0, 3);
	const picture = (shots[step - 1] || data.image || "").trim();
	const userContent = picture.startsWith("data:image/") ? [
		{
			type: "text",
			text: instruction
		},
		{
			type: "text",
			text: `Original screen for step ${step}. Match this picture's content. Keep the same visual style as the other steps.`
		},
		{
			type: "image_url",
			image_url: {
				url: picture,
				detail: "high"
			}
		},
		...shots.flatMap((url, index) => !url.startsWith("data:image/") || index + 1 === step ? [] : [{
			type: "text",
			text: `Step ${index + 1}, for visual continuity only. Do not copy its work area.`
		}, {
			type: "image_url",
			image_url: {
				url,
				detail: "low"
			}
		}])
	] : instruction;
	const ask = (extra) => chatHtml(engineOf(data.engine), [{
		role: "system",
		content: prompts.refine.system
	}, {
		role: "user",
		content: extra && Array.isArray(userContent) ? [...userContent, {
			type: "text",
			text: extra
		}] : extra ? `${instruction}\n${extra}` : userContent
	}], 8e3, .4, data.htmlModel, data.openRouterKey);
	let result = await ask("");
	if (!result.ok) return result;
	let section = cleanFragment(stripOtherSteps(extractSection(result.text, step), step));
	if (section && lostChat(before, section)) {
		result = await ask("You removed the agent chat. Put that pane back on the right, in the same row as the main screen, then apply the edit.");
		if (!result.ok) return result;
		section = cleanFragment(stripOtherSteps(extractSection(result.text, step), step));
	}
	if (!section) return {
		ok: false,
		error: "That edit was not usable HTML. Try again."
	};
	const html = sanitizeHtml(upsertSection(current, step, section));
	if (!html) return {
		ok: false,
		error: "That edit was not usable HTML. Try again."
	};
	return {
		ok: true,
		html
	};
});
//#endregion
export { clearServerDebugLog, coachDraft, generatePrototype, generateSceneImage, openPrototypeStream, prompts, readDebugLog, refinePrototype };
