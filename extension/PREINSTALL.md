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

This extension supports **14 AI models** across **4 media types**:

### VIDEO (3 models)
- `veo-3.0-generate-001` - Highest quality Veo 3 model (1-8s, 720p/1080p)
- `veo-3.0-fast-generate-001` - Faster Veo 3 with reduced latency (1-8s, 720p/1080p)
- `veo-2.0-generate-001` - Previous generation Veo 2 model (1-8s, 720p/1080p)

### IMAGE (4 models)
- `imagen-4.0-ultra-generate-001` - Highest quality Imagen 4 (1024×1024 to 2048×2048)
- `imagen-4.0-generate-001` - Balanced quality Imagen 4 (1024×1024 to 2048×2048)
- `imagen-4.0-fast-generate-001` - Fast Imagen 4 generation (1024×1024 to 2048×2048)
- `nano-banana` - Ultra-fast image generation (512×512)

### AUDIO (5 models)
- `gemini-2.5-flash-preview-tts` - Fast text-to-speech via Gemini 2.5 Flash
- `gemini-2.5-pro-preview-tts` - High-quality text-to-speech via Gemini 2.5 Pro
- `chirp-3-hd` - HD speech-to-text transcription (Chirp 3)
- `chirp` - Standard speech-to-text transcription
- `lyria-002` - Music generation (10-20s clips, sync mode)

### TEXT (2 models)
- `gemini-2.5-pro` - Advanced reasoning and long-form text generation
- `gemini-2.5-flash` - Fast text generation with balanced quality

## AI-Assisted vs Explicit Mode

**AI-Assisted Mode** (Recommended)
- Write a simple natural language prompt: `"Create a 4 second sunset video"`
- AI analyzer automatically selects the best model and parameters
- Perfect for rapid prototyping and non-technical users

**Explicit Mode** (Advanced)
- Specify exact model, parameters, and options
- Full control over generation settings
- Required for production workflows and fine-tuning