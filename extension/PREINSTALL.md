Use this extension to generate videos, images, audio, and text using Google's latest Vertex AI models via a simple Realtime Database job pattern.

Create a job node in your Realtime Database with a natural language prompt (AI-Assisted Mode) or structured parameters (Explicit Mode), then subscribe to real-time updates. The extension handles all the complexity of Vertex AI API calls, long-running operations, and file storage.

## Before installing this extension

Before installing this extension, make sure that you've:

1. [Set up a Realtime Database instance](https://firebase.google.com/docs/database) in your Firebase project.
2. [Set up Cloud Storage](https://firebase.google.com/docs/storage) in your Firebase project (for storing generated media files).

## Enable Required APIs

This extension uses multiple Google Cloud APIs. You'll need to enable these for your Google Cloud project:

1. **Vertex AI API** (required) - For AI model access
   - [Enable Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)

2. **Cloud Tasks API** (required) - For async operation polling
   - [Enable Cloud Tasks API](https://console.cloud.google.com/apis/library/cloudtasks.googleapis.com)

3. **Eventarc API** (required) - For Cloud Functions v2 triggers
   - [Enable Eventarc API](https://console.cloud.google.com/apis/library/eventarc.googleapis.com)

**Important:** Your Cloud Functions region and Vertex AI location must match. Most models are available in `us-central1`.

## Billing

To install an extension, your project must be on the [Blaze (pay as you go) plan](https://firebase.google.com/pricing).

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:

- Cloud Functions (Node.js 22 runtime. [See FAQs](https://firebase.google.com/support/faq#extensions-pricing))
- Firebase Realtime Database
- Cloud Storage
- Cloud Tasks (async operation polling)
- Vertex AI API (model usage - video, image, audio, text generation)

Usage of this extension will be billed according to Vertex AI pricing. Different models have different pricing structures (per minute for video, per image, per character for audio, etc.).

## Supported Models

This extension supports **5 AI models** across **3 media types**:

### VIDEO (2 models)
- `veo-3.1-generate-preview` - Highest quality Veo 3.1 (4-8s, 720p/1080p)
- `veo-3.1-fast-generate-preview` - Fast Veo 3.1 with reduced latency (4-8s, 720p/1080p) **[Default]**

### IMAGE (1 model)
- `gemini-2.5-flash-image` - Fast multimodal image generation (sync, instant)

### AUDIO - Text-to-Speech (2 models)
- `gemini-2.5-flash-preview-tts` - Fast text-to-speech via Gemini 2.5 Flash **[Default]**
- `gemini-2.5-pro-preview-tts` - High-quality text-to-speech via Gemini 2.5 Pro

## AI-Assisted vs Explicit Mode

**AI-Assisted Mode** (Recommended)
- Write a simple natural language prompt: `"Create a 4 second sunset video"`
- AI analyzer automatically selects the best model and parameters
- Perfect for rapid prototyping and non-technical users

**Explicit Mode** (Advanced)
- Specify exact model, parameters, and options
- Full control over generation settings
- Required for production workflows and fine-tuning