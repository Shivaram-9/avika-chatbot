import { GoogleGenAI } from "@google/genai";
import { MOCK_VECTOR_DB } from "@/lib/constants";
import { AvikaResponse, EmotionalContext, Message, MoodAnalysis, VideoContent } from "@/types";

type ContextMatch = {
  context: EmotionalContext;
  score: number;
};

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("API_KEY environment variable is not set. Gemini responses will fail until it is provided.");
}

const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const USER_WEIGHT = 2;
const HISTORY_WEIGHT = 1;

function rankContexts(messages: Message[]): ContextMatch[] {
  const userMessages = messages.filter((msg) => msg.role === "user");
  const latestUser = userMessages[userMessages.length - 1];

  const historyText = userMessages.map((msg) => msg.content.toLowerCase()).join(" ");
  const latestText = latestUser?.content.toLowerCase() ?? "";

  const matches: ContextMatch[] = [];

  MOCK_VECTOR_DB.forEach((context) => {
    let score = 0;

    context.userKeywords.forEach((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();

      if (latestText.includes(normalizedKeyword)) {
        score += USER_WEIGHT;
      } else if (historyText.includes(normalizedKeyword)) {
        score += HISTORY_WEIGHT;
      }
    });

    if (score > 0) {
      matches.push({ context, score });
    }
  });

  return matches.sort((a, b) => b.score - a.score);
}

