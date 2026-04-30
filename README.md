# Photoshop MCP

An open bridge between Adobe Photoshop and AI.

![Photoshop MCP](banner.png)

> The future of AI is humans using the UI they like, and AI using a UI that works for it. The two aren't mutually exclusive. Photoshop is where I do my detail work, this MCP gives AI a seat at the table without taking mine. Free and open source.

---

Photoshop MCP connects your running instance of Adobe Photoshop to Claude Code, or any AI tool that speaks the Model Context Protocol. No plugins. No extensions. No restarts. If Photoshop is open, your AI can use it.

## What it does

Your AI gets direct access to Photoshop's full editing toolbox — layers, selections, adjustments, filters, text, shapes, transforms, and export. 42 tools that map to the operations you'd normally do by hand.

It can also **look at your work**. The preview and screenshot tools let the AI see your actual canvas, not just read metadata. You describe what you want, it sees the current state, it makes the edits.

## How it works

There's no Photoshop plugin to install. The bridge talks to Photoshop through the same scripting interface that's been built into every version for decades — ExtendScript, delivered via AppleScript on macOS and COM automation on Windows. Your AI writes the script, the bridge delivers it, Photoshop executes it.

The server runs locally over stdio using the Model Context Protocol. Claude Code picks it up automatically. Any other MCP-compatible client will too.

## Setup

```bash
bun install
```

### Claude Code

```bash
claude mcp add -s user photoshop-bridge bun run /path/to/src/server.ts
```

### OpenClaw

```bash
openclaw mcp set photoshop-bridge '{"command":"bun","args":["run","/path/to/src/server.ts"]}'
```

### Any MCP client

Add this to your client's MCP config:

```json
{
  "photoshop-bridge": {
    "command": "bun",
    "args": ["run", "/path/to/src/server.ts"]
  }
}
```

Start a new session. Open Photoshop. Go.

## Tools

**Document** — create, save, close, inspect documents. Resize image, resize canvas, crop.

**Layers** — list, create, duplicate, delete, merge visible, flatten. Set blend mode, opacity, and visibility per layer.

**Create** — text layers, filled shapes (rectangles and ellipses), fill active layer or selection, stroke selection, place external images.

**Selection** — select all, deselect, rectangular selection, invert selection, feather.

**Adjustments** — brightness/contrast, levels, curves, invert colors, desaturate.

**Filters** — Gaussian blur, unsharp mask, motion blur, add noise, median.

**Transform** — move, scale, rotate layers. Flip the entire canvas.

**Export** — save as PNG, JPG, PSD, or TIFF. Preview the canvas as a returned image. Screenshot the full Photoshop window.

**Escape hatch** — `ps_run_script` accepts raw ExtendScript for anything the dedicated tools don't cover. The full Photoshop DOM is available.

## Requirements

- Adobe Photoshop (any CC version)
- Bun
- macOS or Windows
- On macOS, the terminal needs screen recording permission for the screenshot tool
