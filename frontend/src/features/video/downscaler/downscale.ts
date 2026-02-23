import {
  Input,
  Output,
  ALL_FORMATS,
  BlobSource,
  Mp4OutputFormat,
  BufferTarget,
  EncodedVideoPacketSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedPacket,
  type AudioCodec,
} from "mediabunny";

import { createWebGPUScaler, createWebGLScaler } from "./scalers";
import type { GPUScaler } from "./scalers";
import { isSupported, getOutputDims } from "./helpers";

export interface DownscaleOptions {
  /** Target length of the shorter dimension in pixels. @defaultValue 1080 */
  targetShortSide?: number;
  /** Output video bitrate in bits/sec. @defaultValue 3_000_000 */
  bitrate?: number;
  /** Maximum output frame rate. @defaultValue 30 */
  maxFps?: number;
  /** Encoder keyframe interval in frames. @defaultValue 150 */
  keyframeInterval?: number;
  /** Called with a 0–100 value as encoding progresses. */
  onProgress?: (percent: number) => void;
}
/**
 * Downscales a video `File` entirely in the browser and returns a new MP4 `Blob`.
 *
 * Pipeline: demux → decode (WebCodecs) → GPU scale (WebGPU/WebGL2) →
 * encode H.264 (WebCodecs) → mux MP4 (Mediabunny). Audio is passed through
 * without re-encoding.
 *
 * @param file - The source video file.
 * @param opts - {@link DownscaleOptions} controlling resolution, bitrate, and fps.
 * @returns A promise resolving to the transcoded MP4 blob.
 *
 * @throws If WebCodecs is unsupported, no video track is found, the codec is
 * unsupported, or no GPU scaler could be created.
 *
 * @example
 * ```ts
 * const blob = await downscaleVideo(file, { targetShortSide: 720, bitrate: 2_000_000 });
 * const url = URL.createObjectURL(blob);
 * ```
 */
