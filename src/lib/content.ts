export const PAINPOINTS: { id: string; text: string; icon: string }[] = [
  { id: "01", icon: "search", text: "The leads I get are too generic, so I cannot tell who is actually worth a call." },
  { id: "02", icon: "filter", text: "I can only filter clients by age, holdings, and funds." },
  { id: "03", icon: "mail", text: "A campaign email went out in my name, and I did not know." },
  { id: "04", icon: "copy", text: "I copy codes between systems just to check a profit margin." },
  { id: "05", icon: "layers", text: "I jump across 7–8 systems, and I cannot search a client by name." },
  { id: "06", icon: "clock", text: "I sometimes open a stale portfolio. The client sees the update before I do." },
  { id: "07", icon: "chart", text: "I spend 20–30 minutes per client on charts, bond quotes, FX, and insurance." },
  { id: "08", icon: "tabs", text: "I keep too many tabs open across the client record, products, and forms." },
  { id: "09", icon: "clipboard", text: "The sales process feels too bureaucratic to move while the client is with me." },
  { id: "10", icon: "file", text: "EDD reports take more of my time than the client conversation." },
  { id: "11", icon: "notes", text: "In a meeting I take notes by hand, and I cannot answer until I look it up later." },
];

export const BRIEF_HINTS: Record<string, string> = {
  "01": "Your leads don't say who is worth a call. What should an assistant check before you dial, what shortlist should it hand you, and who gets a better first conversation? Pick a box and we'll shape the brief.",
  "02": "You can only slice clients by age, holdings, and funds. What else should an assistant let you ask, what list should it put in front of you, and how does that change who you see today? Pick a box and we'll shape the brief.",
  "03": "A campaign went out in your name and you found out later. What should an assistant catch before it sends, what should it show you, and how does that protect the relationship? Pick a box and we'll shape the brief.",
  "04": "You copy codes between systems just to see a margin. What should an assistant pull together, what number should it put on your screen, and how does that help you answer in the meeting? Pick a box and we'll shape the brief.",
  "05": "You jump across 7 or 8 systems and still can't find a client by name. What should an assistant search, what one view should it hand you, and how does that save the meeting? Pick a box and we'll shape the brief.",
  "06": "You sometimes open a portfolio the client has already seen updated. What should an assistant check first, what should it warn you about, and how does that keep you ahead of the client? Pick a box and we'll shape the brief.",
  "07": "You lose 20–30 minutes per client on charts, bonds, FX, and insurance. What should an assistant gather, what one page should it hand you, and how does that give the meeting back? Pick a box and we'll shape the brief.",
  "08": "The client record, products, and forms are spread across too many tabs. What should an assistant combine, what should it leave on your screen, and how does that help you or the client? Pick a box and we'll shape the brief.",
  "09": "The sale stalls on process while the client is still with you. What should an assistant move along, what should it put in front of you to finish, and how does the client leave with something done? Pick a box and we'll shape the brief.",
  "10": "EDD reports take more time than the client conversation. What should an assistant draft or collect, what should you still check, and how does that give the meeting back? Pick a box and we'll shape the brief.",
  "11": "In the meeting you write notes by hand and answer later. What should an assistant capture, what answer should it surface while the client is still there, and how does that change the meeting? Pick a box and we'll shape the brief.",
  own: "Stay with the moment you wrote. What should an assistant take off your plate in that moment, what should it hand you, and who does that help? Pick a box and we'll shape the brief.",
};

export const SCENE_HINTS: Record<string, string> = {
  "01": "Imagine you are the director. What are the three steps your assistant takes with generic leads: who is worth a call, why, and how you open? Describe each screen.",
  "02": "Imagine you are the director. What are the three steps your assistant takes when age, holdings, and funds are not enough: the better question, the sharper list, and who you see today?",
  "03": "Imagine you are the director. What are the three steps your assistant takes before a campaign goes out in your name: what it catches, what it shows you, and what you approve?",
  "04": "Imagine you are the director. What are the three steps your assistant takes so you stop copying codes for a margin: what it pulls, the number it shows, and how you use it in the meeting?",
  "05": "Imagine you are the director. What are the three steps your assistant takes across those 7 or 8 systems: the name search, the one view, and what you do from it?",
  "06": "Imagine you are the director. What are the three steps your assistant takes so you are not looking at a stale portfolio: the check, the warning, and the fresh screen you open?",
  "07": "Imagine you are the director. What are the three steps your assistant takes with charts, bonds, FX, and insurance: what it gathers, the one page, and you walking in with it?",
  "08": "Imagine you are the director. What are the three steps your assistant takes with the client record, products, and forms: what it combines, what stays on screen, and how you use it with the client?",
  "09": "Imagine you are the director. What are the three steps your assistant takes so the sale moves while the client is still there: what it pushes on, what it puts in front of you, and what the client leaves with?",
  "10": "Imagine you are the director. What are the three steps your assistant takes on the EDD pack: what it drafts, what you still check, and you getting the meeting back?",
  "11": "Imagine you are the director. What are the three steps your assistant takes in the meeting: what it captures, the answer it surfaces while the client is there, and you replying in the room?",
  own: "Imagine you are the director. What are the three steps your assistant takes in the moment you wrote? For each screen, say what is on it, what the assistant does, and what you do.",
};

export type BriefKey = "name" | "agentDoes" | "rmSees" | "benefits";

export type Brief = Record<BriefKey, string>;

export const EMPTY_BRIEF: Brief = {
  name: "",
  agentDoes: "",
  rmSees: "",
  benefits: "",
};

export const BRIEF_FIELDS: { key: BriefKey; label: string; hint: string; refineAs: string }[] = [
  {
    key: "name",
    label: "Name your agent",
    hint: "A short name the group will remember",
    refineAs: "the agent name",
  },
  {
    key: "agentDoes",
    label: "What exactly is the agent doing as your assistant?",
    hint: "The job your assistant does, in one or two sentences",
    refineAs: "what the agent does as your assistant",
  },
  {
    key: "rmSees",
    label: "As the RM, what do you expect to see and receive from your assistant?",
    hint: "What you expect it to hand you",
    refineAs: "what you expect to see and receive from your assistant",
  },
  {
    key: "benefits",
    label: "Key benefits for you or your clients",
    hint: "Why this is worth it",
    refineAs: "the benefits",
  },
];

export type StepId = "overview" | "pain" | "brief" | "scenes" | "prototype";

export const FLOW: { id: Exclude<StepId, "overview">; n: string; short: string; kicker: string }[] = [
  { id: "pain", n: "0", short: "Scenario", kicker: "Phase 0" },
  { id: "brief", n: "1", short: "Brief", kicker: "Phase 1" },
  { id: "scenes", n: "2", short: "Scenes", kicker: "Phase 2" },
  { id: "prototype", n: "3", short: "Prototype", kicker: "Phase 3" },
];
