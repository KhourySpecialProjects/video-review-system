// Side-effect module: initializes telemetry before the app and its
// instrumented libraries load. Must be imported first in index.ts.
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { initTelemetry, resolveTelemetryConfig } from "./lib/telemetry.js"
import { getVersionInfo } from "./lib/version.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

initTelemetry(resolveTelemetryConfig(process.env, getVersionInfo().version))
