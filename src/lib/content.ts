export const PAINPOINTS: { id: string; title: string; text: string; icon: string }[] = [
  {
    id: "01",
    icon: "users",
    title: "Unclear client priorities",
    text: "With so many clients to look after, I struggle to know who to contact first, what has changed, and how to make the conversation relevant.",
  },
  {
    id: "02",
    icon: "layers",
    title: "Scattered information, lengthy preparation",
    text: "Before a client meeting, I have to piece together information across systems and records about the client's holdings, previous discussions, and outstanding needs. It takes too long to get a clear picture and work out what to discuss.",
  },
  {
    id: "03",
    icon: "messages",
    title: "Too much to juggle in meetings",
    text: "During a meeting, I struggle to stay focused on the client while navigating systems, finding information, and spotting wealth needs or opportunities. I can lose the flow of the conversation or miss something worth exploring.",
  },
  {
    id: "04",
    icon: "goal",
    title: "Competing client goals",
    text: "Clients often have several goals and competing priorities. I struggle to bring these together and work out what to explore first.",
  },
  {
    id: "05",
    icon: "scale",
    title: "Lengthy comparisons and explanations",
    text: "I spend too much time comparing wealth options and explaining their features, risks, and trade-offs in a way the client can understand.",
  },
  {
    id: "06",
    icon: "clipboard",
    title: "Lengthy onboarding, KYC and EDD",
    text: "Onboarding, KYC and EDD take too much time. I have to gather documents, clarify the client's source of wealth and funds, chase missing information, and respond to follow-up questions before the case can move forward.",
  },
  {
    id: "07",
    icon: "list",
    title: "Lengthy discount and bespoke approvals",
    text: "When a client asks for a discount or a bespoke product, I spend too much time preparing the justification, coordinating with different teams, and chasing decisions. It is difficult to give the client a clear update.",
  },
  {
    id: "08",
    icon: "globe",
    title: "Complex cross-border requirements",
    text: "When a client is based overseas or engaging with us across borders, I struggle to know what needs checking and when to seek specialist guidance.",
  },
  {
    id: "09",
    icon: "news",
    title: "Market news and in-house insights overload",
    text: "There is too much market news and too many in-house insights to absorb. I struggle to work out which developments matter to each client's holdings, goals, and concerns, and what I should discuss with them.",
  },
];

const ASK: Record<string, { name: string; does: string; sees: string; benefits: string }> = {
  "01": {
    name: "What would you call the person who tells you who to call first? Don't say priorities.",
    does: "The book is long and something has changed. What does the assistant work out before you decide who gets the call?",
    sees: "You open the morning. What is on the screen that makes one conversation relevant and another one wait?",
    benefits: "Who hears from you that would not have, and what do you stop guessing?",
  },
  "02": {
    name: "What would you call the person who pulls the meeting together? Don't say systems.",
    does: "Holdings, the last conversation, and what is still open sit in different places. What does the assistant piece together, and what do you still decide to discuss?",
    sees: "What has to be on one page so you stop hunting before the client sits down?",
    benefits: "What does the client notice in the first five minutes, and what do you stop doing the night before?",
  },
  "03": {
    name: "What would you call the person who keeps you with the client in the room? Don't say meeting.",
    does: "You are talking and the systems are in the way. What does the assistant find or flag, and what do you still say yourself?",
    sees: "What would have to appear beside the conversation so you don't lose the thread or miss a need?",
    benefits: "What does the client feel you stayed with, and what search do you stop doing in the room?",
  },
  "04": {
    name: "What would you call the person who helps you choose what to explore first? Don't say goals.",
    does: "Several goals are competing. What does the assistant line up, and what is still your call?",
    sees: "What would you need to see before you pick the first thing to talk about?",
    benefits: "What does the client leave clearer about, and what do you stop holding in your head?",
  },
  "05": {
    name: "What would you call the person who makes the trade-off explainable? Don't say comparison.",
    does: "Features, risks, and trade-offs take too long. What does the assistant compare, and what do you still say in your own words?",
    sees: "What would have to be on the page for the client to understand it without a second meeting?",
    benefits: "What does the client grasp in the room, and what explanation do you stop rebuilding?",
  },
  "06": {
    name: "What would you call the person who keeps KYC and EDD moving? Don't say onboarding.",
    does: "Documents, source of wealth, and follow-up questions are in the way. What does the assistant gather or chase, and what do you still check?",
    sees: "What would you want in front of you so you know what is missing before the case can move?",
    benefits: "What does the client stop waiting on, and what chase do you get back?",
  },
  "07": {
    name: "What would you call the person who gets a discount or a bespoke ask moving? Don't say approval.",
    does: "The justification, the other teams, and the decision are all slow. What does the assistant prepare or chase, and what do you still tell the client?",
    sees: "What would you need to see to know where the ask stands, and what you can say?",
    benefits: "What does the client hear sooner, and what status chase do you stop making?",
  },
  "08": {
    name: "What would you call the person who flags the cross-border check? Don't say overseas.",
    does: "The client is across a border. What should the assistant check, and when should it hand you to a specialist?",
    sees: "What warning or checklist would you need before you proceed?",
    benefits: "What does the client avoid being surprised by, and what do you stop assuming?",
  },
  "09": {
    name: "What would you call the person who tells you which news matters for this client? Don't say insights.",
    does: "Market news and in-house notes are everywhere. What does the assistant keep, what does it drop, and what does it tie to this client's holdings, goals, and concerns?",
    sees: "What would you want on one page before a timely conversation?",
    benefits: "What does the client hear that is about them, and what reading do you stop doing?",
  },
  own: {
    name: "What would you call the person who takes this painpoint off you? Two or three words you would actually say. Not the name of the problem.",
    does: "In the painpoint you wrote, what is the assistant doing that you are doing today?",
    sees: "What would you need in front of you so you don't go and find it yourself?",
    benefits: "If this worked in the next meeting, what changes for you, and what changes for the client?",
  },
};