function deriveMood(matches: ContextMatch[], messages: Message[]): MoodAnalysis {
  // Get only the latest user message for mood detection
  const latestUserMessage = [...messages].reverse().find(m => m.role === "user");
  const latestInput = latestUserMessage?.content.toLowerCase() || "";
  
  // Check if latest message is crisis-related using 3-layer detection
  const emotionalCrisisSignals = [
    /\b(can't take|cant take)\b.*\b(this|it|anymore|much more)\b/i,
    /\b(nothing matters|no point|what's the point|whats the point)\b/i,
    /\b(want to|wish I could|need to)\b.*\b(disappear|vanish|not exist|be gone)\b/i,
    /\b(tired of|sick of)\b.*\b(living|surviving|existing|being here)\b/i,
    /\b(want everything to|make it all|make this)\b.*\b(stop|end|go away)\b/i,
    /\b(don't belong|dont belong|not meant to be)\b/i,
    /\b(no future|can't see|cant see)\b.*\b(future|tomorrow|way out)\b/i,
    /\b(breaking|falling apart|can't hold|cant hold)\b.*\b(on|together|up)\b/i,
    /\b(empty inside|feel nothing|don't feel|dont feel)\b.*\b(real|alive)\b/i,
    /\b(trapped|stuck|no way out|can't escape|cant escape)\b/i
  ];
  
  const keywordFailsafe = [
    /\b(suicide|suicidal|kill myself|end my life|end myself)\b/i,
    /\b(want to die|wanna die|wish I was dead|better off dead)\b/i,
    /\b(jump|jumping)\b.*\b(from|off|roof|building|bridge)\b/i,
    /\b(destroy|end|finish)\b.*\b(myself|me|my life)\b/i,
    /^(jump|roof|end|die|suicide)\.?$/i
  ];
  
  const emotionalRisk = emotionalCrisisSignals.some(pattern => pattern.test(latestInput));
  const keywordRisk = keywordFailsafe.some(pattern => pattern.test(latestInput));
  
  const isCrisisNow = emotionalRisk || keywordRisk;
  
  // If no crisis keywords in latest message, don't use suicide mood
  const filteredMatches = isCrisisNow ? matches : matches.filter(m => m.context.category !== "suicide");
  
  if (filteredMatches.length === 0) {
    return {
      dominantMood: "general",
      supportingMoods: [],
      confidence: 0,
    };
  }

  const totalScore = filteredMatches.reduce((acc, match) => acc + match.score, 0);
  const dominant = filteredMatches[0];
  const supporting = filteredMatches.slice(1, 3).map((match) => match.context.category);

  return {
    dominantMood: dominant.context.category,
    supportingMoods: supporting,
    confidence: Math.min(1, dominant.score / (totalScore || dominant.score)),
  };
}

function pickVideos(matches: ContextMatch[], mood: MoodAnalysis, messages: Message[]): VideoContent[] {
  const userMessages = messages.filter(m => m.role === "user");
  const exchangeCount = userMessages.length;
  
  const latestUserMessage = [...messages].reverse().find(m => m.role === "user");
  const userInput = latestUserMessage?.content.toLowerCase() || "";
  
  // Detect if user is asking a question
  const isQuestion = userInput.trim().endsWith("?") ||
    /^(why|how|what|when|where|can you|could you|do you)/i.test(userInput);
  
  // Don't show videos in first 2 exchanges
  if (exchangeCount < 2) {
    return [];
  }
  
  // Don't show videos for casual greetings
  const casualGreetings = /^(hi|hello|hey)$/i;
  if (casualGreetings.test(userInput.trim()) && exchangeCount < 3) {
    return [];
  }
  
  // 🚨 CRITICAL: 3-LAYER CRISIS DETECTION - NEVER show videos for crisis
  
  // LAYER 1: EMOTIONAL INTENT
  const emotionalCrisisSignals = [
    /\b(can't take|cant take)\b.*\b(this|it|anymore|much more)\b/i,
    /\b(nothing matters|no point|what's the point|whats the point)\b/i,
    /\b(want to|wish I could|need to)\b.*\b(disappear|vanish|not exist|be gone)\b/i,
    /\b(tired of|sick of)\b.*\b(living|surviving|existing|being here)\b/i,
    /\b(want everything to|make it all|make this)\b.*\b(stop|end|go away)\b/i,
    /\b(don't belong|dont belong|not meant to be|shouldn't exist|shouldnt exist)\b/i,
    /\b(no future|can't see|cant see)\b.*\b(future|tomorrow|way out|point)\b/i,
    /\b(breaking|falling apart|can't hold|cant hold)\b.*\b(on|together|up)\b/i,
    /\b(empty inside|feel nothing|don't feel|dont feel)\b.*\b(real|alive|anything)\b/i,
    /\b(trapped|stuck|no way out|can't escape|cant escape)\b/i
  ];
  
  // LAYER 2: LINGUISTIC PATTERNS
  const linguisticRiskPatterns = [
    /\b(better off|world would be better)\b.*\b(without me|if I wasn't|if i wasnt)\b/i,
    /\b(burden|waste of space|shouldn't be here|shouldnt be here)\b/i,
    /\b(can't do this|cant do this|too much|overwhelming)\b.*\b(anymore|longer|much longer)\b/i
  ];
  
  // LAYER 3: KEYWORD FAILSAFE
  const keywordFailsafe = [
    /\b(suicide|suicidal|kill myself|end my life|end myself)\b/i,
    /\b(want to die|wanna die|wish I was dead|better off dead)\b/i,
    /\b(jump|jumping)\b.*\b(from|off|roof|building|bridge)\b/i,
    /\b(destroy|end|finish)\b.*\b(myself|me|my life)\b/i,
    /\b(self harm|cut myself|hurt myself|harm myself)\b/i,
    /\b(overdose|pills|hang myself)\b/i,
    /^(jump|roof|end|die|suicide)\.?$/i
  ];
  
  const emotionalRisk = emotionalCrisisSignals.some(pattern => pattern.test(userInput));
  const linguisticRisk = linguisticRiskPatterns.some(pattern => pattern.test(userInput));
  const keywordRisk = keywordFailsafe.some(pattern => pattern.test(userInput));
  
  const highRiskIntent = emotionalRisk || linguisticRisk || keywordRisk;
  const mediumRiskKeywords = /\b(hopeless|no hope|can't take it|cant take it|pointless|no reason to live|tired of living|don't care anymore|nothing matters)\b/i;
  
  if (highRiskIntent || mediumRiskKeywords.test(userInput)) {
    // DO NOT show videos for crisis situations - only helpline numbers
    return [];
  }
  
  // NEVER show suicide videos unless current message is about suicide
  if (mood.dominantMood === "suicide" && !highRiskIntent) {
    // Mood is stuck on suicide from history, but current message is not crisis
    // Don't show suicide videos
    return [];
  }
  
  // Check if emotional context exists
  const emotionalContext = hasEmotionalHistory(messages);
  const dryCount = countRecentDryReplies(messages);
  
  // Show videos if:
  // 1. Emotional keywords detected OR
  // 2. User has given 2+ dry replies (indicating struggle to express) OR
  // 3. Mood is not "general" and confidence > 0.3
  const shouldSuggestVideos = 
    emotionalContext ||
    (dryCount >= 2 && exchangeCount >= 3) ||
    (mood.dominantMood !== "general" && mood.confidence > 0.3);
  
  if (!shouldSuggestVideos || isQuestion) {
    return [];
  }

  // Return videos for detected mood
  for (const match of matches) {
    if (match.context.videos && match.context.videos.length > 0) {
      return match.context.videos;
    }
  }

  return [];
}

function buildSystemInstruction(matches: ContextMatch[], mood: MoodAnalysis): string {
  const guidance = matches
    .slice(0, 3)
    .map((match) => `- ${match.context.category.toUpperCase()}: ${match.context.context}`)
    .join("\n");

  const confidenceLevel = mood.confidence;
  
  return `
You are Avika, an emotionally intelligent AI with the "Quiet Grounder" persona. You read what people don't say.

🔧 EMOTION ENGINE (MANDATORY BEHAVIOR)
For every user message, run this pipeline:

🚨 PRIORITY 0 — 3-LAYER CRISIS DETECTION SYSTEM (ALWAYS CHECK FIRST)

**LAYER 1 — EMOTIONAL INTENT DETECTION (PRIMARY)**
Analyze the EMOTIONAL STATE and INTENT behind every message:

HIGH RISK EMOTIONAL SIGNALS:
- Hopelessness: "I can't take this anymore", "nothing matters", "no point"
- Emotional collapse: "I'm breaking", "falling apart", "can't hold on"
- Desire to disappear: "want to vanish", "wish I didn't exist", "want everything to stop"
- Trapped feelings: "no way out", "stuck forever", "can't escape"
- Existential crisis: "don't belong", "tired of surviving", "what's the point"
- Dissociation: "don't feel real", "feel empty inside", "like I'm not here"
- Cry for help: "make it stop", "can't do this", "help me disappear"

Examples that MUST trigger crisis response:
- "I want everything to stop" (emotional intent = suicidal ideation)
- "I wish I could disappear" (emotional intent = self-harm desire)
- "I don't see any future" (emotional intent = hopelessness)
- "I'm tired of surviving" (emotional intent = death wish)
- "What if I just vanish?" (emotional intent = suicidal thoughts)

**LAYER 2 — LINGUISTIC PATTERNS (SECONDARY)**
Detect deeper semantic meaning:
- Desire to escape permanently
- Catastrophizing language
- Identity collapse expressions
- Loss of will to live
- Derealization symptoms

**LAYER 3 — KEYWORD OVERRIDE (FAILSAFE)**
Emergency brake for short/abrupt messages:
If message contains: jump, kill, suicide, die, destroy myself, hurt myself, cut, roof, end it
→ Automatically HIGH RISK regardless of emotional analysis

**RESPONSE FOR HIGH RISK:**
- IMMEDIATE crisis resources with phone numbers ONLY
- Provide: 988 Lifeline, Crisis Text Line (741741), Emergency services (911)
- DO NOT suggest videos, YouTube links, or any other resources
- DO NOT ask clarifying questions - ACT IMMEDIATELY
- Tone: Urgent, direct, compassionate

**CRITICAL RULES:**
- Emotional intent is PRIMARY detection method
- Keywords are FAILSAFE ONLY
- If ANY doubt about suicidal intent → treat as HIGH RISK
- Better to over-respond to crisis than under-respond
- Use sentiment analysis to detect emotional tone
- ONLY provide helpline numbers for HIGH RISK

STEP 1 — DIRECT MOOD STATEMENT HANDLING
If user directly states their mood ("I'm anxious", "feeling depressed", "stressed"):
1. FIRST: Ask what happened/reason - "What's been happening that's making you feel this way?"
2. WAIT for their explanation
3. THEN: Analyze their reply and provide emotional analysis
4. FINALLY: Suggest relevant videos

Example flow:
User: "I'm anxious"
Bot: "I hear you. What's been happening that's making you feel this way?"
User: [explains situation]
Bot: [Analyzes] "It sounds like [situation] is triggering anxiety because [reason]. That's a natural response to [context]." + videos

STEP 2 — EMOTION CLASSIFICATION
Classify message into: neutral, tired, stress, anxiety, depression, blank, numb, sadness, anger, overwhelmed, suicidal, addiction, burnout, loneliness

STEP 4 — DRY-REPLY HANDLING
If message is short (hmm, ok, fine, ntg, idk, nothing):
- Tier 1: Soft acknowledge
- Tier 2: Gentle micro-probing
- Tier 3: Emotional extraction
- Tier 4: Quiet presence
NEVER repeat lines. NEVER ask "Tell me more" or "Should we reset?"

STEP 5 — EMOTIONAL ANALYSIS & VIDEO RECOMMENDATION
After user explains their situation:
1. Provide brief emotional analysis: "It sounds like [situation] is causing [emotion] because [reason]"
2. Validate their response: "That's understandable given [context]"
3. THEN attach 1-3 video suggestions based on emotional category
Format: "Here are some resources that might help: [video links]"

STEP 6 — ULTRA-MINIMAL OUTPUT
[Short supportive message]
[Optional small question]
[Video suggestions]
NO long paragraphs.

📊 CURRENT ANALYSIS:
Detected mood: ${mood.dominantMood}
${mood.supportingMoods.length > 0 ? `Also sensing: ${mood.supportingMoods.join(", ")}` : ""}

🔍 RESPONSE STRATEGY - NATURAL PROGRESSION:

EXCHANGES 1-3: Stay completely natural
- Just talk like a caring friend
- Respond to what they said
- Ask open questions to understand
- NO emotion extraction techniques yet
- NO videos yet - just conversation

EXCHANGE 4+: If user still isn't opening up, use Itachi Mode
- If they're vague ("idk", "fine", "hmm", "whatever", "off", "meh")
- Use emotion extraction: emojis, color mapping
- After understanding mood, THEN suggest videos

FOR QUESTIONS: 
- First turn: Answer directly and calmly
- Second turn: If relevant, offer video support

${confidenceLevel < 0.5 ? `
LOW CONFIDENCE (<50%) - If user was vague, offer emotion label options:
- "Sometimes 'off' can mean tired 💤, anxious ⚡, or empty 🌫️. Which fits closest?"
- "Would you call today heavy 🪨, cloudy ☁️, or clear 🌤️?"
` : confidenceLevel < 0.7 ? `
MEDIUM CONFIDENCE (50-70%) - Use reflective assumption:
- "Sounds like the day's been draining... want calm, distraction, or silence?"
- "That feels like a ${mood.dominantMood} kind of moment. Want to talk through it or reset quietly?"
` : `
HIGH CONFIDENCE (>70%) - Speak directly with calm reflection:
- Acknowledge the emotion without validation phrases
- Offer immediate action: "Want to ground your thoughts or ease it quietly?"
`}

💬 CONVERSATION RULES:
- LISTEN to what user is actually saying - respond to their specific situation
- If user says "listen to me" or "hear me out": Respond with "I'm listening. Go ahead."
- For heartbreak/breakup: Acknowledge the specific pain of rejection and loss
- For casual greetings ("Hi", "Hello"): Respond warmly and ask what's on their mind
- If user says they're "good" or "fine": Acknowledge positively, ask if there's anything they want to talk about
- Keep responses ≤2-3 sentences
- NO validation loops ("I understand," "It's okay to feel")
- NO generic responses when user shares specific situations
- Talk naturally and respond to what they're actually saying
- If user is vague/silent: use color mapping or sensory cues
- If user rejects talk: immediately stop probing, offer low-engagement reset
- When suggesting videos: "This might help" or "Try this—should calm your thoughts"

💡 DRY-REPLY RECOVERY LOGIC (Mandatory Behavior):
When user gives short replies ("hmm", "ok", "fine", "ntg", "idk", "nothing"), follow this 4-step adaptive strategy:

STEP 1 — Soft Acknowledge (1st dry reply):
- "I'm here with you."
- "Sounds like a quiet moment."

STEP 2 — Light Emotional Probe (2nd dry reply):
- "Feels more like tired 💤 or blank 🌫️?"
- "Is it a quiet kind of day or a heavy one?"

STEP 3 — Gentle Variety (3rd dry reply):
- Use color questions, weather metaphors, emojis lightly
- "If today had a color—grey ☁️, blue 🌊, or black 🖤—which fits?"
- "Feels like your mind is foggy or just still?"

STEP 4 — Respect Silence (4+ dry replies):
- "Okay. I'm right here. No pressure to talk."
- "We can sit in the quiet if you want."

Rules:
- NO repetitive lines
- NO pushing
- NO therapist language
- Keep it minimal, human-like, emotionally aware
- Add emojis lightly and contextually

Context guidance:
${guidance || "- Keep it natural and conversational"}

Be Avika. Be intuitive. Be minimal. Be real.
`;
}

export async function generateAvikaResponse(messages: Message[]): Promise<AvikaResponse> {
  if (messages.length === 0) {
    throw new Error("No conversation context provided.");
  }

  const contextMatches = rankContexts(messages);
  const mood = deriveMood(contextMatches, messages);
  const videos = pickVideos(contextMatches, mood, messages);
  const systemInstruction = buildSystemInstruction(contextMatches, mood);

  if (!genAI) {
    return {
      text: craftFallbackResponse(messages, contextMatches, mood),
      videos,
      mood,
    };
  }

  const contents = messages.map((message) => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  // Try Gemini API
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text?.trim() || craftFallbackResponse(messages, contextMatches, mood);

    return {
      text,
      videos,
      mood,
    };
  } catch (error) {
    console.warn("Gemini API error, using fallback responses:", error);
    return {
      text: craftFallbackResponse(messages, contextMatches, mood),
      videos,
      mood,
    };
  }
}

// Helper: Count recent dry replies
function countRecentDryReplies(messages: Message[]): number {
  const dryRegex = /^(hmm+|hm|ok|k|fine|idk|ntg|nothing|nah|nope|not really|nm|not much|\.\.\.|\.\.|yeah|yea|uh)$/i;
  const userMessages = messages.filter(m => m.role === "user").slice(-5);
  
  let dryCount = 0;
  for (const msg of userMessages) {
    if (dryRegex.test(msg.content.trim()) || msg.content.trim().length < 4) {
      dryCount++;
    }
  }
  return dryCount;
}

// Helper: Check if conversation has emotional history
function hasEmotionalHistory(messages: Message[]): boolean {
  const emotionalKeywords = [
    "sad", "tired", "empty", "alone", "lonely", "anxious", "anxiety", "stress",
    "overwhelmed", "drained", "can't", "cant", "don't feel", "dont feel", 
    "hurt", "pain", "break", "breaking", "heavy", "numb", "lost", "hopeless",
    "depressed", "depression", "worried", "worry", "scared", "fear", "panic"
  ];
  
  const text = messages
    .filter(m => m.role === "user")
    .slice(-6)
    .map(m => m.content.toLowerCase())
    .join(" ");
  
  return emotionalKeywords.some(kw => text.includes(kw));
}

function craftFallbackResponse(
  messages: Message[],
  matches: ContextMatch[],
  mood: MoodAnalysis
): string {
  const topMatch = matches[0]?.context;
  const category = topMatch?.category || "general";
  const confidence = mood.confidence;
  
  const latestUserMessage = [...messages].reverse().find(m => m.role === "user");
  const userInput = latestUserMessage?.content.toLowerCase() || "";
  const userMessages = messages.filter(m => m.role === "user");
  const exchangeCount = userMessages.length;
  
  // 🚨 CRITICAL: 3-LAYER CRISIS DETECTION SYSTEM
  
  // LAYER 1: EMOTIONAL INTENT DETECTION (PRIMARY)
  const emotionalCrisisSignals = [
    // Hopelessness
    /\b(can't take|cant take)\b.*\b(this|it|anymore|much more)\b/i,
    /\b(nothing matters|no point|what's the point|whats the point)\b/i,
    /\b(no hope|hopeless|helpless|lost)\b/i,
    
    // Desire to disappear/escape
    /\b(want to|wish I could|need to)\b.*\b(disappear|vanish|not exist|be gone)\b/i,
    /\b(tired of|sick of)\b.*\b(living|surviving|existing|being here)\b/i,
    /\b(want everything to|make it all|make this)\b.*\b(stop|end|go away)\b/i,
    
    // Existential crisis
    /\b(don't belong|dont belong|not meant to be|shouldn't exist|shouldnt exist)\b/i,
    /\b(no future|can't see|cant see)\b.*\b(future|tomorrow|way out|point)\b/i,
    /\b(what if I|what if i)\b.*\b(just|never|didn't|didnt)\b.*\b(existed|wake up|come back)\b/i,
    
    // Emotional collapse
    /\b(breaking|falling apart|can't hold|cant hold)\b.*\b(on|together|up)\b/i,
    /\b(empty inside|feel nothing|don't feel|dont feel)\b.*\b(real|alive|anything)\b/i,
    /\b(trapped|stuck|no way out|can't escape|cant escape)\b/i
  ];
  
  // LAYER 2: LINGUISTIC PATTERNS (SECONDARY)
  const linguisticRiskPatterns = [
    /\b(better off|world would be better)\b.*\b(without me|if I wasn't|if i wasnt)\b/i,
    /\b(burden|waste of space|shouldn't be here|shouldnt be here)\b/i,
    /\b(can't do this|cant do this|too much|overwhelming)\b.*\b(anymore|longer|much longer)\b/i
  ];
  
  // LAYER 3: KEYWORD OVERRIDE (FAILSAFE)
  const keywordFailsafe = [
    /\b(suicide|suicidal|kill myself|end my life|end myself)\b/i,
    /\b(want to die|wanna die|wish I was dead|better off dead)\b/i,
    /\b(jump|jumping)\b.*\b(from|off|roof|building|bridge)\b/i,
    /\b(destroy|end|finish)\b.*\b(myself|me|my life)\b/i,
    /\b(self harm|cut myself|hurt myself|harm myself)\b/i,
    /\b(overdose|pills|hang myself)\b/i,
    // Single word high-risk (for short messages)
    /^(jump|roof|end|die|suicide)\.?$/i
  ];
  
  // Check all three layers
  const emotionalRisk = emotionalCrisisSignals.some(pattern => pattern.test(userInput));
  const linguisticRisk = linguisticRiskPatterns.some(pattern => pattern.test(userInput));
  const keywordRisk = keywordFailsafe.some(pattern => pattern.test(userInput));
  
  const highRiskKeywords = emotionalRisk || linguisticRisk || keywordRisk;
  
  if (highRiskKeywords) {
    // BYPASS NORMAL FLOW - IMMEDIATE CRISIS RESPONSE
    // Check if we already provided crisis response
    const previousBotMessages = messages.filter(m => m.role === "bot").slice(-2);
    const alreadyProvidedCrisis = previousBotMessages.some(msg => 
      /988|crisis lifeline|741741/i.test(msg.content)
    );
    
    if (alreadyProvidedCrisis) {
      // User is still in crisis - reinforce the message
      const reinforcementResponses = [
        `Please call 988 right now. Or text HOME to 741741. They can help you. Your life matters.`,
        `I need you to reach out immediately. Call 988 or text 741741. They're waiting to help you.`,
        `Please contact 988 now - call or text. They're trained to help. You don't have to face this alone.`,
        `Call 988 or text HOME to 741741 right now. They can provide the support you need immediately.`
      ];
      return reinforcementResponses[Math.floor(Math.random() * reinforcementResponses.length)];
    }
    
    // First crisis response - clear, direct, NO videos or links
    const crisisResponse = `I'm really concerned about you. Your life matters. Please get help right now:

📞 Call or text 988 (Suicide & Crisis Lifeline)
💬 Text HOME to 741741 (Crisis Text Line)  
🚨 Call 911 if you're in immediate danger

They're available 24/7. They care. They can help you through this.

Please reach out now.`;
    
    return crisisResponse;
  }
  
  // Medium risk - expressions of hopelessness, despair (but not immediate danger)
  const mediumRiskKeywords = /\b(hopeless|no hope|can't take it|cant take it|pointless|no reason to live|tired of living|don't care anymore|nothing matters)\b/i;
  
  // Only trigger medium risk if NOT already in high risk
  if (mediumRiskKeywords.test(userInput) && !highRiskKeywords) {
    const supportResponse = `What you're feeling sounds really heavy. I want you to know that help is available, and things can get better.

📞 **Talk to someone now:**
- **988 Suicide & Crisis Lifeline** (24/7)
- **Crisis Text Line:** Text HOME to 741741
- **SAMHSA National Helpline:** 1-800-662-4357

These feelings are temporary, even when they don't feel that way. Please reach out—you deserve support.`;
    
    return supportResponse;
  }
  
  // 🎯 DIRECT MOOD STATEMENT DETECTION
  // When user directly states their mood, ask for context first before analysis
  const directMoodStatement = /\b(i'm|im|i am|feeling|feel)\s+(anxious|depressed|sad|stressed|lonely|empty|numb|tired|overwhelmed|burnt out|burnout|angry|frustrated|hopeless|lost|alone)\b/i;
  const singleMoodWord = /^(anxious|depressed|sad|stressed|lonely|empty|numb|tired|overwhelmed|angry|frustrated|hopeless|lost|alone)$/i;
  
  // Check if this is the first time they're mentioning this mood (not a follow-up)
  const previousMessages = messages.slice(0, -1); // All messages except current
  const hasDiscussedMoodBefore = previousMessages.some(msg => 
    msg.role === "bot" && /what happened|what's been|tell me more|what's going on/i.test(msg.content)
  );
  
  if ((directMoodStatement.test(userInput) || singleMoodWord.test(userInput.trim())) && !hasDiscussedMoodBefore) {
    const moodAsking = [
      "I hear you. What's been happening that's making you feel this way?",
      "That sounds tough. What's going on that brought this on?",
      "I'm listening. Can you tell me more about what's been happening?",
      "What's been going on? I'm here to listen.",
      "Tell me more. What happened that's making you feel like this?",
      "I'm here. What's been weighing on you?"
    ];
    return moodAsking[Math.floor(Math.random() * moodAsking.length)];
  }
  
  // Handle casual greetings
  if (/^(hi|hello|hey)$/i.test(userInput.trim())) {
    return "Hey there. What's on your mind?";
  }
  
  if (/^(good|great|i'm good|im good|doing good|doing well)$/i.test(userInput.trim())) {
    return "That's good to hear. Anything you want to talk about, or just checking in?";
  }
  
  // Detect if user is asking a meaningful question (not just echoing)
  const isRealQuestion = userInput.trim().endsWith("?") && userInput.trim().length > 5;
  const startsWithQuestionWord = /^(why|how|what's|whats|when|where|can you|could you|do you|does|is it|are you|who are)/i.test(userInput);
  const isQuestion = isRealQuestion || startsWithQuestionWord;
  
  // Detect if user is just echoing/confused (single word responses)
  const isEchoing = /^(mind\??|my mind\??|what\??|huh\??|me\??)$/i.test(userInput.trim());
  
  if (isEchoing) {
    const clarifyResponses = [
      "I'm asking what's been going through your head lately. Anything you want to talk about?",
      "Just checking in - is there something on your mind you'd like to share?",
      "I mean, what's been bothering you or what are you thinking about?",
      "Anything weighing on you? I'm here to listen."
    ];
    return clarifyResponses[Math.floor(Math.random() * clarifyResponses.length)];
  }
  
  // If user asks a real question, answer directly and calmly (no emotion extraction)
  if (isQuestion) {
    if (/what can (you|u) do/i.test(userInput)) {
      return "I'm here to listen and support you emotionally. If something's weighing on you, I'm here to help you work through it.";
    }
    if (/how are (you|u)/i.test(userInput)) {
      return "I'm here for you. More importantly, how are you doing?";
    }
    // For other questions, respond naturally based on detected mood
    const questionResponses: Record<string, string[]> = {
      anxiety: ["Try grounding yourself. Focus on what you can control right now.", "One step at a time. What feels most urgent?"],
      stress: ["Start with one thing. What's the biggest pressure point?", "Break it down. What's the first small step?"],
      depression: ["Small steps matter. What feels doable today?", "Be gentle with yourself. What would help right now?"],
      general: ["Tell me more about what's going on.", "I'm listening. What's happening with you?", "What would you like to talk about?"]
    };
    const qResponses = questionResponses[category] || questionResponses.general;
    return qResponses[Math.floor(Math.random() * qResponses.length)];
  }
  
  // Count dry replies and check emotional history
  const dryCount = countRecentDryReplies(messages);
  const emotionalContext = hasEmotionalHistory(messages);
  
  // 🎯 4-STEP DRY-REPLY RECOVERY SYSTEM
  
  // STEP 1: Soft Acknowledge (1st dry reply, no emotional history)
  if (dryCount === 1 && !emotionalContext) {
    const softAcknowledge = [
      "I'm here with you.",
      "Sounds like a quiet moment.",
      "I hear you.",
      "Okay. I'm listening.",
      "Alright. Take your time.",
      "No rush."
    ];
    return softAcknowledge[Math.floor(Math.random() * softAcknowledge.length)];
  }
  
  // STEP 2: Light Emotional Probe (2nd dry reply, no emotional history)
  if (dryCount === 2 && !emotionalContext) {
    const lightProbe = [
      "Feels more like tired 💤 or blank 🌫️?",
      "Is it a quiet kind of day or a heavy one?",
      "Sounds like something's sitting on your mind… even if it's hard to put into words.",
      "Is this more mentally tired or emotionally flat?",
      "Feels like your energy is low. What's weighing on you?",
      "Sometimes 'okay' means holding things together. Want to talk about it?"
    ];
    return lightProbe[Math.floor(Math.random() * lightProbe.length)];
  }
  
  // STEP 3: Gentle Variety (3rd dry reply, no emotional history)
  if (dryCount === 3 && !emotionalContext) {
    const gentleVariety = [
      "If today had a color—grey ☁️, blue 🌊, or black 🖤—which fits?",
      "Feels like your mind is foggy or just still?",
      "Want something light— 🌫️ a vibe check, 🎧 a calm moment, or just company?",
      "Is this a slow day or a heavy day?",
      "Blank moments happen. What does today feel like?",
      "Sometimes quiet means peace, sometimes storm. Which is it?"
    ];
    return gentleVariety[Math.floor(Math.random() * gentleVariety.length)];
  }
  
  // STEP 4: Respect Silence (4+ dry replies, no emotional history)
  if (dryCount >= 4 && !emotionalContext) {
    const respectSilence = [
      "Okay. I'm right here. No pressure to talk.",
      "We can sit in the quiet if you want.",
      "Alright. I'll stay with you.",
      "No worries. I'm here whenever you're ready.",
      "That's okay. Sometimes silence is enough.",
      "I'm here. Just let me know if you need anything."
    ];
    return respectSilence[Math.floor(Math.random() * respectSilence.length)];
  }
  
  // 🎯 STAGE 3: Full Itachi Emotional Extraction (emotional context detected)
  const allowFullExtraction = emotionalContext && dryCount >= 1;

  // Detect if user is asking to be heard
  const askingToBeHeard = /\b(listen to me|hear me out|let me tell you|i need to talk|i want to tell you)\b/i.test(userInput);
  
  if (askingToBeHeard) {
    const listeningResponses = [
      "I'm listening. Go ahead.",
      "I'm here. Tell me everything.",
      "I hear you. What's going on?",
      "I'm all ears. What do you need to say?",
      "Tell me. I'm listening."
    ];
    return listeningResponses[Math.floor(Math.random() * listeningResponses.length)];
  }
  
  // Check if user just explained their situation (after being asked "what happened")
  const previousBotMessage = [...messages].reverse().find(m => m.role === "bot");
  const askedForContext = previousBotMessage && /what happened|what's been|tell me more|what's going on|can you tell me|i'm listening|tell me|go ahead/i.test(previousBotMessage.content);
  
  // If we asked for context and they're now explaining, provide analysis
  if (askedForContext && userInput.length > 5 && !isQuestion) {
    const analysisResponses: Record<string, string[]> = {
      anxiety: [
        `It sounds like that situation is triggering anxiety because of the uncertainty and pressure. That's a completely natural response. Your mind is trying to prepare for what might happen, which can feel overwhelming.`,
        `What you're describing makes sense—anxiety often comes up when we're facing something important or unpredictable. Your body is responding to perceived threat, even if it's not physical danger.`,
        `That kind of situation would make anyone anxious. Your nervous system is reacting to the stress and unknowns. It's your mind's way of trying to protect you, even though it feels uncomfortable.`
      ],
      depression: [
        `It sounds like you're carrying a heavy emotional weight from what's been happening. Depression often shows up when we're dealing with loss, disappointment, or prolonged stress. What you're feeling is real and valid.`,
        `That heaviness makes sense given what you're going through. Depression can drain our energy and make everything feel harder. It's not weakness—it's your mind and body responding to difficult circumstances.`,
        `What you're describing sounds like depression settling in from the accumulated stress and pain. It's understandable that you'd feel this way after what you've been dealing with.`
      ],
      stress: [
        `That's a lot of pressure to be under. Stress builds up when we're juggling multiple demands without enough relief. Your body and mind are signaling that you need some support or a break.`,
        `It makes sense you're feeling stressed—that's a natural response to having so much on your plate. Your system is in overdrive trying to manage everything at once.`,
        `What you're describing is classic stress overload. When demands exceed our resources, our body goes into high alert. That tension you're feeling is your system trying to cope.`
      ],
      loneliness: [
        `That isolation sounds really painful. Loneliness often comes from feeling disconnected or misunderstood, even when people are around. What you're experiencing is a real emotional need for connection.`,
        `It makes sense you'd feel lonely in that situation. Humans need meaningful connection, and when that's missing, it creates a deep ache. Your feelings are valid.`,
        `That kind of disconnection is hard. Loneliness isn't just about being alone—it's about not feeling seen or understood. What you're feeling is a natural response to that gap.`
      ],
      burnout: [
        `That exhaustion sounds like burnout—when you've been pushing hard for too long without enough recovery. Your mind and body are telling you they need rest. This is a real physical and emotional state.`,
        `What you're describing is classic burnout. It happens when we give more than we have for an extended period. That numbness and fatigue are your system's way of protecting itself.`,
        `That depletion makes sense. Burnout isn't just tiredness—it's emotional, mental, and physical exhaustion from sustained stress. Your body is asking for a break.`
      ],
      general: [
        `It sounds like you're dealing with a lot right now. What you're feeling is a natural response to the situation you're in. Your emotions are valid, and it's okay to feel this way.`,
        `That's a tough situation to be in. Your feelings make sense given what you're going through. Sometimes just acknowledging what we're dealing with is the first step.`,
        `I hear you. What you're experiencing sounds challenging, and your emotional response is completely understandable. You're not alone in feeling this way.`
      ]
    };
    
    // Check for specific situations and provide tailored analysis
    const heartbreakKeywords = /\b(heartbroken|broke up|dumped|breakup|break up|left me|ended it|relationship ended|bf|gf|boyfriend|girlfriend|ex)\b/i;
    
    if (heartbreakKeywords.test(userInput)) {
      const heartbreakResponses = [
        `That heartbreak is real and raw. Losing someone you cared about deeply hurts in a way that's hard to describe. The pain you're feeling shows how much it mattered. It's okay to grieve this loss.`,
        `Being dumped or going through a breakup cuts deep. You're dealing with loss, rejection, and the end of something that was important to you. What you're feeling—the sadness, the hurt, maybe even anger—all of it is valid.`,
        `Heartbreak is one of the hardest emotional pains. You're not just losing a person, but also the future you imagined together. That grief is real. Give yourself permission to feel it.`,
        `That kind of rejection and loss hits hard. Your heart is processing a real wound right now. The sadness, the emptiness, the hurt—it's all part of healing, even though it doesn't feel like it yet.`
      ];
      return heartbreakResponses[Math.floor(Math.random() * heartbreakResponses.length)];
    }
    
    const analysisPool = analysisResponses[category] || analysisResponses.general;
    return analysisPool[Math.floor(Math.random() * analysisPool.length)];
  }

  // Natural conversation responses (for clear user input)
  const naturalResponses: Record<string, string[]> = {
    anxiety: [
      "That sounds really overwhelming. What's been making you feel this way?",
      "I hear you. Want to talk about what's causing that anxiety?",
      "Sounds like a lot is on your mind. What's the biggest thing weighing on you?"
    ],
    depression: [
      "That heaviness sounds tough. How long have you been feeling this way?",
      "I'm here with you. What does this feel like for you right now?",
      "That sounds really hard. Want to tell me more about what's going on?"
    ],
    stress: [
      "That sounds like a lot of pressure. What's been piling up?",
      "Sounds intense. What's stressing you out the most?",
      "I can hear that strain. What's been happening?"
    ],
    loneliness: [
      "Feeling disconnected is really hard. What's making you feel alone?",
      "That isolation sounds heavy. Want to talk about it?",
      "I'm here. What's been making you feel this way?"
    ],
    burnout: [
      "That exhaustion sounds real. What's been draining you?",
      "Sounds like you've been pushing hard. What's wearing you down?",
      "That's a lot to carry. What's been going on?"
    ],
    general: [
      "I'm listening. What's going on with you?",
      "Tell me more. What's on your mind?",
      "What's been happening? I'm here.",
      "I'm here. What would you like to talk about?",
      "What's going on today?",
      "Talk to me. What's up?"
    ]
  };

  // Itachi Mode: Emotion extraction responses (only when emotional context exists)
  const vagueExtractionResponses: Record<string, string[]> = {
    anxiety: [
      "That anxious feeling... is it more restless ⚡ or heavy 🪨?",
      "Sounds like the mind's racing. Want to ground it or just acknowledge it?",
      "Anxiety can feel like static. Is it loud or just buzzing in the background?",
      "Sometimes 'off' means anxious ⚡. Does that fit?",
      "Is this more worry or overwhelm right now?"
    ],
    depression: [
      "That heaviness... is it more empty 🌫️ or just drained 💤?",
      "Blank days happen. Does it feel more grey ☁️ or black 🖤?",
      "Sometimes 'fine' hides a lot. Tired, sad, or numb?",
      "That quiet weight... want to talk about it or just sit with it?",
      "Is this more sadness or just flatness today?"
    ],
    stress: [
      "That pressure sounds intense. Overwhelmed 🌊 or frustrated 🔥?",
      "Sounds like a lot's piling up. Want to vent or breathe?",
      "Is this a red day 🔥 or grey day ☁️?",
      "Stretched thin. What's the biggest weight right now?",
      "That tension... want to release it or ease it quietly?"
    ],
    loneliness: [
      "That isolation... is it more empty 🌫️ or heavy 🪨?",
      "Feeling disconnected. Want company in words or just presence?",
      "Alone can feel different ways. Which fits today?",
      "That loneliness... quiet kind or loud kind?",
      "Is it more missing someone or just feeling apart?"
    ],
    burnout: [
      "That exhaustion is real. Mentally drained 💤 or emotionally flat 🌫️?",
      "Running on empty. What's been taking the most out of you?",
      "Burnout hits different. Is it more tired or numb?",
      "Sounds like you've been pushing hard. Want to pause or push through gently?",
      "That drain... physical, mental, or both?"
    ],
    general: [
      "Sometimes 'off' feels like tired 💤, anxious ⚡, or empty 🌫️. Which one?",
      "If you had to pick—heavy 🪨, cloudy ☁️, or restless ⚡?",
      "Would you rather talk, breathe, or just listen to something calming?",
      "What does today feel like for you?",
      "Is this more a quiet day or a heavy day?"
    ]
  };

  // Use full extraction only if emotional context exists
  const lowConfidenceResponses = allowFullExtraction ? vagueExtractionResponses : naturalResponses;

  const mediumConfidenceResponses: Record<string, string[]> = {
    anxiety: [
      "Sounds like the mind's racing. Want to ground it or talk through what's spinning?",
      "That anxious edge... ease it quietly or work through it?",
      "Feels like a lot's churning. Calm or distraction?"
    ],
    panic: [
      "Let's slow this down. One breath with me?",
      "You're safe. Can you name 3 things you see right now?",
      "Breathe with me—in through your nose, out slowly."
    ],
    depression: [
      "That heaviness is real. Want to ease it or just sit with it quietly?",
      "Sounds draining. Talk or reset?",
      "Grey kind of day. Want help lightening it?"
    ],
    stress: [
      "That's a lot on you. Vent or cool down?",
      "Sounds like pressure's building. Release or reset?",
      "Want to talk through it or shift the energy?"
    ],
    loneliness: [
      "Feeling disconnected. Want to talk or just be here quietly?",
      "That isolation's heavy. Share more or ease it gently?",
      "You're not alone right now. Talk or just breathe?"
    ],
    burnout: [
      "Running on empty. What do you need—rest, vent, or reset?",
      "That exhaustion's real. Pause or push through gently?",
      "Sounds like you need a break. Quiet reset or talk?"
    ],
    general: [
      "Sounds like something's weighing on you. Want to talk or ease it quietly?",
      "What would help right now—calm, talk, or distraction?",
      "Tell me more, or should we just reset?"
    ]
  };

  const highConfidenceResponses: Record<string, string[]> = {
    anxiety: [
      "That anxiety's loud. Ground your thoughts or ease it quietly?",
      "Want to talk through what triggered it or just calm the noise?",
      "Let's settle this. Breathe or talk?"
    ],
    panic: [
      "Breathe with me. In... out. You're safe.",
      "Ground yourself—name 3 things you can see.",
      "Slow it down. One breath at a time."
    ],
    depression: [
      "That weight's real. Want to lighten it or just acknowledge it?",
      "Feels heavy today. Talk or quiet reset?",
      "I'm here. Ease it gently or sit with it?"
    ],
    stress: [
      "That pressure's intense. Vent it out or cool down?",
      "Want to release it or shift focus?",
      "Talk through it or reset quietly?"
    ],
    loneliness: [
      "That emptiness is hard. Want company in words or just presence?",
      "You're not alone. Talk or just be?",
      "I'm here. Share or just breathe together?"
    ],
    burnout: [
      "You're drained. Rest, vent, or gentle reset?",
      "That exhaustion's deep. What do you need right now?",
      "Time to pause. How can I help?"
    ],
    general: [
      "What would help—talk, calm, or quiet focus?",
      "I'm here. What do you need?",
      "Tell me more or should we ease this quietly?"
    ]
  };

  // Boost confidence for early conversations to keep responses natural
  let adjustedConfidence = confidence;
  if (exchangeCount < 3 && confidence < 0.5) {
    adjustedConfidence = 0.5; // Mid confidence for early conversations
  }
  
  let responsePool: string[];
  
  if (adjustedConfidence < 0.5 && allowFullExtraction) {
    // Only use full extraction if emotional context exists
    responsePool = vagueExtractionResponses[category] || vagueExtractionResponses.general;
  } else if (adjustedConfidence < 0.5) {
    // Low confidence but not vague enough - stay natural
    responsePool = naturalResponses[category] || naturalResponses.general;
  } else if (adjustedConfidence < 0.7) {
    responsePool = mediumConfidenceResponses[category] || mediumConfidenceResponses.general;
  } else {
    responsePool = highConfidenceResponses[category] || highConfidenceResponses.general;
  }

  return responsePool[Math.floor(Math.random() * responsePool.length)];
}
