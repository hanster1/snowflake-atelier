import type { Rule } from './fractal';

export type Speaker = 'isolde' | 'pim' | 'quillby' | 'you';
export interface Line { who: Speaker; text: string }
export interface Question { prompt: string; choices: string[]; answer: number; explain: string }
export interface Level {
  id: string;
  chapter: number;
  title: string;
  intro: Line[];
  task: string;            // what to do, in plain words
  lesson: string;          // the idea, in plain words
  start: Rule;
  editable: ('angle' | 'inward' | 'kind')[];
  kinds?: Rule['kind'][];  // allowed kinds when 'kind' is editable
  goal: Rule & { depth: number };
  question?: Question;
  outro: Line[];
}
export interface Chapter { n: number; title: string; subtitle: string }

export const CHAPTERS: Chapter[] = [
  { n: 1, title: 'The First Fold', subtitle: 'A triangle learns a trick' },
  { n: 2, title: 'The Endless Edge', subtitle: 'The golden thread keeps growing' },
  { n: 3, title: 'Commissions', subtitle: 'Stop at exactly the right step' },
  { n: 4, title: 'Other Weathers', subtitle: 'Inward bumps, new angles, square frost' },
  { n: 5, title: 'Holes & Dust', subtitle: 'Fractals made by taking away' },
];

const K60: Rule = { kind: 'koch', angle: 60, inward: false };
const k = (depth: number, over: Partial<Rule> = {}) => ({ ...K60, ...over, depth });

