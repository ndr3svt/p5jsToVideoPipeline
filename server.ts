import { mkdir, readdir, unlink } from "node:fs/promises";
import { join, normalize } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const FRAMES_DIR = join(ROOT, "frames");

function safePath(urlPath: string) {
  const p = urlPath === "/" ? "/index.html" : urlPath;
  const n = normalize(p).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(ROOT, n);
}

async function ensureFramesDir() {
  await mkdir(FRAMES_DIR, { recursive: true });
}

async function countFrames() {
  const files = await readdir(FRAMES_DIR).catch(() => []);
  return files.filter(f => /^frame_\d{6}\.png$/.test(f)).length;
}

async function cleanupFramePngs() {
  const files = await readdir(FRAMES_DIR).catch(() => []);
  await Promise.all(
    files
      .filter(f => /^frame_\d{6}\.png$/.test(f))
      .map(f => unlink(join(FRAMES_DIR, f)).catch(() => {})),
  );
}

type EncodeOpts = {
  fps: number;
  codec: "hevc10" | "h264";
  crf: number;
  preset: string;
  outFile: string;
};

function runFfmpeg(opts: EncodeOpts) {
  return new Promise<void>((resolve, reject) => {
    const commonIn = [
      "-y",
      "-framerate",
      String(opts.fps),
      "-start_number",
      "0",
      "-i",
      "frames/frame_%06d.png",
      // Convert RGB PNGs to standard HD video signal: bt709, limited range (tv)
      "-vf",
      "scale=in_range=full:out_range=tv:out_color_matrix=bt709",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-movflags",
      "+faststart",
    ];

    const args =
      opts.codec === "hevc10"
        ? [
            ...commonIn,
            "-c:v",
            "libx265",
            "-pix_fmt",
            "yuv420p10le",
            "-profile:v",
            "main10",
            "-crf",
            String(opts.crf),
            "-preset",
            opts.preset,
            // Better Apple/QuickTime compatibility in MP4
            "-tag:v",
            "hvc1",
            "-x265-params",
            "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited",
            opts.outFile,
          ]
        : [
            ...commonIn,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            String(opts.crf),
            "-preset",
            opts.preset,
            opts.outFile,
          ];

    const p = spawn("ffmpeg", args, { cwd: ROOT });
    p.stdout.on("data", d => process.stdout.write(d));
    p.stderr.on("data", d => process.stderr.write(d));
    p.on("error", reject);
    p.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

await ensureFramesDir();

const preferredPort = process.env.PORT ? Number(process.env.PORT) : 3000;

function startServer(port: number) {
  return Bun.serve({
    port,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "POST" && pathname === "/frame") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return new Response("missing file", { status: 400 });
      if (!/^frame_\d{6}\.png$/.test(file.name)) {
        return new Response(`bad filename: ${file.name}`, { status: 400 });
      }
      const buf = await file.arrayBuffer();
      await Bun.write(join(FRAMES_DIR, file.name), buf);
      return new Response("ok");
    }

    if (req.method === "POST" && pathname === "/encode") {
      let body: any = {};
      try {
        body = await req.json();
      } catch {}

      const fps = Math.max(1, Math.floor(Number(body.fps ?? 60)));
      const totalFrames = Math.max(0, Math.floor(Number(body.totalFrames ?? 0)));
      const cleanup = !!body.cleanup;
      const codec = body.codec === "h264" ? "h264" : "hevc10";
      const preset = typeof body.preset === "string" && body.preset ? body.preset : "slow";
      const crf = Math.max(0, Number(body.crf ?? 16));
      const got = await countFrames();
      if (totalFrames && got < totalFrames) {
        return new Response(`not enough frames: got ${got}, expected ${totalFrames}`, { status: 400 });
      }

      try {
        const outFile = "out.mp4";
        await runFfmpeg({ fps, codec, crf, preset, outFile });
        if (cleanup) await cleanupFramePngs();
        return new Response(`encoded ${outFile} (${codec})`);
      } catch (e: any) {
        return new Response(String(e?.message ?? e), { status: 500 });
      }
    }

    if (req.method === "GET") {
      const filePath = safePath(pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      return new Response("not found", { status: 404 });
    }

    return new Response("method not allowed", { status: 405 });
  },
  });
}

let server: ReturnType<typeof Bun.serve>;
try {
  server = startServer(preferredPort);
} catch (e: any) {
  if (String(e?.code ?? e).includes("EADDRINUSE") && !process.env.PORT) {
    server = startServer(0); // pick an available port
  } else {
    throw e;
  }
}

console.log("Render server running on", server.url.toString());