export async function downscaleVideo(
  file: File,
  opts: DownscaleOptions = {}
): Promise<Blob> {
  const {
    targetShortSide = 1080,
    bitrate = 3_000_000,
    maxFps = 30,
    keyframeInterval = 150,
    onProgress,
  } = opts;

  if (!isSupported()) {
    throw new Error("WebCodecs not supported in this browser");
  }

  // ── 1. Read metadata with Mediabunny ──
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("No video track found");

  const { displayWidth, displayHeight, rotation } = videoTrack;

  const packetStats = await videoTrack.computePacketStats(100);
  const srcFps = packetStats.averagePacketRate ?? 30;

  // ── 2. Extract encoded packets ──
  const decoderConfig = await videoTrack.getDecoderConfig();
  if (!decoderConfig) throw new Error("Could not extract decoder config");

  const sink = new EncodedPacketSink(videoTrack);
  const chunks: EncodedVideoChunk[] = [];
  for await (const packet of sink.packets()) {
    chunks.push(packet.toEncodedVideoChunk());
  }
  const totalChunks = chunks.length;

  // ── 3. Compute output dimensions and frame-skip ratio ──
  const { outW, outH } = getOutputDims(displayWidth, displayHeight, targetShortSide);
  const targetFps = Math.min(Math.round(srcFps), maxFps);
  /** Drop 1-in-N frames when source fps significantly exceeds target. */
  const frameSkip = srcFps > maxFps * 1.3 ? Math.round(srcFps / targetFps) : 1;
  const frameDuration = Math.round(1e6 / targetFps); // microseconds

  // ── 4. Create GPU scaler (WebGPU preferred, WebGL2 fallback) ──
  let scaler: GPUScaler | null = null;
  if (navigator.gpu) scaler = await createWebGPUScaler(outW, outH, rotation);
  if (!scaler)       scaler = createWebGLScaler(outW, outH, rotation);
  if (!scaler) throw new Error("No GPU scaler available");

  // ── 5. Configure H.264 encoder ──
  const encCfg: VideoEncoderConfig = {
    codec: "avc1.640028", // H.264 High Profile 4.0
    width: outW,
    height: outH,
    bitrate,
    framerate: targetFps,
    latencyMode: "realtime",
    hardwareAcceleration: "prefer-hardware",
    avc: { format: "avc" },
  };

  let encSupport = await VideoEncoder.isConfigSupported(encCfg);
  if (!encSupport.supported) {
    delete encCfg.hardwareAcceleration;
    encSupport = await VideoEncoder.isConfigSupported(encCfg);
    if (!encSupport.supported) throw new Error("H.264 encoder not supported");
  }

  // ── 6. Set up Mediabunny muxer ──
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const videoSource = new EncodedVideoPacketSource("avc");
  output.addVideoTrack(videoSource);

  // ── 7. Configure audio pass-through (no re-encode) ──
  const audioTrack = await input.getPrimaryAudioTrack();
  let audioSource: EncodedAudioPacketSource | null = null;

  if (audioTrack) {
    const audioConfig = await audioTrack.getDecoderConfig();
    if (audioConfig) {
      const codecStr = audioConfig.codec.toLowerCase();
      let audioCodecName: AudioCodec = "aac";
      if (codecStr.startsWith("mp4a"))                  audioCodecName = "aac";
      else if (codecStr.startsWith("opus"))              audioCodecName = "opus";
      else if (codecStr.startsWith("flac"))              audioCodecName = "flac";
      else if (codecStr.startsWith("mp3") || codecStr.includes("mp3")) audioCodecName = "mp3";

      audioSource = new EncodedAudioPacketSource(audioCodecName);
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();

  // ── 8. Encoder: feeds encoded chunks into the muxer ──
  let encoded = 0;
  const encoder = new VideoEncoder({
    output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
      const buf = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buf);

      const mbPacket = new EncodedPacket(
        new Uint8Array(buf),
        chunk.type,
        chunk.timestamp / 1e6,
        (chunk.duration ?? 0) / 1e6,
      );

      // First packet carries the decoder config (SPS/PPS for H.264).
      if (encoded === 0 && meta?.decoderConfig) {
        videoSource.add(mbPacket, { decoderConfig: meta.decoderConfig });
      } else {
        videoSource.add(mbPacket);
      }
      encoded++;
    },
    error: (e: DOMException) => { throw new Error(`Encode error: ${e.message}`); },
  });
  encoder.configure(encCfg);

  // ── 9. Validate decoder config (prefer hardware, fallback to software) ──
  let decCfg: VideoDecoderConfig = {
    ...decoderConfig,
    hardwareAcceleration: "prefer-hardware" as const,
  };
  let decSupport = await VideoDecoder.isConfigSupported(decCfg);
  if (!decSupport.supported) {
    const { ...rest } = decCfg;
    decCfg = rest;
    decSupport = await VideoDecoder.isConfigSupported(decCfg);
    if (!decSupport.supported) throw new Error(`Unsupported codec: ${decCfg.codec}`);
  }

  // ── 10. Decode → Scale → Encode ──
  let decoded = 0;
  let fed = 0;
  let errors = 0;

  await new Promise<void>((resolve, reject) => {
    const decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        decoded++;

        // Drop frame if we're reducing fps.
        if (frameSkip > 1 && decoded % frameSkip !== 0) {
          frame.close();
          return;
        }

        try {
          const scaledCanvas = scaler!.scale(frame);
          frame.close();

          // Restamp to new timeline so timestamps are contiguous.
          const scaledFrame = new VideoFrame(scaledCanvas, {
            timestamp: fed * frameDuration,
            duration: frameDuration,
          });
          encoder.encode(scaledFrame, { keyFrame: fed % keyframeInterval === 0 });
          scaledFrame.close();
          fed++;

          if (fed % 50 === 0) onProgress?.(Math.round((decoded / totalChunks) * 100));
        } catch {
          frame.close();
          errors++;
        }
      },
      error: () => { errors++; },
    });

    decoder.configure(decCfg);
    for (const c of chunks) decoder.decode(c);

    decoder.flush()
      .then(() => { decoder.close(); return encoder.flush(); })
      .then(() => { encoder.close(); resolve(); })
      .catch(reject);
  });

  // ── 11. Write audio packets into muxer ──
  if (audioSource && audioTrack) {
    const audioSink = new EncodedPacketSink(audioTrack);
    const audioConfig = await audioTrack.getDecoderConfig();
    let firstAudio = true;

    for await (const packet of audioSink.packets()) {
      const meta = firstAudio && audioConfig ? { decoderConfig: audioConfig } : undefined;
      audioSource.add(
        new EncodedPacket(packet.data, packet.type, packet.timestamp, packet.duration),
        meta,
      );
      firstAudio = false;
    }
  }

  // ── 12. Finalize and return ──
  scaler.destroy();
  await output.finalize();
  onProgress?.(100);

  return new Blob([target.buffer!], { type: "video/mp4" });
}