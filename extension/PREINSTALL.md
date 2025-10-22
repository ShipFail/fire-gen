Use this extension to generate videos using Google's Veo models via a simple Realtime Database job pattern.

Create a job node in your Realtime Database with a prompt and video parameters, then subscribe to real-time updates. The extension handles all the complexity of Veo API calls, long-running operations, and file storage.

## Before installing this extension

Before installing this extension, make sure that you've:

1. [Set up a Realtime Database instance](https://firebase.google.com/docs/database) in your Firebase project.
2. [Set up Cloud Storage](https://firebase.google.com/docs/storage) in your Firebase project (for storing generated videos).

## Enable the Vertex AI API

This extension uses the Vertex AI API to generate videos with Veo models. You'll need to enable this API for your Google Cloud project:

1. Go to the [Vertex AI API page](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) in the Google Cloud Console.
2. Select your Google Cloud project.
3. Click **Enable**.

## Billing

To install an extension, your project must be on the [Blaze (pay as you go) plan](https://firebase.google.com/pricing).

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:

- Cloud Functions (Node.js 22 runtime. [See FAQs](https://firebase.google.com/support/faq#extensions-pricing))
- Firebase Realtime Database
- Cloud Storage
- Vertex AI API (video generation usage)

Usage of this extension will be billed according to Vertex AI pricing for video generation. Veo models have specific pricing per minute of generated video content.

## Supported Veo Models

This extension supports the following Veo models:

- `veo-3.0-generate-001` - Latest Veo 3 model with highest quality
- `veo-3.0-fast-generate-001` - Faster Veo 3 model with reduced latency  
- `veo-2.0-generate-001` - Previous generation Veo 2 model

All models support:
- Video durations: 1-8 seconds
- Aspect ratios: 16:9 and 9:16
- Resolutions: 720p and 1080p
- Optional audio generation