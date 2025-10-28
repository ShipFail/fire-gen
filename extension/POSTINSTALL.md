### See it in action

You can test out this extension right away!

1. Go to your [Realtime Database dashboard](https://console.firebase.google.com/project/${param:PROJECT_ID}/database/${param:PROJECT_ID}/data) in the Firebase console.

2. Navigate to the path `firegen-jobs` and create a new child node.

**AI-Assisted Mode** (Recommended - Just write what you want!)

```json
"Create a 4 second sunset video with gentle waves"
```

**Explicit Mode** (Advanced - Full control over parameters)

```json
{
  "uid": "user-123",
  "status": "requested",
  "request": {
    "type": "video",
    "model": "veo-3.1-fast-generate-preview",
    "prompt": "a cat playing with a ball in a sunny garden",
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "resolution": "720p",
    "generateAudio": true
  }
}
```

3. Watch the node update in real-time as it processes:
   - `status` changes from `"requested"` → `"running"` → `"succeeded"`
   - When complete, a `response` field appears with `url` and `uri`

4. Access your generated media:
   - `response.url` - Signed URL (valid for 24 hours, use immediately)
   - `response.uri` - GCS URI (`gs://...` for backend operations)
   - ⚠️ **Files are automatically deleted after 24 hours**

### Using the extension

This extension provides two ways to generate media:

#### AI-Assisted Mode (Natural Language)

The simplest way - just write what you want as a string:

```javascript
import { getDatabase, ref, push } from "firebase/database";

const db = getDatabase();

// Just write your request in plain English!
await push(ref(db, "firegen-jobs"), 
  "Create a neon city at night with flying cars"
);
```

The AI analyzer will:
- Determine the best model (video, image, audio, or text)
- Set optimal parameters automatically
- Add reasoning to `_meta.reasons` field for transparency

#### Explicit Mode (Structured Parameters)

For production workflows with precise control:

```javascript
```javascript
const db = getDatabase();

// Video generation
const videoJob = await push(ref(db, "firegen-jobs"), {
  uid: "user-123",
  status: "requested",
  request: {
    type: "video",
    model: "veo-3.1-generate-preview",
    prompt: "a serene mountain landscape at dawn",
    durationSeconds: 8,
    aspectRatio: "16:9",
    resolution: "1080p",
    generateAudio: true
  }
});

// Image generation
const imageJob = await push(ref(db, "firegen-jobs"), {
  uid: "user-123",
  status: "requested",
  request: {
    type: "image",
    model: "gemini-2.5-flash-image",
    prompt: "a futuristic robot in a cyberpunk city",
    aspectRatio: "1:1"
  }
});
```

// Audio generation (Text-to-Speech)
const audioJob = await push(ref(db, "firegen-jobs"), {
  uid: "user-123",
  status: "requested",
  request: {
    type: "audio",
    model: "gemini-2.5-flash-preview-tts",
    text: "Hello world! This is text-to-speech generation.",
    voiceName: "Puck"
  }
});
```

#### Listening for results

```javascript
import { onValue } from "firebase/database";

onValue(jobRef, (snapshot) => {
  const job = snapshot.val();
  
  if (job.status === "succeeded") {
    // For video/image/audio
    if (job.response.url) {
      console.log("Media ready:", job.response.url);
      console.log("GCS URI:", job.response.uri);
      // ⚠️ Download within 24 hours - files auto-delete
    }
    
    // For text generation
    if (job.response.text) {
      console.log("Generated text:", job.response.text);
    }
    
    // AI-Assisted mode reasoning
    if (job._meta?.reasons) {
      console.log("AI analysis:", job._meta.reasons);
    }
  } else if (job.status === "failed") {
    console.error("Generation failed:", job.response?.error?.message);
  } else if (job.status === "expired") {
    console.warn("Job timed out after 90 minutes");
  }
});
```

### Supported models and parameters

#### VIDEO (Veo 3.1 models)
**Models:** `veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`

**Parameters:**
- `prompt` (required) - Text description of the video
- `durationSeconds` (optional) - Length: 4, 6, or 8 seconds (default: 8)
- `aspectRatio` (optional) - `"16:9"`, `"9:16"`, or `"1:1"` (default: `"16:9"`)
- `resolution` (optional) - `"720p"` or `"1080p"` (default: `"1080p"`)
- `generateAudio` (optional) - Include audio (default: `true`)

#### IMAGE (Gemini Flash Image)
**Models:** `gemini-2.5-flash-image`

**Parameters:**
- `prompt` (required) - Text description of the image
- `aspectRatio` (optional) - `"1:1"`, `"2:3"`, `"3:2"`, `"9:16"`, `"16:9"`, `"3:4"`, `"4:3"` (default: `"1:1"`)

#### AUDIO (Text-to-Speech)
**Models:** `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`

**Parameters:**
- `text` (required) - Text to convert to speech
- `voiceName` (optional) - Voice: `"Puck"`, `"Charon"`, `"Kore"`, `"Fenrir"`, `"Aoede"` (default: `"Puck"`)

### Job lifecycle

1. **requested** - Job created, waiting to be processed
2. **starting** - Job accepted, initialization in progress
3. **running** - Generation in progress (video may take 30-120 seconds)
4. **succeeded** - Generation complete, check `response.url` or `response.text`
5. **failed** - Generation failed, check `response.error.message`
6. **expired** - Job timed out after 90 minutes

### Response structure

**For media files (video/image/audio):**
```json
{
  "status": "succeeded",
  "response": {
    "url": "https://storage.googleapis.com/...?Expires=...",
    "uri": "gs://bucket/firegen-jobs/abc123/video-veo-3.1-fast-generate-preview.mp4"
  },
  "_meta": {
    "reasons": ["AI analysis step 1", "AI analysis step 2"]
  }
}
```

**For text generation:**
```json
{
  "status": "succeeded",
  "response": {
    "text": "Generated text content here..."
  }
}
```

**Important notes:**
- ⚠️ **Files are deleted after 24 hours** - Download immediately
- 🔗 **Signed URLs expire after 24 hours** - Use within validity period
- 🔒 **User-scoped jobs** - Set `uid` to match authenticated user for security

### Security rules

Protect your jobs with Realtime Database rules:

```json
{
  "rules": {
    "firegen-jobs": {
      "$jobId": {
        ".read": "auth != null && (data.child('uid').val() === auth.uid || !data.exists())",
        ".write": "auth != null && (!data.exists() || data.child('uid').val() === auth.uid)"
      }
    }
  }
}
```

This ensures users can only:
- Create jobs with their own `uid`
- Read/write their own jobs
- Prevent unauthorized access

This ensures users can only:
- Create jobs with their own `uid`
- Read/write their own jobs
- Prevent unauthorized access

### Troubleshooting

#### Cloud Tasks Permission Error (Legacy Installations)

**Note:** This issue should be automatically resolved in FireGen v0.1.0+ with proper v2 function configuration. If you're using an older version or experiencing this error, follow the steps below.

If you see this error in the Cloud Functions logs:

```
The principal (user or service account) lacks IAM permission "cloudtasks.tasks.create" 
for the resource "projects/PROJECT_ID/locations/REGION/queues/onFiregenJobPoll"
```

**Root Cause:** The extension service account lacks the Cloud Tasks Enqueuer role. This should be automatically granted during installation, but may fail in some cases.

**Solution:** Grant the Cloud Tasks Enqueuer role to the extension service account:

1. Find your extension service account:
   - Go to [Cloud Functions Console](https://console.cloud.google.com/functions/list)
   - Click on the `ext-firegen-onJobCreated` function
   - Note the service account (usually `ext-firegen@PROJECT_ID.iam.gserviceaccount.com`)

2. Grant Cloud Tasks permissions via gcloud CLI:

```bash
# Replace with your actual values
PROJECT_ID="your-project-id"
SERVICE_ACCOUNT="ext-firegen@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant Cloud Tasks Enqueuer role
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudtasks.enqueuer"
```

3. Alternatively, grant via Cloud Console:
   - Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam)
   - Find the service account `ext-firegen@PROJECT_ID.iam.gserviceaccount.com`
   - Click "Edit" (pencil icon)
   - Click "Add Another Role"
   - Select "Cloud Tasks Enqueuer"
   - Click "Save"

4. Wait 1-2 minutes for IAM changes to propagate, then try your job again.

**Prevention:** If reinstalling the extension, ensure you're using FireGen v0.1.0 or later, which uses Cloud Functions v2 with proper IAM role binding.

### Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
