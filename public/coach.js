import { scenarios } from './catalog.js';

const patterns = [
  [/\bI am agree\b/i, 'I agree', 'verb form', '“Agree” is already a verb.'],
  [/\bI didn't went\b/i, "I didn't go", 'past tense', 'After “didn’t”, use the base verb.'],
  [/\bI have went\b/i, 'I have gone', 'past participle', 'After “have”, use “gone”.'],
  [/\bI am having ([0-9]+) years of experience\b/i, 'I have $1 years of experience', 'experience', 'Use “I have” to describe experience.'],
  [/\byesterday I go\b/i, 'Yesterday I went', 'past tense', 'Use “went” for a completed trip.'],
  [/\bI go to (school|college|work) yesterday\b/i, 'I went to $1 yesterday', 'past tense', '“Yesterday” puts this action in the past.'],
  [/\b(she|he) don't\b/i, '$1 doesn’t', 'verb agreement', 'Use “doesn’t” with “she” or “he”.'],
  [/\bdiscuss about\b/i, 'discuss', 'word choice', 'Put the topic directly after “discuss”.'],
  [/\bI am go\b/i, 'I am going', 'verb form', 'For an action happening now, use “am going”.'],
  [/\bmore better\b/i, 'better', 'comparison', '“Better” already compares two things.'],
  [/\bI look forward to hear\b/i, 'I look forward to hearing', 'sentence structure', 'Use an -ing form after “look forward to”.'],
  [/\bI am good in\b/i, 'I am good at', 'preposition', 'Use “good at” before a skill.']
];

export function correctionFor(text) {
  for (const [pattern, replacement, tag, why] of patterns) {
    const match = text.match(pattern);
    if (match) return { original: match[0], recast: match[0].replace(pattern, replacement), tag, why };
  }
  return null;
}

const bridgeHints = {
  Kannada: '“ನಾನು …” means “I …”. Start with “I”, then add one action.',
  Hindi: '“मैं …” means “I …”. Start with “I”, then add one action.',
  Tamil: '“நான் …” means “I …”. Start with “I”, then add one action.'
};

export function hintFor(scenario, bridge) {
  return (bridgeHints[bridge] ? bridgeHints[bridge] + ' ' : '') + 'Try starting with “' + scenarios[scenario].starter + '”';
}

export function guidedTurn({ text, scenario, level, bridge, turn, personality, corrections = 'During practice', history = [] }) {
  const scene = scenarios[scenario];
  let correction = correctionFor(text);
  const qIndex = (turn - 1) % scene.questions.length;
  let question = scene.questions[qIndex];
  const alreadyAsked = q => history.some(m => m.role === 'assistant' && m.text.includes(q));
  const context = [
    [/\b(team|teammate|colleague)\b/i, 'What was your part in the team?'],
    [/\b(coffee|tea)\b/i, 'Who would you like to have that drink with?'],
    [/\b(train|bus|commute)\b/i, 'What was the journey like?'],
    [/\b(debug|coded?|coding|project|software)\b/i, 'What was the trickiest part for you?'],
    [/\b(friend|sister|brother)\b/i, 'What did you talk about together?'],
    [/\b(delay|late)\b/i, 'How would you ask for an update?']
  ];
  const related = context.find(([pattern, q]) => pattern.test(text) && !alreadyAsked(q));
  if (related) question = related[1];
  if (level === 'Advanced' && !related && turn % 3 === 0) question = 'How might someone with a different perspective respond?';
  if (level === 'Beginner' && !related && question.length > 55) question = 'Can you give me one example?';
  let reply;
  if (/^(help|hint|i don.t know|not sure|i.m stuck)[.!? ]*$/i.test(text)) {
    reply = 'Take your time. ' + hintFor(scenario, bridge) + ' What would you add?';
    correction = null;
  } else if (/[ಅ-೯ऀ-ॿ஀-௿]/u.test(text)) {
    reply = 'You can mix languages here. ' + hintFor(scenario, bridge) + ' What is one detail you can add in English?';
    correction = null;
  } else if (correction && corrections !== 'Report only') {
    const model = text.length <= 170 ? text.replace(correction.original, correction.recast).replace(/[.!?]+$/, '') : correction.recast;
    reply = 'You could say, “' + model + '.” ' + question;
  } else if (/\b(nervous|shy|afraid)\b/i.test(text)) {
    reply = 'We can take it slowly. ' + 'What is one thing you feel comfortable talking about?';
  } else if (scenario === 'doctor' && /\b(medicine|medication|tablet|treatment|diagnos)/i.test(text)) {
    reply = 'For this language exercise, try “Could I speak to the doctor?” How would you ask for an appointment?';
  } else {
    const openings = personality === 'Direct' ? ['Okay.', 'Let’s build on that.', 'I follow.'] : (personality === 'Curious' ? ['That’s interesting.', 'Hmm, I’m curious.', 'I see.'] : ['I see.', 'Hmm, tell me more.', 'Okay, I’m following.']);
    reply = openings[(turn - 1) % openings.length] + ' ' + question;
  }
  return { reply, correction, vocabulary: turn === 1 ? { term: scene.word[0], meaning: scene.word[1], example: scene.word[2] } : null, engine: 'guided' };
}

export function makeReport(session, confidence, now = Date.now()) {
  const answers = session.turns.filter(t => t.role === 'user');
  const corrections = session.turns.filter(t => t.correction).map(t => ({ ...t.correction, turn: t.turn }));
  const words = [...new Map(session.turns.filter(t => t.vocabulary).map(t => [t.vocabulary.term.toLowerCase(), t.vocabulary])).values()];
  const scene = scenarios[session.scenario];
  return {
    id: session.id, date: new Date(now).toISOString(), scenario: session.scenario, tutor: session.tutor,
    level: session.level, turnCount: answers.length, spokenTurns: answers.filter(t => t.input === 'speech').length,
    durationSec: Math.max(0, Math.round((now - session.started) / 1000)), confidence: confidence || null,
    corrections, words, pronunciation: null, engine: session.engine,
    task: corrections.length ? 'Try “' + corrections[0].recast + '” in a new example of your own.' :
      (answers.length ? 'Use “' + scene.word[0] + '” in a new example for ' + scene.title.toLowerCase() + '.' : 'Try the opening question and give one detail.'),
    strength: answers.length ? 'You responded to ' + answers.length + (answers.length === 1 ? ' prompt' : ' prompts') + ' in this role-play.' : 'You explored the opening question.'
  };
}
