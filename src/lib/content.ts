export const PAINPOINTS: { id: string; title: string; text: string; icon: string }[] = [
  {
    id: "01",
    icon: "users",
    title: "Lack of clear client priorities",
    text: "With so many clients to look after, I struggle to know who to contact first, what has changed, and how to make the conversation relevant.",
  },
  {
    id: "02",
    icon: "clock",
    title: "Lengthy, manual meeting preparation",
    text: "Before a client meeting, I spend too much time gathering information about their holdings, previous discussions, and outstanding needs.",
  },
  {
    id: "03",
    icon: "layers",
    title: "Scattered client information",
    text: "Client information is spread across systems and records. I struggle to get a clear picture of their wealth relationship and what needs attention.",
  },
  {
    id: "04",
    icon: "goal",
    title: "Difficulty connecting client goals and priorities",
    text: "Clients often have several goals and competing priorities. I struggle to bring these together and work out what to explore first.",
  },
  {
    id: "05",
    icon: "scale",
    title: "Time-consuming comparisons and complex explanations",
    text: "I spend too much time comparing wealth options and explaining their features, risks, and trade-offs in a way the client can understand.",
  },
  {
    id: "06",
    icon: "clipboard",
    title: "Manual, lengthy onboarding and client reviews",
    text: "I spend too much time gathering documents, chasing missing information, and working out what is needed next to progress onboarding or a client review.",
  },
  {
    id: "07",
    icon: "list",
    title: "Manual request tracking and client updates",
    text: "When a client request involves several teams, I struggle to see what is holding it up, who needs to act next, and what I can tell the client.",
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
    title: "Scattered market insights and information overload",
    text: "There is too much market commentary and house-view material spread across different sources. I struggle to absorb it all and work out what matters for each client's holdings, goals, and concerns, so I can have a timely, personalised conversation.",
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
    name: "What would you call the person who has the meeting ready before you walk in? Don't say preparation.",
    does: "Holdings, the last conversation, and what is still open. What does the assistant gather, and what do you still decide?",
    sees: "What has to be in front of you so you stop hunting before the client sits down?",
    benefits: "What does the client notice in the first five minutes, and what do you stop doing the night before?",
  },
  "03": {
    name: "What would you call the person who puts the relationship on one page? Don't say systems.",
    does: "The picture is split across records. What does the assistant pull together, and what does it leave out?",
    sees: "What single view would let you see the wealth relationship and what needs attention?",
    benefits: "What does the client stop watching you search for?",
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
    name: "What would you call the person who keeps the review moving? Don't say onboarding.",
    does: "Documents are missing and the next step is unclear. What does the assistant chase or draft, and what do you still check?",
    sees: "What would you want in front of you so you know what is needed next?",
    benefits: "What does the client stop waiting on, and what chase do you get back?",
  },
  "07": {
    name: "What would you call the person who shows you where a request is stuck? Don't say tracking.",
    does: "Several teams are involved. What does the assistant find out, and what do you still tell the client?",
    sees: "What would you need to see to know who acts next, and what you can say?",
    benefits: "What does the client hear sooner, and what status chase do you stop making?",
  },
  "08": {
    name: "What would you call the person who flags the cross-border check? Don't say overseas.",
    does: "The client is across a border. What should the assistant check, and when should it hand you to a specialist?",
    sees: "What warning or checklist would you need before you proceed?",
    benefits: "What does the client avoid being surprised by, and what do you stop assuming?",
  },
  "09": {
    name: "What would you call the person who tells you what the market noise means for this client? Don't say insights.",
    does: "Commentary is everywhere. What does the assistant keep, what does it drop, and what does it tie to this client's holdings and goals?",
    sees: "What would you want on one page before a timely conversation?",
    benefits: "What does the client hear that is about them, and what reading do you stop doing?",
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
      "If someone has a sharper version, write that in the row along the bottom. If the room nods, keep the card. Don't polish the sentence.",
    ].join("\n\n");
  }
  return [
    "Which of these happens to you with a client in front of you?",
    "Pick the card the group argues about, not the one that sounds impressive. If none of them is yours, write the real one in the row along the bottom.",
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
  "01": "Design three screens. What are the three steps your assistant takes when the book is too big: who has changed, who to contact first, and how you open so it is relevant?",
  "02": "Design three screens. What are the three steps your assistant takes before the meeting: what it gathers, the one page of holdings and open needs, and you walking in with it?",
  "03": "Design three screens. What are the three steps your assistant takes when the client is split across records: what it pulls together, the picture of the relationship, and what needs attention?",
  "04": "Design three screens. What are the three steps your assistant takes with competing goals: how it lines them up, what you explore first, and what you leave for later?",
  "05": "Design three screens. What are the three steps your assistant takes with a comparison: the options, the trade-offs in plain language, and you explaining it with the client?",
  "06": "Design three screens. What are the three steps your assistant takes on onboarding or a review: what is missing, what it chases, and what you do next?",
  "07": "Design three screens. What are the three steps your assistant takes on a request that spans teams: where it is stuck, who acts next, and what you can tell the client?",
  "08": "Design three screens. What are the three steps your assistant takes when the client is cross-border: what it checks, when it flags a specialist, and what you still decide?",
  "09": "Design three screens. What are the three steps your assistant takes with market noise: what it keeps, what it ties to this client's holdings and goals, and the conversation you have?",
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
