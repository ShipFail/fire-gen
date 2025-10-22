// functions/src/models/chirp/index.ts

export * from "./chirp-3-hd.js";
export * from "./chirp.js";
export {CHIRP_AI_HINTS} from "./ai-hints.js";

import Chirp3HDAdapter, {CHIRP_3_HD_CONFIG} from "./chirp-3-hd.js";
import ChirpSTTAdapter, {CHIRP_CONFIG} from "./chirp.js";

export const CHIRP_MODELS = {
  "chirp-3-hd": {
    adapter: Chirp3HDAdapter,
    config: CHIRP_3_HD_CONFIG,
  },
  "chirp": {
    adapter: ChirpSTTAdapter,
    config: CHIRP_CONFIG,
  },
} as const;
