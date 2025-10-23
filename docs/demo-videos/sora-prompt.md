Let’s design a crisp 12‑second hero video that makes Firebase/Vertex devs get it instantly—and makes everyone else bounce. Below is a tight storyboard, voiceover, captions, sound cues, and a copy‑paste Sora prompt.

creative direction
Audience: Firebase app builders using Realtime Database + Vertex AI.
Style: Clean UI screen-recording + subtle motion graphics. Brand accent: #0ea5e9.
“Self-selecting” language: RTDB path, onValue, Task Queue, Vertex, response.url.
Aha in two lines: push('firegen-jobs', '<prompt>') → onValue(...) → response.url.
12‑second storyboard
0.0–0.5s
Visual: Cold open to a code editor with TypeScript snippet already visible. Cursor blinks on the push(...) line.
On-screen text (top-left, small): AI‑assisted (RTDB)
SFX: Soft key tap.
0.5–2.5s
Visual: Caret selects and lightly pulses the exact line:
push(ref(rtdb, "firegen-jobs"), "Vertical video of a waterfall with ambient sound");
Overlay micro-tag (lower-left): RTDB: /firegen-jobs/{jobId}
Status chip (upper-right of code card): requested
VO: “Write a string to firegen‑jobs.”
SFX: Subtle whoosh-in on highlight.
2.5–6.0s
Visual: Side overlay appears: “AI Request Analyzer” with three quick ticks:
Model: veo‑3.0‑fast‑generate‑001 ✓
Params: duration=8, aspectRatio=9:16, resolution=1080p ✓
Validation: zod ✓
Status chip morphs: running (with light pulse)
VO: “The analyzer picks the right Vertex model and valid params.”
SFX: Light synth click for each ✓.
6.0–9.5s
Visual: Split view slides in: left = code (onValue highlighted); right = player.
Highlight these two lines in code:
onValue(jobRef, (snap) => { … if (job.status === "succeeded") player.src = job.response.url });
RTDB chip updates: succeeded (green dot). Player autoplays a short waterfall clip.
VO: “Subscribe with onValue and stream response.url.”
SFX: Soft “pop” on succeeded; gentle water ambience fades in under music (very low).
9.5–12.0s
Visual: Fade overlays to a clean end card over the split view:
Big: Prompt in → the right model out.
Small: Firebase RTDB + Vertex AI
Tiny CTA: firegen-jobs
VO: “Prompt in. The right model out.”
Music: Tech pulse ends with a soft logo sting.
voiceover script (12s, concise, dev-native)
Line 1 (0.5–2.5s): “Write a string to firegen‑jobs.”
Line 2 (2.5–6.0s): “The analyzer picks the right Vertex model and valid params.”
Line 3 (6.0–9.5s): “Subscribe with onValue and stream response dot url.”
Line 4 (9.5–12.0s): “Prompt in. The right model out.”
Tip: Keep VO paced, assertive, no filler.

on‑screen text and captions
Micro-labels:
AI‑assisted (RTDB)
RTDB: /firegen-jobs/{jobId}
requested → running → succeeded
AI Request Analyzer (Model/Params/Validation ✓)
Code highlights:
push(ref(rtdb, "firegen-jobs"), "<prompt>")
onValue(jobRef, …) and player.src = job.response.url
End card:
Prompt in → the right model out.
Firebase RTDB + Vertex AI
firegen-jobs
music and sfx
Music: Minimal tech pulse, 100–108 BPM, side‑chained duck for VO, no melody.
SFX: single key tap (0.5s), three light “tick/✓” clicks (analyzer), “pop” on succeeded, faint water ambience (7–9s, very low), logo sting (11.8s).
brand tokens
Accent: #0ea5e9 (chips, callouts, highlight caret).
Backgrounds: white/dark to match site theme, high contrast text.
Font: Monospace for code; clean UI for labels.
subtitles (.srt style, optional)
1
00:00:01,000 --> 00:00:02,500
Write a string to firegen‑jobs.

2
00:00:02,500 --> 00:00:06,000
The analyzer picks the right Vertex model and valid params.

3
00:00:06,000 --> 00:00:09,500
Subscribe with onValue and stream response dot url.

4
00:00:09,500 --> 00:00:12,000
Prompt in. The right model out.

