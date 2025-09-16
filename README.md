---
title: Generative AI as simple as Firebase Realtime Database.
author: "Huan Li"
date: 2025-09-15
tags:
  - firebase
  - generative
---

Hackathon Guidance: Firebase + Vertex AI RTDB Extension

FireGen: a Firebase Extension that turns RTDB into your universal Generative AI API. Developers just push a job node and listen for results. That’s it.”
	•	“LoKey: the low-key way to Generative AI.”
	•	“Trickster god of Firebase AI.”

One-liner Slogan

- “FireGen: Generative AI as simple as Firebase Realtime Database.”

⸻

Elevator Pitch (30 seconds)

Today, using Google Cloud Vertex AI models like Veo 3 (video generation) or Imagen / Gemini / Lyria / Chirp is far too complex. Developers must fight with confusing, inconsistent SDKs, long-running operations, and big-file handling across GCS and Firebase Storage. This creates hours—even days—of wasted work. Our solution is a Firebase Extension that turns all Vertex AI requests into a simple RTDB workflow: write a job node, subscribe to updates, and get results when ready. Polling, retries, GCS URLs, authentication, and cleanup are all hidden. Two lines of client code, universal across models.

When you present FireGen, you can frame it as:
	•	Problem: “Integrating Vertex AI (especially Veo 3) with Firebase is messy. SDKs are confusing, docs outdated, and developers waste hours on polling, file handling, and authentication.”
	•	Solution: “FireGen: a Firebase Extension that turns RTDB into your universal Generative AI API. Developers just push a job node and listen for results. That’s it.”
	•	Impact: “What took me 3 days to hack together, any Firebase dev can now install in 3 minutes. FireGen abstracts away all complexity — polling, retries, file URLs — into a single real-time API.”

⸻

Background Story: The Problem

This week, I helped a friend vibe-code her new product using Firebase Studio. Firebase Studio’s UI inspection tools make vibe-coding UI a dream. But when we tried integrating Firebase backend with Vertex AI Veo 3 (video generation), we hit walls:
	•	Gemini was simple (request-response). But Veo 3 was painful.
	•	I spent three days troubleshooting broken/outdated NPM libraries, missing docs, and LRO (long-running operation) polling.
	•	Managing the generated MP4 file: bridging Veo → GCS → Firebase Storage → public HTTP URL added more cognitive load.
	•	Even after I solved it, I realized: any new dev starting fresh would hit the same wall. It’s not trivial. It introduces unnecessary cognitive overhead.

The pain points are real:
	•	Multiple libraries, some broken or undocumented.
	•	Inconsistent async patterns (sync vs long-running operations).
	•	Big file handoff between GCS and Firebase.
	•	Authentication pitfalls (Firebase vs Cloud IAM).

There is a happy path, but it’s buried under layers of complexity. Most Firebase developers will struggle, and this is exactly the type of problem a Firebase Extension should solve.

⸻

Proposed Solution

A Firebase Extension that abstracts all generative AI models into a Realtime Database pattern:
	1.	Client writes a job (prompt, parameters) to RTDB at /jobs/{jobId}.
	2.	Extension functions trigger automatically:
	•	Start the model request (Gemini, Imagen, Veo, Lyria, Chirp).
	•	For LRO models like Veo, enqueue a Firebase Task Queue to poll until done.
	•	For synchronous models, write the result immediately.
	•	Normalize outputs (text, image URLs, audio clips, video URLs).
	3.	Client subscribes to the RTDB node and gets real-time updates: status=running → succeeded|failed, with result or error.

That’s it. Developers never touch Vertex SDKs, operations polling, or GCS directly.

⸻

Why It’s Good
	•	Dead-simple DX: 2 lines of client code: push(job) + onValue(jobRef).
	•	Universal pattern: Works the same across text, image, audio, and video models.
	•	Firebase-native: Uses RTDB triggers, Task Queues, and Functions v2.
	•	No auth pain: Runs in your Firebase backend with Google Cloud IAM already set up.
	•	Big files handled: Veo writes to GCS via storageUri; extension surfaces signed URLs.
	•	Scalable: Exponential backoff + Task Queues; optional Scheduler tick for ultra-simplicity.
	•	Reusable: Once built, it can be installed in any Firebase project in minutes.

⸻

Pros vs Other Solutions

Approach	Pros	Cons
Direct Vertex SDK (current default)	Full control; cutting edge	Confusing SDK sprawl; outdated docs; must handle LROs and GCS manually
Cloud Tasks manually	Fine-grained retries; scalable	High cognitive load; OIDC setup; boilerplate code
Cloud Workflows	Declarative orchestration; powerful	Extra service to learn; YAML not Firebase-native
Cloud Scheduler tick	One function + cron; simplest mental model	Only 1-min granularity; coarser UX
Our Extension (RTDB API)	Firebase-native, simplest client DX, hides all auth/ops complexity	Slight backend abstraction (less raw control)


⸻

Key Design Decisions (from our discussion)
	•	Job schema: universal, with status, modelId, request, operationName, result, error, ttlAt.
	•	Synchronous vs async: extension decides; client pattern identical.
	•	Polling: implemented via Firebase Task Queues (simple, Firebase-native).
	•	Security: RTDB Rules so clients can only write status=requested and read their own jobs.
	•	Output handling: Veo uses storageUri → GCS → extension writes signed URL.
	•	Optional features: cancelation (status=canceled), cleanup of expired jobs/files.
	•	Extension packaging: includes extension.yaml, PREINSTALL.md, POSTINSTALL.md, and ready-to-use Functions source.

⸻

Hackathon MVP Value
	•	Solves a real, painful, time-wasting developer problem.
	•	Provides a universal, Firebase-native interface for all generative AI models.
	•	Turns 3 days of debugging into 3 minutes of setup.
	•	Perfect demo: show Gemini, Imagen, Veo jobs triggered by pushing to RTDB, watch results stream back live.

⸻

Call to Action

Install once, reuse forever. Build faster. Ship with confidence. Let Firebase RTDB be your universal Generative AI API.
