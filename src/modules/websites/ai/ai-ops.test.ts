import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PAGES_PER_REQUEST, MAX_PLAN_SECTIONS, parsePlan, type SectionEnvelope } from "./ai-ops.js";

const hero: SectionEnvelope = {
  id: "hero-1",
  type: "hero",
  hidden: false,
  settings: {},
  data: { heading: "Welcome" },
};

const fullPage = [
  "header", "hero", "marquee", "features", "services", "carousel", "stats", "testimonials",
  "team", "pricing", "faq", "cta", "contact", "custom", "features", "services", "cta", "footer",
];

test("trims an oversized page instead of rejecting the plan", () => {
  const plan = parsePlan(
    {
      intent: "edit",
      reply: "Building your landing page",
      clarification: null,
      ops: [{ op: "replace_page", sectionTypes: fullPage, instruction: "x".repeat(5000) }],
    },
    [hero],
  );
  const [op] = plan.ops;
  assert.equal(op?.op, "replace_page");
  if (op?.op !== "replace_page") return;
  assert.equal(op.sectionTypes.length, MAX_PLAN_SECTIONS);
  assert.equal(op.instruction.length, 2000);
});

test("ignores a leftover empty clarification on an edit", () => {
  const plan = parsePlan(
    {
      intent: "edit",
      reply: "Done",
      clarification: { question: "", options: [], allowCustomInput: true },
      ops: [{ op: "update", sectionId: "hero-1", instruction: "Make it bolder" }],
    },
    [hero],
  );
  assert.equal(plan.clarification, null);
  assert.equal(plan.ops.length, 1);
});

test("turns a clarification without usable options into a chat reply", () => {
  const plan = parsePlan(
    {
      intent: "clarify",
      reply: "",
      clarification: { question: "Which cuisine?", options: ["Mexican"], allowCustomInput: true },
      ops: [],
    },
    [hero],
  );
  assert.equal(plan.intent, "chat");
  assert.equal(plan.reply, "Which cuisine?");
  assert.equal(plan.clarification, null);
});

test("keeps a valid clarification", () => {
  const plan = parsePlan(
    {
      intent: "clarify",
      reply: "A quick question",
      clarification: { question: "Which vibe?", options: ["Rustic", " Rustic ", "Minimal"], allowCustomInput: true },
      ops: [],
    },
    [hero],
  );
  assert.deepEqual(plan.clarification, { question: "Which vibe?", options: ["Rustic", "Minimal"], allowCustomInput: true });
});

test("drops a single invalid op and keeps the rest", () => {
  const plan = parsePlan(
    {
      intent: "edit",
      reply: "Adding sections",
      clarification: null,
      ops: [
        { op: "add", sectionType: "not-a-type", position: 0, instruction: "Nope" },
        { op: "add", sectionType: "faq", position: -3, instruction: "Dining FAQ" },
      ],
    },
    [hero],
  );
  assert.deepEqual(plan.ops, [{ op: "add", sectionType: "faq", position: 0, instruction: "Dining FAQ" }]);
});

test("throws when every op of an edit is invalid, so the planner can retry", () => {
  assert.throws(
    () =>
      parsePlan(
        { intent: "edit", reply: "", clarification: null, ops: [{ op: "explode" }] },
        [hero],
      ),
    /Invalid AI plan/,
  );
});

test("defers pages beyond the per-request cap", () => {
  const names = Array.from({ length: MAX_PAGES_PER_REQUEST + 2 }, (_, i) => `Page ${i + 1}`);
  const plan = parsePlan(
    {
      intent: "edit",
      reply: "Creating pages",
      clarification: null,
      ops: names.map((name) => ({
        op: "create_page",
        name,
        slug: null,
        sectionTypes: ["hero", "cta"],
        instruction: `${name} content`,
        showInNav: true,
      })),
    },
    [hero],
  );
  assert.equal(plan.ops.length, MAX_PAGES_PER_REQUEST);
  assert.deepEqual(plan.deferredPages, names.slice(MAX_PAGES_PER_REQUEST));
});

test("drops ops for chat replies", () => {
  const plan = parsePlan(
    {
      intent: "chat",
      reply: "Hi!",
      clarification: null,
      ops: [{ op: "clear" }],
    },
    [hero],
  );
  assert.deepEqual(plan.ops, []);
});
