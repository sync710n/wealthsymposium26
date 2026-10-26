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

const ASK: Record<string, { name: string; does: string; sees: string; benefits: string }> = {
  "01": {
    name: "What would you call the person who tells you which lead is worth a call? Don't use the word leads.",
    does: "A lead arrives with almost nothing on it. What would the assistant have to work out before you would pick up the phone?",
    sees: "You open the morning. What is on the screen that makes you call one person and leave another?",
    benefits: "If this worked tomorrow, what would you stop doing, and what would that client notice?",
  },
  "02": {
    name: "What would you call the person who lets you ask a question your filters cannot? Don't say filter.",
    does: "Age, holdings, and funds are not the question you have. What question is it, and what would the assistant do with it?",
    sees: "What would you need to see before you trusted a name on that new list?",
    benefits: "Who gets a call they would not have got today, and what do you get back?",
  },
  "03": {
    name: "What would you call the person who stops something going out in your name? Don't say campaign.",
    does: "Something is about to send in your name. What should the assistant catch, and what should it leave for you to decide?",
    sees: "What would you need in front of you to say yes, or to stop it?",
    benefits: "What changes for the client who would have received it, and for you the next morning?",
  },
  "04": {
    name: "What would you call the person who gets you the margin without the copying? Don't say code.",
    does: "You are in the meeting and the number is in another system. What does the assistant do so you don't leave the client to go and get it?",
    sees: "What has to be on the screen for you to say the number out loud?",
    benefits: "What does the client get in the room that they usually get later?",
  },
  "05": {
    name: "What would you call the person who finds the client while you stay in the conversation? Don't say system.",
    does: "The client is in front of you and their record is somewhere in those seven or eight systems. What does the assistant go and do?",
    sees: "What single thing, if it appeared, would let you stop searching?",
    benefits: "What does the client stop watching you do?",
  },
  "06": {
    name: "What would you call the person who checks the book before you open it? Don't say stale.",
    does: "You are about to show a portfolio the client may already have seen updated. What should the assistant check first?",
    sees: "What warning, or what picture, would you need before you share the screen?",
    benefits: "What would the client notice is different about how prepared you are?",
  },
  "07": {
    name: "What would you call the person who does the 20 minutes of charts, bonds, FX, and insurance? Don't list the products in the name.",
    does: "Those 20–30 minutes happen before you can talk. Which part of that hunt is the assistant's, and which part is still yours?",
    sees: "You walk into the meeting. What is already on the page, and what is deliberately not there?",
    benefits: "What do you do with the time you get back, and what does the client feel in the first five minutes?",
  },
  "08": {
    name: "What would you call the person who puts the meeting on one screen? Don't say tabs.",
    does: "The record, the products, and the form are in different places. What does the assistant bring together, and what does it leave out?",
    sees: "If you could only glance once, what must be on that screen?",
    benefits: "What does the client stop waiting for you to find?",
  },
  "09": {
    name: "What would you call the person who keeps the sale moving while the client is still there? Don't say process.",
    does: "The client is ready and the process is not. What does the assistant push forward, and what must you still do yourself?",
    sees: "What would you need on the screen to finish before they stand up?",
    benefits: "What does the client leave with that they usually leave without?",
  },
  "10": {
    name: "What would you call the person who takes the EDD pack off the meeting? A fun name, not the word report.",
    does: "The pack takes longer than the conversation. What does the assistant draft or collect, and what do you still have to check?",
    sees: "What would you want in your hands so the meeting stays about the client?",
    benefits: "What do you give back to the conversation, and what still has to be right for the client?",
  },
  "11": {
    name: "What would you call the person who answers while the client is still in the room? Don't say notes.",
    does: "You are writing, and the client is waiting. What should the assistant capture, and what should it look up before you do?",
    sees: "What would have to appear on the screen for you to answer now, not after the meeting?",
    benefits: "What does the client no longer have to wait for, and what do you no longer do afterwards?",
  },
  own: {
    name: "What would you call the person who takes this moment off you? Two or three words you would actually say. Not the name of the problem.",
    does: "In the moment you wrote, what is the assistant doing that you are doing today?",
    sees: "What would you need in front of you so you don't go and find it yourself?",
    benefits: "If this worked in the next meeting, what changes for you, and what changes for the client?",
  },
};

