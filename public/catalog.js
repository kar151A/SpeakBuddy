export const tutors = {
  mira: { name: 'Mira', description: 'Warm & encouraging', detail: 'A patient partner for finding your words and trying a sentence again.', age: 'Young adult', gender: 'Woman', accent: 'en-IN' },
  jay: { name: 'Jay', description: 'Thoughtful & focused', detail: 'A calm partner who asks for examples and helps you build a clear point.', age: 'Mature adult', gender: 'Man', accent: 'en-GB' }
};

export const scenarios = {
  interview: {
    title: 'Job interview', category: 'Career', art: 'interview', mins: 5,
    goal: 'Introduce yourself and back up one strength with an example.',
    role: 'a hiring manager at a first-round interview',
    opening: 'Welcome to the interview. Tell me a little about yourself and the kind of work you enjoy.',
    questions: ['Which project are you proud of?', 'What did you personally do on that project?', 'What changed because of your work?', 'How would you explain that result to a new teammate?'],
    starter: 'One project I enjoyed was…', word: ['contribution', 'the part you personally added', 'My contribution was testing the design.']
  },
  daily: {
    title: 'Daily conversation', category: 'Everyday', art: 'daily', mins: 5,
    goal: 'Tell a short story and keep a casual conversation going.',
    role: 'a friend meeting the learner for coffee',
    opening: 'It’s good to see you. What’s one thing that happened in your day?',
    questions: ['Who were you with?', 'What happened next?', 'What did you enjoy about it?', 'What would you like to do tomorrow?'],
    starter: 'Something that happened today was…', word: ['catch up', 'share recent news with someone', 'Let’s catch up over coffee.']
  },
  airport: {
    title: 'Airport travel', category: 'Travel', art: 'airport', mins: 5,
    goal: 'Ask for directions and confirm a flight detail.',
    role: 'an airline desk agent at a fictional airport',
    opening: 'Hello from the check-in desk. Where are you flying today?',
    questions: ['Do you have luggage to check in?', 'How would you ask where your gate is?', 'What would you ask if your flight were delayed?', 'Could you repeat your boarding details?'],
    starter: 'Excuse me, could you tell me…', word: ['boarding pass', 'the document you show to get on a flight', 'Could I see your boarding pass?']
  },
  presentation: {
    title: 'College presentation', category: 'Campus', art: 'presentation', mins: 6,
    goal: 'Open your presentation and explain one idea clearly.',
    role: 'a classmate listening to a college presentation',
    opening: 'The class is ready. How would you introduce your topic?',
    questions: ['Why does this topic matter to the class?', 'Could you give us a simple example?', 'What question might someone in the audience ask?', 'What is the one idea we should remember?'],
    starter: 'Today I’d like to show you…', word: ['illustrate', 'make an idea clear with an example', 'Let me illustrate this with a story.']
  },
  doctor: {
    title: 'Doctor visit', category: 'Everyday', art: 'doctor', mins: 5,
    goal: 'Use a fictional appointment to practise describing a concern.',
    role: 'a receptionist at a fictional clinic, practising appointment language only',
    opening: 'Let’s role-play a clinic reception. Using made-up details, how would you ask for an appointment?',
    questions: ['What time would you prefer?', 'How would you ask the receptionist to repeat the time?', 'How would you politely change the booking?', 'Could you confirm your appointment?'],
    starter: 'I’d like to book an appointment for…', word: ['availability', 'times when a person is free', 'Do you have any availability on Tuesday?']
  },
  support: {
    title: 'Customer support', category: 'Career', art: 'support', mins: 5,
    goal: 'Explain a fictional problem and ask for the next step.',
    role: 'a support agent following up on a fictional delayed order',
    opening: 'Thanks for calling. What seems to have happened with your order?',
    questions: ['When did you first notice the issue?', 'What result are you hoping for?', 'How would you ask for a follow-up?', 'Could you repeat what we agreed?'],
    starter: 'I’m calling because my order…', word: ['replacement', 'an item supplied in place of another', 'Could you send a replacement?']
  },
  group: {
    title: 'Group discussion', category: 'Campus', art: 'group', mins: 7,
    goal: 'Share an opinion, build on a point and disagree politely.',
    role: 'one discussion partner representing a study group',
    opening: 'Our group is discussing online classes. What is one advantage you see?',
    questions: ['Can you give an example?', 'How would you invite a quieter member to speak?', 'How might you politely disagree?', 'Can you summarise both views?'],
    starter: 'I see your point, and I’d add…', word: ['perspective', 'a way of seeing an issue', 'I can see it from your perspective.']
  }
};

export const levels = ['Beginner', 'Intermediate', 'Advanced'];
export const languages = ['English only', 'Kannada', 'Hindi', 'Tamil'];
export const accents = { 'en-IN': 'Indian English', 'en-GB': 'British English', 'en-US': 'American English' };
export const defaults = {
  name: '', level: 'Beginner', bridge: 'English only', tutor: 'mira', scenario: 'daily',
  speed: 0.9, accent: 'en-IN', personality: 'Encouraging', voice: '', captions: true,
  sound: true, reduceMotion: false, corrections: 'During practice', remember: false,
  adult: false, engine: 'guided', micConsent: false, goal: 3
};