reference code (for overlays)
AI‑assisted push line:
push(ref(rtdb, "firegen-jobs"), "Vertical video of a waterfall with ambient sound");
Subscribe line:
onValue(jobRef, (snap) => { const job = snap.val(); if (job?.status === "succeeded") { player.src = job.response.url; } });
Keep code overlays short and readable; it’s okay to elide braces with neat ellipses.

Sora prompt (copy/paste)
Use this to generate a 12‑second 16:9 hero video. If you want a vertical version, change aspect ratio to 9:16 and frame UI tighter.

Title: FireGen — Prompt in → the right model out (12s, 16:9)

Visual style

Clean UI screen recording with subtle motion graphics, brand accent #0ea5e9.
Crisp, readable monospace code with syntax highlighting (TypeScript style).
High-contrast UI; minimal gradients; modern product demo look.
Split view appears mid‑video: left code, right media player preview.
Timing and beats (12 seconds total)

0.0–0.5s: Cut in to a code editor already showing a small TypeScript snippet. Cursor blinks on one line.
On‑screen label top-left: “AI‑assisted (RTDB)”.
0.5–2.5s: Emphasize this exact line by pulsing highlight:
push(ref(rtdb, "firegen-jobs"), "Vertical video of a waterfall with ambient sound");
Show a small chip: “RTDB: /firegen-jobs/{jobId}”. Status chip (top-right of code card): “requested”.
Voiceover: “Write a string to firegen‑jobs.”
SFX: single key tap; soft whoosh on highlight.
2.5–6.0s: Slide in a side overlay titled “AI Request Analyzer” with three items, each animates in with a ✓:
• Model: veo‑3.0‑fast‑generate‑001 ✓
• Params: duration=8, aspectRatio=9:16, resolution=1080p ✓
• Validation: zod ✓
Status changes to “running” with a light pulsing dot.
Voiceover: “The analyzer picks the right Vertex model and valid params.”
SFX: three light tick sounds synced to the ✓.
6.0–9.5s: Reveal a split view (left code, right media player). In code, highlight:
onValue(jobRef, (snap) => { … if (job.status === "succeeded") player.src = job.response.url });
RTDB chip updates to “succeeded” with a green dot. The right media player auto‑plays a short waterfall visual (generic, non‑copyright).
Voiceover: “Subscribe with onValue and stream response dot url.”
SFX: soft pop on “succeeded”; faint water ambience under the music (very low).
9.5–12.0s: Fade to a clean end card over the split view:
Large text: “Prompt in → the right model out.”
Small text: “Firebase RTDB + Vertex AI”
Tiny text: “firegen-jobs”
Voiceover: “Prompt in. The right model out.”
Music: subtle logo sting ending.
Text overlays (render exactly, short, crisp)

“AI‑assisted (RTDB)”
“RTDB: /firegen-jobs/{jobId}”
Status chip values: “requested”, “running”, “succeeded”
“AI Request Analyzer”
“Model: veo‑3.0‑fast‑generate‑001 ✓”
“Params: duration=8, aspectRatio=9:16, resolution=1080p ✓”
“Validation: zod ✓”
End card:
“Prompt in → the right model out.”
“Firebase RTDB + Vertex AI”
“firegen-jobs”
Code styling and content

Monospace font, editor chrome minimal, syntax highlighting like Prism Okaidia.
Show these exact snippets with crisp readability (may elide irrelevant lines with …):
// AI‑assisted mode
import { getDatabase, ref, push, onValue } from "firebase/database";
const rtdb = getDatabase();
const jobRef = push(ref(rtdb, "firegen-jobs"), "Vertical video of a waterfall with ambient sound");
// Subscribe
onValue(jobRef, (snap) => {
const job = snap.val();
if (job?.status === "succeeded") {
player.src = job.response.url;
}
});
Audio

Voiceover: neutral, confident, developer tone; follow the four lines exactly, well paced across the beats.
Music: minimal tech pulse ~100–108 BPM; side‑chain duck under voice; clean ending sting at 11.8s.
SFX: one key tap, three soft ticks, one soft pop; very subtle water ambience between 7–9s.
Framing / camera

Static UI composition with subtle 2D parallax on overlays.
Smooth slide/opacity transitions; no 3D camera moves.
Keep the text and code razor‑sharp and legible on desktop and mobile.
Brand and colors

Accent color #0ea5e9 for highlights, chips, and dots.
Light background; dark mode is optional but ensure high contrast.
Duration and output

Exactly 12 seconds.
16:9, 1920×1080, 24 or 30 fps.
Visually lossless, high bitrate, no watermarks.
End.