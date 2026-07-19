// Side-effect module: initializes telemetry before the app and its
// instrumented libraries load. Must be imported first in index.ts.
import { initTelemetry, resolveTelemetryConfig } from "./lib/telemetry.js"
import { getVersionInfo } from "./lib/version.js"

initTelemetry(resolveTelemetryConfig(process.env, getVersionInfo().version))