export function painGuide(_painId: string): string {
  return [
    "Which painpoint is most painful to you as an RM? It might be something that slows you down, or something that stops you answering the client well enough in the room.",
    "Pick the card the group finds most painful, not the one that sounds impressive. If none of them is yours, write your group's own painpoint in the row along the bottom.",
  ].join("\n\n");
}

export function briefGuide(key: BriefKey | "", painId: string, scenario: string): string {
  const ask = ASK[painId] ?? ASK.own;
  const moment = scenario.trim();
  if (key === "name") {
    return ["A short name the group will remember, for example EDD guru.", ask.name, "Say it out loud. If it sounds like a system, or like the problem, it is not the name yet."].join("\n\n");
  }
  if (key === "agentDoes") {
    return [
      moment ? `Stay inside this painpoint: ${moment}` : "Stay inside the painpoint you picked.",
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
      "One change for you. One change for the client. If the benefit could fit any agent, it is too vague for this painpoint.",
    ].join("\n\n");
  }
  return [
    moment ? `You are designing for this painpoint only: ${moment}` : "Pick a painpoint first. The brief has to answer that painpoint.",
    "Click a box. The question on the right is for the group to answer. Don't look for a sample sentence.",
  ].join("\n\n");
}

export const SCENE_HINTS: Record<string, string> = {
  "01": "Design three screens. What are the three steps your assistant takes when the book is too big: who has changed, who to contact first, and how you open so it is relevant?",
  "02": "Design three screens. What are the three steps your assistant takes before the meeting: what it pulls from the different records, the one page of holdings and open needs, and you deciding what to discuss?",
  "03": "Design three screens. What are the three steps your assistant takes in the meeting: what it finds while you talk, the need or opportunity it flags, and you staying with the client?",
  "04": "Design three screens. What are the three steps your assistant takes with competing goals: how it lines them up, what you explore first, and what you leave for later?",
  "05": "Design three screens. What are the three steps your assistant takes with a comparison: the options, the trade-offs in plain language, and you explaining it with the client?",
  "06": "Design three screens. What are the three steps your assistant takes on KYC and EDD: what is missing, the source-of-wealth questions, and what has to happen before the case moves?",
  "07": "Design three screens. What are the three steps your assistant takes on a discount or a bespoke ask: the justification, who has to decide, and the update you can give the client?",
  "08": "Design three screens. What are the three steps your assistant takes when the client is cross-border: what it checks, when it flags a specialist, and what you still decide?",
  "09": "Design three screens. What are the three steps your assistant takes with market news and in-house insights: what it keeps, what it ties to this client's holdings and concerns, and the conversation you have?",
  own: "Design three screens. What are the three steps your assistant takes in the painpoint you wrote? For each screen, say what is on it, what the assistant does, and what you do.",
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
    hint: "A short name the group will remember, e.g. EDD guru",
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
  { id: "pain", n: "0", short: "Painpoint", kicker: "Phase 0" },
  { id: "brief", n: "1", short: "Brief", kicker: "Phase 1" },
  { id: "scenes", n: "2", short: "Screens", kicker: "Phase 2" },
  { id: "prototype", n: "3", short: "Prototype", kicker: "Phase 3" },
];
