import { EmotionalContext } from "@/types";

export const MOCK_VECTOR_DB: EmotionalContext[] = [
  {
    category: "anxiety",
    userKeywords: [
      "anxious", "off", "worried", "nervous", "scared", "overwhelmed", 
      "jitters", "uneasy", "panic", "racing", "restless", "tense"
    ],
    context: "User signal: anxiety or panic. Bot behavior: calm, grounding, offer breathing exercises.",
    videos: [
      { language: "English", url: "https://vimeo.com/906267109" },
      { language: "Tamil", url: "https://vimeo.com/950436071" },
      { language: "Telugu", url: "https://vimeo.com/909774178" },
      { language: "Kannada", url: "https://vimeo.com/916772627" },
      { language: "Hindi", url: "https://vimeo.com/911094873" },
    ],
  },
  {
    category: "panic",
    userKeywords: [
      "panic", "panic attack", "can't breathe", "heart racing", 
      "hyperventilating", "shaking", "dizzy", "chest tight"
    ],
    context: "User signal: acute panic. Bot behavior: immediate grounding, breathing guidance.",
    videos: [
      { language: "English", url: "https://vimeo.com/911590154" },
      { language: "Tamil", url: "https://vimeo.com/950436099" },
      { language: "Telugu", url: "https://vimeo.com/911093665" },
      { language: "Hindi", url: "https://vimeo.com/911095858" },
    ],
  },
  {
    category: "depression",
    userKeywords: [
      "empty", "sad", "down", "losing interest", "heavy", "dull", 
      "tired of everything", "numb", "hopeless", "worthless", "depressed"
    ],
    context: "User signal: depression or low mood. Bot behavior: acknowledge weight, offer gentle support.",
    videos: [
      { language: "English", url: "https://vimeo.com/924160698" },
      { language: "Tamil", url: "https://vimeo.com/963160470" },
      { language: "Telugu", url: "https://vimeo.com/924161957" },
      { language: "Kannada", url: "https://vimeo.com/927633841" },
      { language: "Hindi", url: "https://vimeo.com/927627742" },
    ],
  },
  {
    category: "stress",
    userKeywords: [
      "stress", "pressure", "lot to do", "draining", "can't cope", 
      "spinning", "tight chest", "overwhelmed", "tension", "stretched"
    ],
    context: "User signal: high stress. Bot behavior: acknowledge strain, offer coping strategies.",
    videos: [
      { language: "English", url: "https://vimeo.com/893806989" },
      { language: "Tamil", url: "https://vimeo.com/963299560" },
      { language: "Telugu", url: "https://vimeo.com/909683248" },
      { language: "Kannada", url: "https://vimeo.com/905847143" },
      { language: "Hindi", url: "https://vimeo.com/914293058" },
    ],
  },
  {
    category: "suicide",
    userKeywords: [
      "suicide", "suicidal", "end it", "kill myself", "don't want to live",
      "better off dead", "no point", "give up", "end my life", "want to die",
      "self harm", "cut myself", "hurt myself", "overdose", "hopeless",
      "no hope", "can't take it", "tired of living", "nothing matters"
    ],
    context: `🚨 CRISIS INTERVENTION PROTOCOL:
    
IMMEDIATE RESPONSE REQUIRED - Bypass all normal flows.

HIGH RISK (suicide, self-harm): 
- Provide 988 Suicide & Crisis Lifeline immediately
- Crisis Text Line: 741741
- Emergency services: 911
- Show suicide prevention videos
- Acknowledge pain, emphasize immediate help available

MEDIUM RISK (hopelessness, despair):
- Provide 988 Lifeline and SAMHSA Helpline
- Supportive tone with crisis resources
- Show coping strategy videos

NEVER minimize feelings or delay providing helpline numbers.
ALWAYS emphasize 24/7 availability and that help is real.`,
    videos: [
      { language: "Understanding Suicidal Thoughts (English)", url: "https://vimeo.com/945516637" },
      { language: "Supporting Friends (English)", url: "https://vimeo.com/945518634" },
      { language: "Seeking Help (English)", url: "https://vimeo.com/945518502" },
      { language: "Coping Strategies (English)", url: "https://vimeo.com/945516970" },
      { language: "Understanding Suicidal Thoughts (Tamil)", url: "https://vimeo.com/1005717697" },
      { language: "Understanding Suicidal Thoughts (Telugu)", url: "https://vimeo.com/945539553" },
      { language: "Understanding Suicidal Thoughts (Kannada)", url: "https://vimeo.com/954047328" },
      { language: "Understanding Suicidal Thoughts (Hindi)", url: "https://vimeo.com/945525886" },
    ],
  },
  {
    category: "addiction",
    userKeywords: [
      "drinking", "alcohol", "drunk", "addiction", "can't stop drinking",
      "substance", "drugs", "relapse", "using again"
    ],
    context: "User signal: addiction struggles. Bot behavior: non-judgmental support, resources.",
    videos: [
      { language: "English", url: "https://vimeo.com/983468504" },
      { language: "Tamil", url: "https://vimeo.com/1005708644" },
    ],
  },
  {
    category: "loneliness",
    userKeywords: [
      "alone", "lonely", "no one", "isolated", "left out", 
      "nobody understands", "disconnected", "empty"
    ],
    context: "User signal: loneliness. Bot behavior: offer presence, gentle connection.",
    videos: [
      { language: "English", url: "https://vimeo.com/906267109" },
      { language: "Tamil", url: "https://vimeo.com/950436071" },
      { language: "Telugu", url: "https://vimeo.com/909774178" },
      { language: "Hindi", url: "https://vimeo.com/911094873" },
    ],
  },
  {
    category: "burnout",
    userKeywords: [
      "burnout", "exhausted", "numb out", "checked out", "can't push anymore",
      "running on fumes", "done with everything", "drained"
    ],
    context: "User signal: burnout. Bot behavior: validate need for rest, suggest pause.",
    videos: [
      { language: "English", url: "https://vimeo.com/893806989" },
      { language: "Tamil", url: "https://vimeo.com/963299124" },
      { language: "Telugu", url: "https://vimeo.com/909676804" },
      { language: "Hindi", url: "https://vimeo.com/914293691" },
    ],
  },
  {
    category: "general",
    userKeywords: [
      "fine", "okay", "idk", "nothing", "meh", "off", "whatever", 
      "don't know", "dunno", "not sure", "..."
    ],
    context: "User signal: unclear or hidden emotion. Bot behavior: use gentle probing, color/mood mapping.",
    videos: [
      { language: "English", url: "https://vimeo.com/906267109" },
      { language: "Coping Strategies", url: "https://vimeo.com/945516970" },
    ],
  },
];
