# 🚀 Aura — AI-Powered English Learning PWA

What if your phone could turn any TikTok, any conversation, and any mistake into a fluency breakthrough?

Aura is a premium Progressive Web App that reimagines English learning from the ground up. No dry grammar drills, no score-chasing. Instead: immersive AI roleplay, real short-form video content from TikTok/Reels/Shorts analyzed on the fly, and a personalized Skill Tree that evolves around your weaknesses — all wrapped in a native iOS-quality interface.

## 🎭 Core Features

### 1. Persona Studio — AI Roleplay Engine
Forget generic chatbots. Persona Studio lets you choose from dozens of handcrafted AI characters — a **FAANG Tech Lead** drilling you on system design, an **angry American customer**, a **Wall Street negotiator** — each with dynamic prompt slots that adapt to your profession or learning goal. Independent memory branches let you keep separate conversation histories per persona, and a **Wipe Memory** action resets the context for a clean run.

### 2. Educational Engine — Grammar Analysis & Skill Tree
Every message you send is analyzed **in the background** — zero latency impact on the main response. The engine scores your **Vocabulary, Grammar, Fluency**, and estimates your **CEFR level (A1–C2)** in real time. When a systematic weakness is detected (e.g., you consistently misuse Present Perfect), it gets pinned to your **interactive Skill Tree** as an unlockable node — a targeted grammar quest fires up automatically.

### 3. Depth System — Not Just XP
Instead of arbitrary points, Aura tracks **Dive Depth**: a metric that rewards linguistic complexity. Using rare vocabulary, subordinate clauses, or idiomatic expressions pushes your Depth score deeper, unlocking new UI widgets (like the **CEFR Radar**) and level milestones. The more fluent you become, the more the interface itself evolves.

### 4. Multimodal Short-Video Pipeline
Paste any TikTok, YouTube Shorts, or Instagram Reel link directly into the chat. The backend:
- Extracts audio via **yt-dlp**
- Transcribes it with **OpenAI Whisper**
- Has the AI generate a **Note Card** (vocabulary, idioms, cultural context)
- Continues the conversation **about** the video — discussing slang, tone, and real-world usage

### 5. Smart Flashcards with FSRS
An integrated spaced repetition system built on **FSRS** (the next-generation algorithm that outperforms Anki's SM-2). Cards are generated automatically from chat conversations and processed videos. The Bottom NavBar badge shows live **dueCount** — how many cards need review right now.

### 6. Dynamic Quests & Bounties
Daily micro-challenges ("Use 3 past-tense verbs in context") tracked passively by the AI during normal conversations — no separate quiz mode needed. Progress is detected and credited automatically.

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js (App Router), React, TypeScript |
| **UI & Animation** | Tailwind CSS v4, Framer Motion (spring physics, drag gestures, sheet modals), Radix UI |
| **State & Data** | Zustand (global UI state), SWR (optimistic caching + data fetching) |
| **Backend** | Next.js API Routes (Serverless), Prisma ORM, PostgreSQL |
| **AI Engine** | Groq API (ultra-fast SSE streaming), Cerebras (automatic fallback), OpenAI Whisper |
| **Video Pipeline** | yt-dlp-wrap + Whisper for real-time transcription |
| **PWA & Native** | Service Workers, Web Speech API (TTS/STT), Haptics API |

## 🏗️ Architecture Highlights

- **Parallel inference pipeline** — grammar analysis runs as a background LLM call concurrently with the main response stream, so feedback appears without any perceived latency.
- **Multi-provider LLM routing** — Groq handles primary inference for speed; if it fails, requests automatically reroute to Cerebras with graceful degradation.
- **Optimistic UI** — SWR + Zustand keep the interface snappy; local state updates instantly while server sync happens in the background.
- **SSE streaming** — responses stream token-by-token via Server-Sent Events, eliminating the "wait for full response" UX dead zone.
- **Safe Area & keyboard handling** — the Bottom NavBar auto-hides on keyboard open and during Persona Studio, respecting iOS/Android safe area insets precisely.
- **Resilient video transcription** — `yt-dlp` + Whisper pipeline handles format variance across platforms with error boundaries and fallback states.

## 🔮 Coming Next — Aura Feed

The next major feature is a fully personalized, infinitely scrollable **content feed** — built like TikTok, but engineered entirely around your language gaps.

Every card, clip, and micro-lesson is ranked by the AI based on your **active Skill Tree weaknesses** and the topics you care about (tech, sports, culture, memes). It's not random content — it's a **recommendation system with a learning agenda**.

**Engineering challenges this unlocks:**
- **Content embedding pipeline** — tagging each item by topic, grammar patterns, vocabulary tier, and CEFR difficulty.
- **Weakness-aware ranking model** — blending user interest signals with spaced repetition urgency.
- **Cold start handling** — interest profile on day one drives the feed before behavioral data exists.
- **Real-time re-ranking** via WebSockets as new interaction signals arrive mid-session.

*The goal: transform Aura from a learning tool into a learning environment — something you open not out of obligation, but because the feed is genuinely good.*
