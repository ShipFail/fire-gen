## Version 0.1.0

Initial release of the _Veo Video Generator_ extension.

**Features:**
- Realtime Database job pattern for video generation
- Support for Veo 3.0, Veo 3.0 Fast, and Veo 2.0 models
- Automatic handling of long-running operations with exponential backoff
- Direct integration with Cloud Storage for video output
- Comprehensive error handling and job lifecycle management
- Real-time status updates via Firebase Realtime Database

**Supported Models:**
- `veo-3.0-generate-001` - Highest quality Veo 3 model
- `veo-3.0-fast-generate-001` - Faster Veo 3 model with reduced latency
- `veo-2.0-generate-001` - Previous generation Veo 2 model

**Technical Specifications:**
- Node.js 22 runtime
- TypeScript implementation with strict type checking
- Firebase Functions v2 with RTDB onCreate triggers
- Automatic video storage in project's Cloud Storage bucket
- 90-minute TTL for job expiration
- Exponential backoff polling (5s to 60s maximum)

**Documentation:**
- Complete installation and usage guides
- AI agent guidance for Firebase Studio and Claude Code
- React/Next.js integration examples
- Comprehensive error handling patterns