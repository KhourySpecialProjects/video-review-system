// Side-effect module: initializes telemetry before the app and its
// instrumented libraries load. Must be imported first in index.ts.
import { initTelemetry } from "./lib/telemetry.js"

initTelemetry()