export function painGuide(painId: string): string {
  if (painId === "own") {
    return [
      "Tell it the way you would tell another RM. What are you trying to do with the client, and what stops you?",
      "Is it a screen, a wait, a thing you copy, or a question you cannot answer in the room? Pick the real one.",
      "If the sentence could be anyone's job, it is not specific enough yet. No client names and no account numbers.",
    ].join("\n\n");
  }
  if (painId) {
    return [
      "Read it once, then ask the group: is this the moment that actually gets in the way of a client conversation?",
      "If someone has a sharper version, write that in box 12. If the room nods, keep the card. Don't polish the sentence.",
    ].join("\n\n");
  }
  return [
    "Which of these happens to you with a client in front of you?",
    "Pick the card the group argues about, not the one that sounds impressive. If none of them is yours, write the real one in box 12.",
  ].join("\n\n");
}

export function briefGuide(key: BriefKey | "", painId: string, scenario: string): string {
  const ask = ASK[painId] ?? ASK.own;
  const moment = scenario.trim();
  if (key === "name") {
    return [ask.name, "Say it out loud. If it sounds like a system, or like the problem, it is not the name yet."].join("\n\n");
  }
  if (key === "agentDoes") {
    return [
      moment ? `Stay inside this moment: ${moment}` : "Stay inside the moment you picked.",
      ask.does,
      "Write what the assistant does, not what you do. If the sentence still describes the pain, you have not said the job.",
    ].join("\n\n");
  }
  if (key === "rmSees") {
    return [
      ask.sees,
      "Write it as yourself: I see… or I get… If you cannot point at it, it is still an idea.",
    ].join("\n\n");
  }
  if (key === "benefits") {
    return [
      ask.benefits,
      "One change for you. One change for the client. If the benefit could fit any agent, it is too vague for this moment.",
    ].join("\n\n");
  }
  return [
    moment ? `You are designing for this moment only: ${moment}` : "Pick a scenario first. The brief has to answer that moment.",
    "Click a box. The question on the right is for the group to answer. Don't look for a sample sentence.",
  ].join("\n\n");
}

export const SCENE_HINTS: Record<string, string> = {
  "01": "Design three screens. What are the three steps your assistant takes with generic leads: who is worth a call, why, and how you open? Describe each screen.",
  "02": "Design three screens. What are the three steps your assistant takes when age, holdings, and funds are not enough: the better question, the sharper list, and who you see today?",
  "03": "Design three screens. What are the three steps your assistant takes before a campaign goes out in your name: what it catches, what it shows you, and what you approve?",
  "04": "Design three screens. What are the three steps your assistant takes so you stop copying codes for a margin: what it pulls, the number it shows, and how you use it in the meeting?",
  "05": "Design three screens. What are the three steps your assistant takes across those 7 or 8 systems: the name search, the one view, and what you do from it?",
  "06": "Design three screens. What are the three steps your assistant takes so you are not looking at a stale portfolio: the check, the warning, and the fresh screen you open?",
  "07": "Design three screens. What are the three steps your assistant takes with charts, bonds, FX, and insurance: what it gathers, the one page, and you walking in with it?",
  "08": "Design three screens. What are the three steps your assistant takes with the client record, products, and forms: what it combines, what stays on screen, and how you use it with the client?",
  "09": "Design three screens. What are the three steps your assistant takes so the sale moves while the client is still there: what it pushes on, what it puts in front of you, and what the client leaves with?",
  "10": "Design three screens. What are the three steps your assistant takes on the EDD pack: what it drafts, what you still check, and you getting the meeting back?",
  "11": "Design three screens. What are the three steps your assistant takes in the meeting: what it captures, the answer it surfaces while the client is there, and you replying in the room?",
  own: "Design three screens. What are the three steps your assistant takes in the moment you wrote? For each screen, say what is on it, what the assistant does, and what you do.",
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
  { id: "scenes", n: "2", short: "Screens", kicker: "Phase 2" },
  { id: "prototype", n: "3", short: "Prototype", kicker: "Phase 3" },
];
