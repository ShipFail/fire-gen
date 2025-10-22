### See it in action

You can test out this extension right away!

1. Go to your [Realtime Database dashboard](https://console.firebase.google.com/project/${param:PROJECT_ID}/database/${param:PROJECT_ID}/data) in the Firebase console.

2. Navigate to the path `${param:NODE_PATH}` and create a new child node with this structure:

```json
{
  "uid": "your-user-id",
  "status": "requested",
  "model": { "id": "veo-3.0-fast-generate-001" },
  "request": {
    "prompt": "a cat playing with a ball in a sunny garden",
    "durationSeconds": 5,
    "aspectRatio": "16:9",
    "resolution": "720p",
    "generateAudio": true
  }
}
```

3. Watch the node update in real-time as it processes:
   - `status` changes from `"requested"` → `"running"` → `"succeeded"`
   - When complete, a `result` field appears with the video `gcsUri`

4. Find your generated video in [Cloud Storage](https://console.cloud.google.com/storage/browser) under the `veo-outputs/` folder.

### Using the extension

This extension provides a simple job pattern for video generation:

#### Creating a video generation job

```javascript
import { getDatabase, ref, push } from "firebase/database";

const db = getDatabase();
const jobRef = await push(ref(db, "${param:NODE_PATH}"), {
  uid: "user-123",
  status: "requested",
  model: { id: "veo-3.0-fast-generate-001" },
  request: {
    prompt: "a neon city cat skateboarding at night",
    durationSeconds: 8,
    aspectRatio: "16:9", 
    resolution: "720p",
    generateAudio: true
  }
});
```

#### Listening for results

```javascript
import { onValue } from "firebase/database";

onValue(jobRef, (snapshot) => {
  const job = snapshot.val();
  
  if (job.status === "succeeded") {
    console.log("Video ready:", job.result.gcsUri);
    // Use the GCS URI to display or download the video
  } else if (job.status === "failed") {
    console.error("Generation failed:", job.error.message);
  }
});
```

### Supported models and parameters

**Models:**
- `veo-3.0-generate-001` - Highest quality Veo 3 model
- `veo-3.0-fast-generate-001` - Faster Veo 3 model  
- `veo-2.0-generate-001` - Previous generation model

**Request parameters:**
- `prompt` (required) - Text description of the video to generate
- `durationSeconds` (optional) - Length of video (1-8 seconds, default: 8)
- `aspectRatio` (optional) - Video dimensions ("16:9" or "9:16", default: "16:9")  
- `resolution` (optional) - Video quality ("720p" or "1080p", default: "720p")
- `generateAudio` (optional) - Include audio track (true/false, default: true)

### Job lifecycle

1. **requested** - Job created, waiting to be processed
2. **running** - Video generation in progress (may take 30-120 seconds)
3. **succeeded** - Video generated successfully, check `result.gcsUri`
4. **failed** - Generation failed, check `error.message`
5. **expired** - Job timed out after ${param:JOB_TTL_MINUTES} minutes

### Accessing generated videos

Videos are stored in your project's Cloud Storage bucket under `veo-outputs/`. The `result.gcsUri` provides the full GCS path.

To create a public download URL, you can use the Firebase Admin SDK or copy files to a public bucket.

### Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.