export const LEVELS: Level[] = [
  // ── Chapter 1 ─────────────────────────────────────────────
  {
    id: '1-1', chapter: 1, title: 'A Plain Triangle',
    intro: [
      { who: 'isolde', text: 'Ah, the new apprentice. Welcome to the Atelier. Mind the ermine; he steals scissors.' },
      { who: 'pim', text: 'Borrows. I borrow scissors.' },
      { who: 'isolde', text: 'Every snowflake in my gallery begins as one humble triangle of ice-paper. Cut once and see what happens.' },
    ],
    task: 'Press Cut once, then Present.',
    lesson: 'One cut: each straight edge is split into three parts, and the middle part is pushed out into a small triangle bump.',
    start: K60, editable: [], goal: k(1),
    outro: [{ who: 'isolde', text: 'A star of David from a triangle. Not bad for your first morning.' }],
  },
  {
    id: '1-2', chapter: 1, title: 'The Same Trick Again',
    intro: [
      { who: 'isolde', text: 'Now the secret of the whole Atelier: do the same thing again, to every edge, however small.' },
      { who: 'pim', text: 'That is just doing homework twice.' },
      { who: 'isolde', text: 'That, Pim, is called iteration. Mathematicians are very proud of it.' },
    ],
    task: 'Cut until the snowflake has 2 steps, then Present.',
    lesson: 'Iteration means repeating one simple rule. Each step uses the result of the step before as its starting point.',
    start: K60, editable: [], goal: k(2),
    outro: [{ who: 'isolde', text: 'Look at one arm. Do you see a little snowflake-ish shape on it? Hold that thought.' }],
  },
  {
    id: '1-3', chapter: 1, title: 'Counting Edges',
    intro: [
      { who: 'pim', text: 'I counted the edges on the triangle. Three! I am a genius.' },
      { who: 'isolde', text: 'Then, genius, before you cut: every edge turns into how many edges?' },
    ],
    task: 'Answer the riddle, then cut to step 2 and Present.',
    lesson: 'Each edge becomes 4 smaller edges. So the count goes 3, 12, 48, 192… multiplying by 4 every step.',
    start: K60, editable: [], goal: k(2),
    question: {
      prompt: 'The triangle has 3 edges. After one cut it has 12. How many edges after the second cut?',
      choices: ['24', '36', '48', '64'], answer: 2,
      explain: 'Every one of the 12 edges becomes 4 edges: 12 × 4 = 48.',
    },
    outro: [{ who: 'pim', text: '48! I would have said that. Eventually.' }],
  },
  {
    id: '1-4', chapter: 1, title: 'Snowflakes Inside Snowflakes',
    intro: [
      { who: 'isolde', text: 'Cut three times. Then zoom your eyes into one corner.' },
      { who: 'isolde', text: 'The tiny edge looks just like the big edge did one step ago. That is self-similarity: the part looks like the whole.' },
    ],
    task: 'Cut to step 3, then Present.',
    lesson: 'Self-similarity: a small piece of a fractal looks like a shrunken copy of a bigger piece. Ferns, coastlines and frost do this too.',
    start: K60, editable: [], goal: k(3),
    question: {
      prompt: 'Which sentence describes self-similarity?',
      choices: ['Every piece is the same size', 'A small piece looks like a copy of a bigger piece', 'The shape is perfectly round', 'It has six arms'],
      answer: 1, explain: 'Self-similar means the parts are smaller copies of the whole (or of bigger parts).',
    },
    outro: [{ who: 'isolde', text: 'This shape has a name: the Koch snowflake, after Helge von Koch, who cut it on paper of pure thought in 1904.' }],
  },
  // ── Chapter 2 ─────────────────────────────────────────────
  {
    id: '2-1', chapter: 2, title: 'The Golden Thread',
    intro: [
      { who: 'isolde', text: 'Every gallery piece gets a golden thread sewn all the way around its edge. Watch the spool beside your table.' },
      { who: 'pim', text: 'Why is the spool emptying so fast?' },
    ],
    task: 'Cut to step 1 and watch the thread. Answer, then Present.',
    lesson: 'Each edge is replaced by 4 pieces that are each one-third as long. 4 thirds = 4/3. So the edge gets 4/3 times longer every step.',
    start: K60, editable: [], goal: k(1),
    question: {
      prompt: 'One edge is 3 hand-spans long. After a cut it becomes 4 pieces, each 1 span. How long is it now?',
      choices: ['3 spans', '4 spans', '6 spans', '9 spans'], answer: 1,
      explain: '4 pieces × 1 span = 4 spans. It grew from 3 to 4: that is ×4/3.',
    },
    outro: [{ who: 'isolde', text: 'A third longer, every single cut. Remember the number 4/3.' }],
  },
  {
    id: '2-2', chapter: 2, title: 'Predict the Thread',
    intro: [
      { who: 'quillby', text: 'Hoo. Lord Quillby, Gallery of Winter. I pay for thread by the metre, young one. Tell me what this will cost me.' },
    ],
    task: 'Predict the thread length, then cut to step 2 and Present.',
    lesson: 'Step 0 thread: 1. Step 1: 4/3 ≈ 1.33. Step 2: 4/3 × 4/3 = 16/9 ≈ 1.78.',
    start: K60, editable: [], goal: k(2),
    question: {
      prompt: 'The thread for the plain triangle is 9 metres. How much for step 2?',
      choices: ['12 m', '15 m', '16 m', '18 m'], answer: 2,
      explain: '9 × 4/3 = 12 metres at step 1, then 12 × 4/3 = 16 metres at step 2.',
    },
    outro: [{ who: 'quillby', text: 'Sixteen. Hmm. Acceptable. Barely.' }],
  },
  {
    id: '2-3', chapter: 2, title: 'An Endless Edge',
    intro: [
      { who: 'pim', text: 'If we keep cutting, does the snowflake get as big as the room?' },
      { who: 'isolde', text: 'Look at the dotted circle. Cut as much as you like.' },
    ],
    task: 'Cut to step 5 and Present. Keep an eye on the circle.',
    lesson: 'An endless edge, a limited area: the thread grows ×4/3 forever, so it goes to infinity, yet the snowflake never leaves its circle. Its area settles at exactly 8/5 of the triangle.',
    start: K60, editable: [], goal: k(5),
    question: {
      prompt: 'If we could cut forever, what happens?',
      choices: ['Thread and area both grow forever', 'Thread grows forever; area stays inside the circle', 'Both stop growing', 'The snowflake becomes a circle'],
      answer: 1, explain: 'Multiplying by 4/3 forever has no limit, but the new bumps get so tiny that the area adds up to a fixed amount: 8/5 of the triangle.',
    },
    outro: [{ who: 'isolde', text: 'Infinite length in a finite space. Do not tell Lord Quillby. He will faint.' }],
  },
  {
    id: '2-4', chapter: 2, title: 'Smaller Every Time',
    intro: [{ who: 'isolde', text: 'Each cut makes the pieces a third as long. My scissors are good, but not infinitely good.' }],
    task: 'Answer, then cut to step 4 and Present.',
    lesson: 'Each step divides piece length by 3: 1, 1/3, 1/9, 1/27, 1/81… Recursion: the rule calls itself on smaller and smaller pieces.',
    start: K60, editable: [], goal: k(4),
    question: {
      prompt: 'The first edge is 81 mm. How long is each tiny edge at step 4?',
      choices: ['1 mm', '3 mm', '9 mm', '27 mm'], answer: 0,
      explain: '81 ÷ 3 ÷ 3 ÷ 3 ÷ 3 = 1 mm.',
    },
    outro: [{ who: 'pim', text: 'One millimetre! That is the size of my patience.' }],
  },
  // ── Chapter 3 ─────────────────────────────────────────────
  {
    id: '3-1', chapter: 3, title: 'The Door Wreath',
    intro: [
      { who: 'quillby', text: 'A commission. A wreath for the gallery door, 48 edges exactly. Not 47. Not 192.' },
    ],
    task: 'Stop at the step with exactly 48 edges, then Present.',
    lesson: 'Edges: 3 × 4 × 4 = 48. That is step 2.',
    start: K60, editable: [], goal: k(2),
    outro: [{ who: 'quillby', text: 'Forty-eight. I counted every one. Twice.' }],
  },
  {
    id: '3-2', chapter: 3, title: 'Thread on a Budget',
    intro: [
      { who: 'quillby', text: 'The window piece. The triangle thread costs 27 coins. I will pay up to 64 coins. Not a feather more.' },
    ],
    task: 'Cut the most detailed snowflake whose thread costs 64 coins or less, then Present.',
    lesson: '27 → 36 → 48 → 64 → 85⅓. Step 3 costs exactly 64. Step 4 is over budget.',
    start: K60, editable: [], goal: k(3),
    outro: [{ who: 'isolde', text: 'Exactly on budget. You have a future in this business.' }],
  },
  {
    id: '3-3', chapter: 3, title: 'Grand Chandelier',
    intro: [
      { who: 'quillby', text: 'The grand chandelier needs 768 edges, so the light can scatter properly.' },
      { who: 'pim', text: 'I can count to 768. It takes a while.' },
    ],
    task: 'Find the step with 768 edges. Answer, then cut and Present.',
    lesson: '3 × 4ⁿ = 768 → 4ⁿ = 256 → n = 4.',
    start: K60, editable: [], goal: k(4),
    question: { prompt: 'Which step has 768 edges?', choices: ['Step 3', 'Step 4', 'Step 5', 'Step 6'], answer: 1, explain: '3, 12, 48, 192, 768: step 4.' },
    outro: [{ who: 'quillby', text: 'Magnificent. I am not crying, it is the frost.' }],
  },
  {
    id: '3-4', chapter: 3, title: 'The Tiny Brooch',
    intro: [
      { who: 'isolde', text: 'A brooch, 3 cm across. My best scissors can cut 1 mm and no smaller. The first edge is 27 mm.' },
    ],
    task: 'Cut as deep as the scissors allow (pieces at least 1 mm), then Present.',
    lesson: 'Piece lengths: 27, 9, 3, 1 mm. Step 3 is the last one the scissors can cut. Real fractals always stop somewhere; only the idea goes on forever.',
    start: K60, editable: [], goal: k(3),
    outro: [{ who: 'isolde', text: 'Knowing when to stop is the whole art.' }],
  },
  // ── Chapter 4 ─────────────────────────────────────────────
  {
    id: '4-1', chapter: 4, title: 'The Anti-Snowflake',
    intro: [
      { who: 'pim', text: 'I pushed the bumps the wrong way. Am I in trouble?' },
      { who: 'isolde', text: 'You have invented the anti-snowflake. Flip the bumps inward and cut to step 3.' },
    ],
    task: 'Switch bumps to Inward, cut to step 3, then Present.',
    lesson: 'The anti-snowflake uses the same rule but bumps point inward. The thread still grows ×4/3 per step, but now the area shrinks: it settles at 2/5 of the triangle.',
    start: K60, editable: ['inward'], goal: k(3, { inward: true }),
    outro: [{ who: 'pim', text: 'It looks like a frost flower eating itself. I love it.' }],
  },
  {
    id: '4-2', chapter: 4, title: 'Predict the Anti-Thread',
    intro: [{ who: 'quillby', text: 'Inward bumps use less paper. Do they use less thread?' }],
    task: 'Answer, then cut an inward step-2 snowflake and Present.',
    lesson: 'Direction does not change length. In or out, each edge still becomes 4 pieces of one-third.',
    start: K60, editable: ['inward'], goal: k(2, { inward: true }),
    question: {
      prompt: 'Outward step 2 needs 16 m of thread. How much does inward step 2 need?',
      choices: ['Less than 16 m', 'Exactly 16 m', 'More than 16 m'], answer: 1,
      explain: 'Same pieces, same lengths, just flipped. 16 m.',
    },
    outro: [{ who: 'quillby', text: 'No discount. Typical.' }],
  },
  {
    id: '4-3', chapter: 4, title: 'Gentle Frost',
    intro: [{ who: 'isolde', text: 'Winter in the south is shy. Make the bumps lower: a 30° angle instead of 60°.' }],
    task: 'Set the bump angle to 30°, cut to step 4, and Present.',
    lesson: 'Change the angle and you change the fractal. Lower bumps mean the thread grows more slowly: about ×1.05 per step at 30° instead of ×1.33.',
    start: K60, editable: ['angle', 'inward'], goal: k(4, { angle: 30 }),
    question: {
      prompt: 'Compared with the 60° snowflake, the 30° thread grows…',
      choices: ['faster', 'slower', 'the same'], answer: 1,
      explain: 'The bump sides are shorter when the bump is lower, so each step adds less length.',
    },
    outro: [{ who: 'pim', text: 'It looks like a very calm coastline.' }],
  },
  {
    id: '4-4', chapter: 4, title: 'Square Frost',
    intro: [{ who: 'quillby', text: 'My cousin wants something… modern. Squares.' }, { who: 'isolde', text: 'Try the square rule on a square of paper: each edge becomes 5 pieces of one-third.' }],
    task: 'Choose the Square rule, cut to step 2, and Present.',
    lesson: 'The quadratic Koch rule: 5 pieces, each 1/3 long, so the thread grows ×5/3 every step, even faster than the snowflake.',
    start: K60, editable: ['kind', 'inward'], kinds: ['koch', 'quad'], goal: { kind: 'quad', angle: 60, inward: false, depth: 2 },
    question: { prompt: 'With the square rule, the thread grows by what each step?', choices: ['×4/3', '×5/3', '×2', '×3/2'], answer: 1, explain: '5 pieces × 1/3 each = 5/3.' },
    outro: [{ who: 'quillby', text: 'Hoo. Very… angular. My cousin will adore it.' }],
  },
  // ── Chapter 5 ─────────────────────────────────────────────
  {
    id: '5-1', chapter: 5, title: 'Sierpinski\'s Lace',
    intro: [
      { who: 'isolde', text: 'Some fractals are made by taking away. Fold the triangle, snip out the middle, and do it again in every corner.' },
    ],
    task: 'Choose Sierpinski, cut to step 3, and Present.',
    lesson: 'The Sierpinski triangle: each triangle becomes 3 half-size triangles. Each one is a perfect small copy of the whole: self-similar.',
    start: K60, editable: ['kind'], kinds: ['koch', 'sierpinski'], goal: { kind: 'sierpinski', angle: 60, inward: false, depth: 3 },
    question: { prompt: 'How many little triangles at step 3?', choices: ['9', '12', '27', '81'], answer: 2, explain: '1 → 3 → 9 → 27.' },
    outro: [{ who: 'pim', text: 'I ate the middle bits. Was that allowed?' }],
  },
  {
    id: '5-2', chapter: 5, title: 'Vanishing Paper',
    intro: [{ who: 'quillby', text: 'I want lace that is less than half paper. Airy.' }],
    task: 'Cut the first Sierpinski step with less than half the paper left, then Present.',
    lesson: 'Each step keeps 3/4 of the paper: 100%, 75%, 56%, 42%. Step 3 is the first under half. Forever: zero paper, but the edges grow ×3/2 forever.',
    start: { kind: 'sierpinski', angle: 60, inward: false }, editable: [], goal: { kind: 'sierpinski', angle: 60, inward: false, depth: 3 },
    outro: [{ who: 'quillby', text: 'Lighter than gossip. Splendid.' }],
  },
  {
    id: '5-3', chapter: 5, title: 'Cantor\'s Dust',
    intro: [
      { who: 'isolde', text: 'A ribbon for the gallery bell. Cut out the middle third. Then the middle third of what is left. Again.' },
      { who: 'pim', text: 'Soon there will be no ribbon at all!' },
    ],
    task: 'Choose Cantor, cut to step 4, and Present.',
    lesson: 'The Cantor set: keep 2 pieces of one-third each time. The length left is ×2/3 per step, heading to zero, yet infinitely many points remain: "dust".',
    start: K60, editable: ['kind'], kinds: ['koch', 'sierpinski', 'cantor'], goal: { kind: 'cantor', angle: 60, inward: false, depth: 4 },
    question: { prompt: 'How many ribbon pieces at step 4?', choices: ['8', '12', '16', '81'], answer: 2, explain: '1, 2, 4, 8, 16: doubling each step.' },
    outro: [{ who: 'pim', text: 'I cannot tie a bow with dust.' }],
  },
  {
    id: '5-4', chapter: 5, title: 'Opening Night',
    intro: [
      { who: 'quillby', text: 'The gallery opens tonight. The centrepiece: the true snowflake, as deep as the paper allows.' },
      { who: 'isolde', text: 'Step 6, apprentice. Every rule you have learned, in one flake.' },
    ],
    task: 'Return to the classic rule, cut to step 6, and Present.',
    lesson: '3 × 4⁶ = 12,288 edges, thread ×(4/3)⁶ ≈ 5.6, and it still sits inside the very same circle.',
    start: { kind: 'cantor', angle: 60, inward: false }, editable: ['kind', 'angle', 'inward'], kinds: ['koch', 'quad', 'sierpinski', 'cantor'], goal: k(6),
    question: { prompt: 'If you cut one more step, the snowflake would…', choices: ['grow past the circle', 'stay inside the circle with a longer edge', 'turn into a circle'], answer: 1, explain: 'More edge, never more room. That is the snowflake\'s secret.' },
    outro: [
      { who: 'quillby', text: 'Ladies, gentlemen, ermines… the endless edge!' },
      { who: 'isolde', text: 'You are no longer my apprentice. The studio is yours.' },
      { who: 'pim', text: 'Can I keep the scissors now?' },
    ],
  },
];

export const NAMES: Record<Speaker, string> = { isolde: 'Madame Isolde', pim: 'Pim the ermine', quillby: 'Lord Quillby', you: 'You' };
