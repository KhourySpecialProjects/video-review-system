
/** A GPU-backed frame scaler backed by either WebGPU or WebGL2. */
export interface GPUScaler {
    /** The output canvas written to on each {@link scale} call. */
    canvas: OffscreenCanvas;
    /** Scales a decoded `VideoFrame` onto {@link canvas} and returns it. */
    scale: (frame: VideoFrame) => OffscreenCanvas;
    /** Releases all GPU resources. */
    destroy: () => void;
  }

/**
 * Creates a WebGPU-backed {@link GPUScaler}.
 * Uses `importExternalTexture` for zero-copy `VideoFrame` ingestion.
 * Applies an optional rotation via a WGSL vertex shader.
 *
 * @param w - Output width in pixels.
 * @param h - Output height in pixels.
 * @param rotationDeg - Clockwise rotation to correct (e.g. 90 for portrait phone video).
 * @returns A {@link GPUScaler}, or `null` if WebGPU is unavailable.
 */
export async function createWebGPUScaler(w: number, h: number, rotationDeg: number): Promise<GPUScaler | null> {
  if (!navigator.gpu) return null;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("webgpu");
  if (!ctx) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

  const rad = (-rotationDeg * Math.PI) / 180;

  // Uniform buffer holds cos/sin of the rotation angle for the vertex shader.
  const uniformBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuf, 0, new Float32Array([Math.cos(rad), Math.sin(rad), 0, 0]));

  const shaderModule = device.createShaderModule({
    code: `
      struct Uniforms { cosR: f32, sinR: f32 };

      @group(0) @binding(0) var extTex: texture_external;
      @group(0) @binding(1) var samp: sampler;
      @group(0) @binding(2) var<uniform> u: Uniforms;

      struct VertOut {
        @builtin(position) pos: vec4f,
        @location(0) uv: vec2f,
      };

      @vertex fn vs(@builtin(vertex_index) i: u32) -> VertOut {
        var p = array<vec2f, 4>(
          vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1)
        );
        let pos = p[i];
        var uv = pos * 0.5 + 0.5;
        uv.y = 1.0 - uv.y;

        let c = uv - 0.5;
        let rotated = vec2f(
          c.x * u.cosR - c.y * u.sinR,
          c.x * u.sinR + c.y * u.cosR
        ) + 0.5;

        var out: VertOut;
        out.pos = vec4f(pos, 0.0, 1.0);
        out.uv = rotated;
        return out;
      }

      @fragment fn fs(in: VertOut) -> @location(0) vec4f {
        return textureSampleBaseClampToEdge(extTex, samp, in.uv);
      }
    `,
  });

  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, externalTexture: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module: shaderModule, entryPoint: "vs" },
    fragment: { module: shaderModule, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-strip" },
  });

  return {
    canvas,
    scale(source: VideoFrame): OffscreenCanvas {
      const externalTexture = device.importExternalTexture({
        source: source as unknown as HTMLVideoElement,
      });
      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: externalTexture },
          { binding: 1, resource: sampler },
          { binding: 2, resource: { buffer: uniformBuf } },
        ],
      });

      const cmd = device.createCommandEncoder();
      const pass = cmd.beginRenderPass({
        colorAttachments: [{
          view: ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(4);
      pass.end();
      device.queue.submit([cmd.finish()]);

      return canvas;
    },
    destroy() {
      uniformBuf.destroy();
      device.destroy();
    },
  };
}

/**
 * Creates a WebGL2-backed {@link GPUScaler}.
 * Fallback for when WebGPU is unavailable. Uploads each frame as a texture
 * and renders it scaled + rotated via a GLSL shader.
 *
 * @param w - Output width in pixels.
 * @param h - Output height in pixels.
 * @param rotationDeg - Clockwise rotation to correct.
 * @returns A {@link GPUScaler}, or `null` if WebGL2 is unavailable.
 */
export function createWebGLScaler(w: number, h: number, rotationDeg: number): GPUScaler | null {
  const canvas = new OffscreenCanvas(w, h);
  const gl = canvas.getContext("webgl2", {
    alpha: false, desynchronized: true, antialias: false, preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  const rad = (-rotationDeg * Math.PI) / 180;

  const vs = `#version 300 es
    in vec2 a_pos; out vec2 v_uv;
    uniform float u_cos, u_sin;
    void main() {
      vec2 uv = a_pos * 0.5 + 0.5;
      uv.y = 1.0 - uv.y;
      vec2 c = uv - 0.5;
      v_uv = vec2(c.x*u_cos - c.y*u_sin, c.x*u_sin + c.y*u_cos) + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;
  const fs = `#version 300 es
    precision mediump float;
    uniform sampler2D u_tex; in vec2 v_uv; out vec4 o;
    void main() { o = texture(u_tex, v_uv); }`;

  const compile = (src: string, type: number): WebGLShader => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
  gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.uniform1f(gl.getUniformLocation(prog, "u_cos"), Math.cos(rad));
  gl.uniform1f(gl.getUniformLocation(prog, "u_sin"), Math.sin(rad));

  const vbuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.viewport(0, 0, w, h);

  return {
    canvas,
    scale(source: VideoFrame): OffscreenCanvas {
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        source as unknown as TexImageSource
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas;
    },
    destroy() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(vbuf);
      gl.deleteProgram(prog);
    },
  };
}
