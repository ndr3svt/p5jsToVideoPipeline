# BIENVENUE — p5.js sketch

Minimal p5.js sketch with an offline export pipeline:

- **Render deterministic PNG frames**
- **Encode to MP4** (default **H.265/HEVC 10-bit**, optional **H.264**)

## Run (interactive)

Serve the folder with any static server, then open the page.

Example:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

- **Pause/resume**: press `P`

## Offline export (PNG → MP4)

### Requirements

- **Bun** installed
- **ffmpeg** installed (must include `libx265` for HEVC)

### 1) Start the render server

```bash
bun run server.ts
```

It tries port **3000**; if busy it picks a free port and prints the URL, e.g. `http://localhost:51156/`.

### 2) Open the export URL

This will render exactly **14s @ 60fps = 840 frames**, upload them to the server, then encode:

`http://localhost:PORT/?export=1&fps=60&duration=14`

### Outputs

- `frames/frame_000000.png` … `frames/frame_000839.png`
- `out.mp4`

## Quality / compatibility knobs

All are URL params on the export page:

- **`codec`**: `hevc10` (default) | `h264`
- **`crf`**: default `16` (lower = higher quality, bigger files)
- **`preset`**: default `slow` (slower = better compression)
- **`cleanup=1`**: delete PNGs after encoding

Example (higher quality + cleanup):

`http://localhost:PORT/?export=1&fps=60&duration=14&codec=hevc10&crf=14&preset=slow&cleanup=1`

## Notes

- The export mode is deterministic: it renders by frame index \(t = f / fps\), not by real-time clocks.
- **HEVC (H.265) 10-bit** looks better for gradients, but isn’t universally playable on all systems/browsers. Use **H.264** when you need maximum compatibility.

