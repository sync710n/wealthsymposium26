import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai.functions-BgXY56J8.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var CHAT_MODELS = ["grok-4.5", "grok-4.7"];
var UI_BITMAP = [
	"High-fidelity product UI bitmap. This image is the software itself, edge to edge, 16:9.",
	"A crisp desktop screenshot of a wealth relationship-manager workbench, not an illustration, not a painting, not a photo of a person or a desk, not a device mockup.",
	"No bezel, no hands, no perspective, no watermark, no logo.",
	"Shared chrome on every screen in the series: white canvas, a thin red bar across the very top, a narrow left navigation, a client header, a main workspace, and a right-hand AI chat panel.",
	"The chat panel shows the agent talking: a few short messages, the agent's reply, and a composer. It must read as an AI assistant beside the RM, not a second product.",
	"Sharp sans-serif interface, aligned cards, real buttons, tables, and short readable English labels. Flat digital lighting. Fictional sample data only."
].join(" ");
function keyOrError() {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI is not available in this environment. Ask a facilitator."
	};
	return apiKey;
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
		body: JSON.stringify(body)
	});
	try {
		let res = await run();
		if (res.status === 429 || res.status >= 500) {
			await new Promise((resolve) => setTimeout(resolve, 700));
			res = await run();
		}
		return res;
	} catch {
		await new Promise((resolve) => setTimeout(resolve, 700));
		return run();
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
async function chat(apiKey, messages, maxTokens, temperature) {
	let last = "AI request failed";
	for (let i = 0; i < CHAT_MODELS.length; i++) {
		const res = await postJson("https://api.x.ai/v1/chat/completions", apiKey, {
			model: CHAT_MODELS[i],
			temperature,
			max_tokens: maxTokens,
			messages
		});
		if (res.ok) {
			const text = (await res.json()).choices?.[0]?.message?.content ?? "";
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
		if (!((res.status === 400 || res.status === 404) && i < CHAT_MODELS.length - 1)) break;
	}
	return {
		ok: false,
		error: last
	};
}
var coachDraft_createServerFn_handler = createServerRpc({
	id: "b7eed30b32c1b603ae0c0691a34fd9ef92e4cb9f8e963fb0aa7ac68d8ca3a331",
	name: "coachDraft",
	filename: "src/lib/ai.functions.ts"
}, (opts) => coachDraft.__executeServer(opts));
var coachDraft = createServerFn({ method: "POST" }).validator((input) => input).handler(coachDraft_createServerFn_handler, async ({ data }) => {
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	const direction = (data.direction ?? "").slice(0, 400);
	const pain = (data.pain ?? "").slice(0, 500);
	const scenes = (data.scenes ?? []).slice(0, 3).map((scene) => scene.slice(0, 1e3));
	const system = [
		"You help a group of wealth relationship managers in a live 30-minute workshop.",
		"Write in plain English. Be concrete and short. Use fictional clients only — never real names, account numbers, or HKID.",
		"Do not mention that you are a model. Return JSON only, no markdown.",
		"Stay on their chosen painpoint. Do not invent a different problem."
	].join(" ");
	const shared = {
		painpoint: pain || "(not chosen yet)",
		direction: direction || "(none)",
		brief: data.brief,
		scenes
	};
	let user = "";
	if (data.target === "pain") user = `Rewrite their own painpoint as one first-person sentence an RM would say. JSON: {"pain":"..."}\n${JSON.stringify(shared)}`;
	else if (data.target === "brief") user = [
		"Draft the idea brief. The painpoint scenario is already chosen. Do not change it.",
		"Each field is one or two short sentences.",
		"JSON keys: name, agentDoes, rmSees, benefits.",
		JSON.stringify(shared)
	].join("\n");
	else if (data.target === "field") user = data.field === "name" ? [
		"Rewrite only the agent name.",
		"Return a short name of 2 to 4 words. Not a sentence. No period. No explanation.",
		"JSON: {\"text\":\"Fee Finder\"}",
		JSON.stringify(shared)
	].join("\n") : [
		`Rewrite only this idea-brief field: ${data.field}.`,
		"One or two short sentences. Keep the chosen painpoint.",
		"JSON: {\"text\":\"...\"}",
		JSON.stringify(shared)
	].join("\n");
	else if (data.target === "scenes") user = [
		"Draft all 3 cut scenes at once.",
		"Each one describes what that SCREEN looks like, in one or two sentences, under 40 words.",
		"Say what is on the main workspace, what the AI chat panel on the right is saying, and what the RM does.",
		"The three screens must look different. Do not repeat the same layout, widgets, or action.",
		"No titles.",
		"JSON: {\"scenes\":[\"...\",\"...\",\"...\"]}",
		JSON.stringify(shared)
	].join("\n");
	else {
		const index = data.sceneIndex ?? 0;
		user = [
			`Draft cut scene ${index + 1} of 3.`,
			"Describe what that SCREEN looks like, in one or two sentences, under 40 words.",
			"Say what is on the main workspace, what the AI chat panel on the right is saying, and what the RM does.",
			"Do not repeat the layout or the action of the other screens. No title.",
			"JSON: {\"paragraph\":\"...\"}",
			JSON.stringify({
				...shared,
				sceneIndex: index
			})
		].join("\n");
	}
	const messages = [{
		role: "system",
		content: system
	}, {
		role: "user",
		content: user
	}];
	let result = await chat(keyed, messages, 700, .4);
	if (!result.ok) return result;
	let parsed;
	try {
		parsed = parseJsonObject(result.text);
	} catch {
		const again = await chat(keyed, [
			...messages,
			{
				role: "assistant",
				content: result.text.slice(0, 1500)
			},
			{
				role: "user",
				content: "That was not valid JSON. Return the JSON object only."
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
		const next = asText(parsed.pain ?? parsed.text, 400);
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
		const paragraph = asText(parsed.paragraph ?? parsed.scene ?? parsed.text, 320);
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
		const text = data.field === "name" ? asAgentName(parsed.text ?? parsed.value ?? parsed.name) : asText(parsed.text ?? parsed.value ?? parsed.paragraph, 400);
		if (!text) return {
			ok: false,
			error: "The assistant came back empty. Try once more."
		};
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
		].map((index) => asText(raw[index], 320));
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
		name: asAgentName(field(source, [
			"name",
			"agentName",
			"title"
		])),
		agentDoes: field(source, [
			"agentDoes",
			"agent",
			"whatTheAgentShouldDo",
			"does"
		]),
		rmSees: field(source, [
			"rmSees",
			"sees",
			"whatTheRmSees",
			"output"
		]),
		benefits: field(source, [
			"benefits",
			"benefit",
			"conversation",
			"value"
		])
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
var generateSceneImage_createServerFn_handler = createServerRpc({
	id: "3d65c4f9a534699f6c2b634801ca1f839c5b7b79c56d8b2d02838d01b4044eb9",
	name: "generateSceneImage",
	filename: "src/lib/ai.functions.ts"
}, (opts) => generateSceneImage.__executeServer(opts));
var generateSceneImage = createServerFn({ method: "POST" }).validator((input) => input).handler(generateSceneImage_createServerFn_handler, async ({ data }) => {
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	const paragraph = (data.paragraph ?? "").trim().slice(0, 1e3);
	if (paragraph.length < 8) return {
		ok: false,
		error: "Write the scene paragraph first."
	};
	const context = (data.context ?? "").trim().slice(0, 500);
	const prompt = [
		UI_BITMAP,
		`Screen ${(data.index ?? 0) + 1} of 3 in the same product.`,
		context ? `Product context: ${context}` : "",
		`This screen shows only this step: ${paragraph}`
	].filter(Boolean).join(" ");
	const attempts = [
		{
			model: "grok-imagine-image-quality",
			resolution: "2k"
		},
		{
			model: "grok-imagine-image-quality",
			resolution: "1k"
		},
		{
			model: "grok-imagine-image",
			resolution: "1k"
		}
	];
	let last = "Image generation failed.";
	for (const attempt of attempts) {
		const res = await postJson("https://api.x.ai/v1/images/generations", keyed, {
			model: attempt.model,
			prompt,
			n: 1,
			resolution: attempt.resolution,
			response_format: "b64_json"
		});
		if (res.ok) {
			const first = (await res.json()).data?.[0];
			if (first?.b64_json) return {
				ok: true,
				dataUrl: `data:image/png;base64,${first.b64_json}`
			};
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
		if (!(res.status === 400 || res.status === 404)) break;
	}
	return {
		ok: false,
		error: last
	};
});
var generatePrototype_createServerFn_handler = createServerRpc({
	id: "5f07220d25115a1a4fe0baa47d4d702d08f8cdd64fb9d9303de59697385e361d",
	name: "generatePrototype",
	filename: "src/lib/ai.functions.ts"
}, (opts) => generatePrototype.__executeServer(opts));
var generatePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(generatePrototype_createServerFn_handler, async ({ data }) => {
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
	const step = data.step === 2 || data.step === 3 ? data.step : 1;
	const scene = data.scenes[step - 1] ?? "";
	const instruction = [
		`Build ONLY step ${step} of a 3-step mini-app.`,
		`Return one element and nothing else: <section data-step="${step}">...</section>`,
		"One screen that fills the viewport. No tab bar, no img tags, no position:fixed.",
		"Rebuild the attached cut-scene screenshot in HTML and CSS. Match its layout, colors, and where the AI chat panel sits. Do not paste the picture.",
		"A click should do something small. Fictional sample data only. Inline CSS only. No network.",
		step > 1 ? "Use the same colors, type, and chrome as the previous HTML. This screen must show a different moment." : "This screen sets the visual system the next screens will follow.",
		"",
		`Painpoint scenario: ${data.pain}`,
		`Agent name: ${data.brief.name}`,
		`What the agent does: ${data.brief.agentDoes}`,
		`What the RM sees or receives: ${data.brief.rmSees}`,
		`Benefits: ${data.brief.benefits}`,
		`This cut scene: ${scene}`,
		data.previousHtml ? `Previous HTML, for continuity only:\n${data.previousHtml.slice(0, 14e3)}` : ""
	].filter(Boolean).join("\n");
	const image = (data.image ?? "").startsWith("data:image/") ? data.image : "";
	const result = await chat(keyed, [{
		role: "system",
		content: "You output HTML only. No markdown."
	}, {
		role: "user",
		content: image ? [{
			type: "image_url",
			image_url: {
				url: image,
				detail: "low"
			}
		}, {
			type: "text",
			text: instruction
		}] : instruction
	}], 2600, .3);
	if (!result.ok) return result;
	const section = cleanFragment(extractSection(result.text, step));
	if (!section) return {
		ok: false,
		error: `Step ${step} did not come back. Try again.`
	};
	const html = sanitizeHtml(data.previousHtml?.includes("<") ? upsertSection(data.previousHtml, step, section) : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${section}</body></html>`);
	if (!html) return {
		ok: false,
		error: `Step ${step} was not usable HTML. Try again.`
	};
	return {
		ok: true,
		html
	};
});
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
	const fit = "<style>html,body{height:100%;margin:0;background:#fff;color:#161616;font-family:system-ui,sans-serif}body{overflow:hidden}[data-step]{box-sizing:border-box;height:100%;overflow:auto;padding:16px}[data-step][hidden]{display:none!important}*{box-sizing:border-box}</style>";
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
function extractSection(raw, step) {
	let html = raw.trim();
	const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
	if (fenced) html = fenced[1].trim();
	const tagged = html.match(new RegExp(`<section\\b[^>]*data-step\\s*=\\s*["']${step}["'][^>]*>[\\s\\S]*?</section>`, "i"));
	if (tagged) return tagged[0];
	const any = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/i);
	if (any) return any[0].replace(/<section\b[^>]*>/i, `<section data-step="${step}">`);
	if (!html.includes("<")) return "";
	return `<section data-step="${step}">${html.replace(/^<!doctype[^>]*>/i, "").replace(/<\/?html[^>]*>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "").replace(/<\/?body[^>]*>/gi, "")}</section>`;
}
function cleanFragment(section) {
	return section.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<img\b[^>]*>/gi, "").replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "").replace(/<iframe\b[^>]*\/?>/gi, "").replace(/<link\b[^>]*>/gi, "");
}
function upsertSection(doc, step, section) {
	const current = new RegExp(`<section\\b[^>]*data-step\\s*=\\s*["']${step}["'][^>]*>[\\s\\S]*?</section>`, "i");
	if (current.test(doc)) return doc.replace(current, section);
	if (/<body[^>]*>/i.test(doc)) return doc.replace(/<body[^>]*>/i, (match) => `${match}${section}`);
	return `${doc}${section}`;
}
var refinePrototype_createServerFn_handler = createServerRpc({
	id: "b2261155703b81b5d1557b75e66456c034f91741b083711947fa122dbd3118a2",
	name: "refinePrototype",
	filename: "src/lib/ai.functions.ts"
}, (opts) => refinePrototype.__executeServer(opts));
var refinePrototype = createServerFn({ method: "POST" }).validator((input) => input).handler(refinePrototype_createServerFn_handler, async ({ data }) => {
	const keyed = keyOrError();
	if (typeof keyed !== "string") return keyed;
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
	const result = await chat(keyed, [{
		role: "system",
		content: "You output one HTML section and nothing else."
	}, {
		role: "user",
		content: [
			`Revise ONLY <section data-step="${step}">. Return that one section and nothing else.`,
			"Do not rewrite the other steps. Keep the AI chat panel and the same visual style.",
			"No images, no position:fixed, no network. Fictional sample data only.",
			"",
			`Edit: ${direction}`,
			`Painpoint scenario: ${data.pain}`,
			`Agent name: ${data.brief.name}`,
			`This cut scene: ${data.scenes[step - 1] ?? ""}`,
			"",
			"Current section:",
			extractSection(current, step) || current.slice(0, 8e3)
		].join("\n")
	}], 2600, .4);
	if (!result.ok) return result;
	const section = cleanFragment(extractSection(result.text, step));
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
export { coachDraft_createServerFn_handler, generatePrototype_createServerFn_handler, generateSceneImage_createServerFn_handler, refinePrototype_createServerFn_handler };
