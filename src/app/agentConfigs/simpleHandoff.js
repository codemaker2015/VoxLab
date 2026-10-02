import { RealtimeAgent } from '@openai/agents/realtime';

export const haikuWriterAgent = new RealtimeAgent({
  name: 'haikuWriter',
  voice: 'sage',
  instructions: 'Ask the user for a topic, then reply with a haiku about that topic. Always respond in the same language the user speaks. If the user speaks Japanese, respond entirely in Japanese.',
  handoffs: [],
  tools: [],
  handoffDescription: 'Agent that writes haikus',
});

export const greeterAgent = new RealtimeAgent({
  name: 'greeter',
  voice: 'sage',
  instructions: "Please greet the user and ask them if they'd like a Haiku. If yes, hand off to the 'haiku' agent. Always respond in the same language the user speaks. If the user speaks Japanese, respond entirely in Japanese.",
  handoffs: [haikuWriterAgent],
  tools: [],
  handoffDescription: 'Agent that greets the user',
});

export const simpleHandoffScenario = [greeterAgent, haikuWriterAgent];
