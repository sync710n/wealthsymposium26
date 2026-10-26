import type { Brief } from "@/lib/content";

const join = (lines: Array<string | false | undefined>) => lines.filter(Boolean).join("\n");

function ideaBrief(brief: Brief) {
  return join([
    `Agent name: ${brief.name || "(empty)"}`,
    `What the agent does: ${brief.agentDoes || "(empty)"}`,
    `What the RM expects to see and receive: ${brief.rmSees || "(empty)"}`,
    `Benefits: ${brief.benefits || "(empty)"}`,
  ]);
}

export const prompts = {
  coach: {
    system: [
      "You help a group of wealth relationship managers in a live 30-minute workshop.",
      "Write in plain English. Be concrete and short. Use fictional clients only — never real names, account numbers, or HKID.",
      "Do not mention that you are a model. Return JSON only, no markdown.",
      "Stay on their chosen painpoint. Do not invent a different problem.",
    ].join(" "),
    jsonRetry: "That was not valid JSON. Return the JSON object only.",
    pain(current: string, direction: string) {
      return join([
        "Question: Write the scenario that hurts.",
        `Already in the box: ${current || "(empty)"}`,
        `Enrich direction: ${direction || "(none)"}`,
        "Rewrite the scenario using the enrich direction. One or two short sentences, about 25 words, the same length as a card on the wall. First person, as the relationship manager. No story, no dialogue, and no time of day. Do not copy these labels. Do not return the box unchanged.",
        'JSON: {"pain":"..."}',
      ]);
    },
    brief(shared: unknown) {
      return join([
        "Draft the idea brief for this scenario. Write it the way a relationship manager would say it to a colleague: plain, concrete, and calm.",
        "No slogans. Do not say you. Do not invent a boss, a product push, or a new problem.",
        "name: 2 to 4 words. A helper they would want beside them. Positive. Not the name of the problem. No period.",
        "agentDoes: two sentences, about 40 words. Third person. The assistant you want, doing the job that fixes this scenario. It does not cause the problem. Do not start with I.",
        "rmSees: two sentences, about 40 words. First person, as the RM. I see or I get the thing the assistant hands over.",
        "benefits: two sentences, about 40 words. First person. One practical gain for the RM and one for the client.",
        "JSON keys: name, agentDoes, rmSees, benefits.",
        JSON.stringify(shared),
      ]);
    },
    agentName(current: string, direction: string, scenario: string) {
      return join([
        "Question: Name your agent",
        `Scenario: ${scenario || "(not chosen)"}`,
        `Already in the box: ${current || "(empty)"}`,
        `Enrich direction: ${direction || "(none)"}`,
        "The name must be about this scenario. Make it positive: a helper the RM would want beside them. Never name the problem, and never use words like thief, killer, burden, pain, or chaos. 2 to 4 words. No period. Do not copy these labels.",
        'JSON: {"text":"..."}',
      ]);
    },
    field(question: string, current: string, direction: string, scenario: string, voice = "") {
      return join([
        `Question: ${question}`,
        `Scenario: ${scenario || "(not chosen)"}`,
        `Already in the box: ${current || "(empty)"}`,
        `Enrich direction: ${direction || "(none)"}`,
        voice,
        "Write it the way a relationship manager would say it to a colleague. Plain and concrete. No slogans, and do not say you. Two sentences, about 40 words, unless the enrich direction asks for a different length. Do not answer in one short clause. Follow the enrich direction. Do not copy these labels. Do not switch to a different problem.",
        'JSON: {"text":"..."}',
      ]);
    },
    scenes(currents: string[], direction: string, scenario: string, brief: Brief) {
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
        'JSON: {"scenes":["...","...","..."]}',
      ]);
    },
    scene(index: number, current: string, direction: string, scenario: string, brief: Brief) {
      return join([
        `Enrich direction, obey this first: ${direction || "(none — draft this step)"}`,
        "If the direction says shorten, cut, or brief: one sentence, under 18 words.",
        "Otherwise two sentences, about 45 words. Say what is on this screen, what the assistant does or says, and what the RM does next. Do not stop after one short clause.",
        `Scenario: ${scenario || "(not chosen)"}`,
        "Idea brief:",
        ideaBrief(brief),
        `Cut scene ${index + 1} now: ${current || "(empty)"}`,
        'JSON: {"paragraph":"..."}',
      ]);
    },
  },
  sceneImage: {
    bitmap: [
      "A crisp 16:9 desktop screenshot of a futuristic wealth relationship-manager workbench. Not an illustration, not a painting, not a photo of a person or a desk, not a device mockup.",
      "No bezel, no browser chrome, no hands, no perspective, no watermark, no caption, and do not write a screen number.",
      "Futuristic visual style: gradient color fields across the background and panels, luminous accents, soft glass surfaces, and a cool-to-warm gradient such as violet, blue, and amber. Not a flat gray admin theme.",
      "If an agent name is given, that is the only product name on the screen. Do not invent a brand, a company, or a title of your own.",
      "Show a different moment each step: what the agent is doing, and what the RM is looking at. Do not repeat the same screen.",
      "Sharp sans-serif type, aligned controls, real buttons, and short readable English labels. Fictional sample data only.",
    ].join(" "),
    build(index: number, paragraph: string, context: string, others: string) {
      return [
        prompts.sceneImage.bitmap,
        `This is step ${index + 1} of 3 in one linear story. Draw only this step's screen.`,
        context ? `Product: ${context}` : "",
        others ? `The other steps, which must look different: ${others}` : "",
        `Show what the agent does here, and what the RM sees: ${paragraph}`,
      ]
        .filter(Boolean)
        .join(" ");
    },
  },
  prototype: {
    system: "You output one HTML section and nothing else. No markdown.",
    emptyRetry: "That section was empty. Put the whole screen inside the section and do not close it early.",
    repeatRetry: "Keep the same header and the same right-hand agent panel. Change the work area so it matches this cut scene, not the previous table.",
    styleFallback: "Match the attached picture. Do not invent a simpler screen.",
    styleWithColors(colors: string[]) {
      return `Use these colors only${colors.length ? ` (${colors.join(", ")})` : ""}. Do not copy the previous step's cards or layout.`;
    },
    instruction(input: {
      step: number;
      style: string;
      pain: string;
      brief: Brief;
      scene: string;
      others: string;
      already: string;
      prior: string;
      agent: string;
    }) {
      return join([
        `Build ONLY step ${input.step}. Return one element: <section data-step="${input.step}">...</section>`,
        "The attached picture for THIS step is the work area. Copy its regions and enrich them: every card, list, number, and name in the picture belongs on the screen.",
        "If the picture has a chart, draw that chart in inline SVG with the same labels and figures. A donut, bars, or a line. Do not skip a chart, and do not replace it with a sentence.",
        "The section fills the frame: width 100%, height 100%, no max-width, no auto margin, and no centered card floating in empty space. In a wide frame the columns grow. The work area and the agent panel both stretch to the full height.",
        "One row: the work area, then a chat about 16rem wide. Inside the work area, at most two columns. Put any further cards on a second row. Width 100%. No overlap. No position:absolute.",
        "Font sizes are rem only: body 0.85rem, labels 0.75rem, titles 1rem.",
        "One palette for the whole screen, taken from the picture: a dark violet, blue, and amber gradient. Cards are dark glass. Text is light. Do not put a pale page on the left and a dark chat on the right.",
        "Inline CSS only. No external scripts or fonts. A click can do something small.",
        "When the picture shows a person, do not use an empty box or an external image. Use an inline SVG avatar with their initials, for example <svg viewBox=\"0 0 64 64\" width=\"64\" height=\"64\"><rect width=\"64\" height=\"64\" rx=\"12\" fill=\"#6d4aff\"/><text x=\"32\" y=\"40\" text-anchor=\"middle\" font-size=\"22\" font-family=\"sans-serif\" fill=\"#fff\">EV</text></svg>.",
        "Every part of the screen goes inside the section. Do not close the section before the screen is finished.",
        input.step === 1
          ? "This is step 1. The header and the right-hand agent panel you build here are the shell. Later steps must copy them."
          : join([
              "This is a later step. Copy the shell. Change only the work area.",
              "Header: same product name, same height, same alignment, same small status. Do not add a new title bar.",
              "Agent panel: copy the markup below. Same colors, border, radius, title, avatar, and reply box. Change only the words inside the two messages.",
              input.agent ? `Agent panel to copy:\n${input.agent}` : "",
              "Work area: follow the attached picture. Different cards, list, or chart. Do not repeat the earlier table.",
              input.prior ? `Header to copy:\n${input.prior}` : "",
            ]),
        input.style,
        "",
        `Painpoint scenario: ${input.pain}`,
        `Agent name: ${input.brief.name || "Do not invent a brand. Call it the agent."}`,
        `What the agent does: ${input.brief.agentDoes}`,
        `What the RM expects to see and receive: ${input.brief.rmSees}`,
        `This step's cut scene: ${input.scene}`,
        `The other steps, which you must not repeat:\n${input.others}`,
        input.already ? `Do not repeat this content:\n${input.already}` : "",
      ]);
    },
  },
  refine: {
    system: "You output one HTML section and nothing else.",
    instruction(input: { step: number; direction: string; pain: string; brief: Brief; scene: string; current: string }) {
      return [
        `Revise ONLY <section data-step="${input.step}">. Return that one section and nothing else.`,
        "The attached picture is this step's original cut scene. Keep what the agent does and what the RM sees in that picture.",
        "Keep visual continuity with the other steps: same navigation, gradient colors, type, spacing, and the right-hand agent chat. Do not invent a new shell.",
        "Nothing may overlap. Work area plus chat, and at most two columns inside the work area. Extra cards go on the next row. Readable at 900px wide, not only full screen. No position:absolute or position:fixed.",
        "The right-hand agent panel stays the same card: same colors, border, radius, title, and reply box. Change only the message text. Do not restyle it.",
        "Do not add a second copy of the old screen.",
        "The screen fills the frame, width 100% and height 100%. No max-width and no centered card.",
        "No position:fixed. No external images. Fictional sample data only. A person is an inline SVG avatar with their initials.",
        "",
        `Edit: ${input.direction}`,
        `Painpoint scenario: ${input.pain}`,
        `Agent name: ${input.brief.name || "Do not invent a brand. Call it the agent."}`,
        `This cut scene: ${input.scene}`,
        "",
        "Current section:",
        input.current,
      ].join("\n");
    },
  },
};
