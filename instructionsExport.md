

📌 Implementation Prompt (Option B: p5 → Bun → ffmpeg)

Implement an offline render pipeline for p5.js using a local Bun server.

Requirements
	•	Target 60 FPS
	•	Deterministic rendering (no real-time / no millis() dependence)
	•	Resolution configurable (default 1920×1080)
	•	Output format: MP4 (default HEVC/H.265 Main10, yuv420p10le; optional H.264 yuv420p)

Client (p5.js)
	•	Render frames using a manual frame index f
	•	Compute time as t = f / FPS
	•	After each render, capture the canvas as a PNG
	•	POST each frame sequentially to the Bun server (/frame)
	•	Filename format: frame_000000.png (zero-padded, 6 digits)
	•	Stop after TOTAL_FRAMES and call /encode

Server (Bun)
	•	Expose POST /frame to accept multipart PNG uploads
	•	Save frames to ./frames/
	•	Expose POST /encode to run ffmpeg:

ffmpeg -y -framerate 60 -i frames/frame_%06d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \
  -movflags +faststart out.mp4


	•	Stream ffmpeg stdout/stderr to logs
	•	Return success/failure response
	•	Optionally clean up PNG frames after encoding

Notes
	•	Do not implement custom video encoding
	•	Assume ffmpeg is installed locally
	•	Prioritize reliability over real-time performance

Usage (implemented)
	•	Start the Bun server:
		- bun run server.ts
		- Defaults to port 3000; if busy it picks a free port and prints the URL.
	•	Open the exporter (auto-renders 840 frames @60fps for 14s, then encodes):
		- http://localhost:3000/?export=1&fps=60&duration=14
	•	Optional quality/codec knobs:
		- codec: hevc10 (default) | h264
		- crf: default 16 (lower = better, bigger files)
		- preset: default slow
		- cleanup=1 to delete PNGs after encoding
		- Example: http://localhost:3000/?export=1&fps=60&duration=14&codec=hevc10&crf=14&preset=slow&cleanup=1
	•	Outputs:
		- PNG sequence in ./frames/frame_000000.png ... frame_000839.png
		- MP4 encoded to ./out.mp4 (codec depends on `codec` param)


http://localhost:51156/?export=1&fps=60&duration=14

http://localhost:PORT/?export=1&fps=60&duration=14&codec=h264