export const situations = [
  "They lowballed me",
  "Client went silent",
  "I need a raise",
  "I’m being undercut",
  "Negotiation stalled",
  "They called my bluff",
  "I need to say no",
  "Should I walk away?",
];

export const sampleCases = [
  {
    id: "scope",
    title: "The scope expanded. The fee didn’t.",
    type: "PRICING",
    ago: "2 days ago",
    status: "Negotiated",
    summary:
      "A long-term client added a launch workshop and weekly reporting after approving the original project fee.",
  },
  {
    id: "offer",
    title: "A strong offer with a weak deadline",
    type: "CAREER",
    ago: "6 days ago",
    status: "Accepted",
    summary:
      "A preferred employer made a good offer but demanded an answer before another final interview.",
  },
  {
    id: "ghost",
    title: "Silence after the verbal yes",
    type: "CLIENT",
    ago: "12 days ago",
    status: "Ghosted",
    summary: "The buyer agreed to terms on a call, then stopped responding before signature.",
  },
];

export const resultLayers = [
  {
    n: "01",
    key: "THE READ",
    title: "The situation is not a price objection yet.",
    body: "The client has asked for materially more work without explicitly reopening the commercial terms. The fact is the scope changed. The assumption is that they expect the original fee to hold.",
    aside: "FACT / ASSUMPTION",
    tone: "dark",
  },
  {
    n: "02",
    key: "POWER MAP",
    title: "Your leverage is continuity. Theirs is future volume.",
    body: "You know the account, hold launch context, and reduce transition risk. They control approval timing and may imply future work. Your constraint is capacity; theirs is launch readiness. Unknown: whether budget is fixed or merely unallocated.",
    stats: [
      ["Your leverage", "7.2"],
      ["Their leverage", "6.4"],
      ["Clarity", "5.8"],
    ],
  },
  {
    n: "03",
    key: "YOUR MOVES / THE MOVE",
    title: "Reframe the change as a choice, not a conflict.",
    body: "Offer two viable paths: preserve the fee by preserving the original scope, or include the added work with a revised fee and schedule. This keeps momentum while refusing silent scope absorption.",
    callout: "THE MOVE — present the tradeoff before discussing any discount.",
  },
  {
    n: "04",
    key: "THE SCRIPT",
    title: "Language you can use now.",
    body: "“I’m glad to include the workshop and weekly reporting. Those additions change the scope we originally priced. We can keep the current fee and original deliverables, or I can send a revised option that includes both additions and the adjusted timeline. Which path is more useful?”",
    callout: "Calm. Specific. No apology.",
  },
  {
    n: "05",
    key: "COUNTERMOVES",
    title: "Prepare for the next sentence.",
    rows: [
      ["If they say the budget is fixed", "Reduce scope or phase the additions."],
      ["If they promise future work", "Treat future work as upside, not payment."],
      ["If they call it a small ask", "Estimate the real hours and dependencies."],
    ],
  },
  {
    n: "06",
    key: "DON’T DO THIS",
    title: "Do not absorb it now and “fix pricing next time.”",
    body: "That teaches the client that approved scope is flexible while your price is fixed. It also removes the cleanest moment to reset expectations.",
    tone: "warning",
  },
  {
    n: "07",
    key: "EXIT LINE",
    title: "Walk when the pattern becomes the agreement.",
    body: "Disengaging is reasonable if they reject both a scope reset and a fee adjustment, especially if the added work threatens existing commitments. One difficult request is negotiable; a refusal to recognize tradeoffs is a structural problem.",
  },
  {
    n: "08",
    key: "WHAT HAPPENED?",
    title: "Close the loop. Build your judgment.",
    body: "Record the move you chose and what happened next. Outcome Memory™ turns lived decisions into usable pattern recognition.",
    outcome: true,
  },
];

export const categories = [
  "All",
  "Negotiation",
  "Pricing",
  "Boundaries",
  "Leverage",
  "Communication",
  "Decision",
];

export function makeMoves() {
  const titles = [
    "Name the decision",
    "Price the change",
    "Hold the silence",
    "Separate urgency from value",
    "Trade, never concede",
    "Ask for the constraint",
    "Set the next checkpoint",
    "Make the alternative real",
    "Define the walk-away",
    "Document the agreement",
  ];
  const cats = categories.slice(1);
  return Array.from({ length: 90 }, (_, i) => ({
    number: i + 1,
    title: `${titles[i % titles.length]}`,
    category: cats[i % cats.length],
    pro: i > 6,
    principle: "A strong position begins with a clear decision, not a perfect sentence.",
  }));
}
