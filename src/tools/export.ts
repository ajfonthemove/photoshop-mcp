import { executeScript, ok, err } from "../bridge.ts";

export const tools = [
  {
    name: "ps_export",
    description:
      "Export the active document to a file. Supports PNG, JPG, PSD, and TIFF formats.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute output file path" },
        format: {
          type: "string",
          enum: ["png", "jpg", "psd", "tiff"],
          description: "Export format",
        },
        quality: {
          type: "number",
          description: "JPEG quality 0-12 (default 10, only for jpg format)",
        },
      },
      required: ["path", "format"],
    },
  },
  {
    name: "ps_preview",
    description:
      "Export the current document state as a PNG and return it as an image so you can visually inspect the artwork. Use this to see what the canvas looks like.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_screenshot",
    description:
      "Capture a screenshot of the Photoshop application window, including all UI. Useful for seeing exactly what the user sees. Requires macOS screen recording permission for the terminal app.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_run_script",
    description:
      "Execute raw ExtendScript (JavaScript) inside Photoshop. Use this for any operation not covered by other tools. The script runs in Photoshop's scripting context with full access to the DOM (app, activeDocument, etc.). Use 'return' to send data back.",
    inputSchema: {
      type: "object" as const,
      properties: {
        script: { type: "string", description: "ExtendScript code to execute" },
      },
      required: ["script"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_export(args: any) {
    const { path, format, quality = 10 } = args;
    try {
      let script = "";
      switch (format) {
        case "png":
          script = `
            var doc = app.activeDocument;
            var f = new File(${JSON.stringify(path)});
            var opts = new PNGSaveOptions();
            opts.interlaced = false;
            opts.compression = 6;
            doc.saveAs(f, opts, true);
            return { exported: ${JSON.stringify(path)}, format: 'png' };
          `;
          break;
        case "jpg":
          script = `
            var doc = app.activeDocument;
            var f = new File(${JSON.stringify(path)});
            var opts = new JPEGSaveOptions();
            opts.quality = ${quality};
            opts.embedColorProfile = true;
            doc.saveAs(f, opts, true);
            return { exported: ${JSON.stringify(path)}, format: 'jpg' };
          `;
          break;
        case "psd":
          script = `
            var doc = app.activeDocument;
            var f = new File(${JSON.stringify(path)});
            var opts = new PhotoshopSaveOptions();
            opts.layers = true;
            opts.embedColorProfile = true;
            doc.saveAs(f, opts, true);
            return { exported: ${JSON.stringify(path)}, format: 'psd' };
          `;
          break;
        case "tiff":
          script = `
            var doc = app.activeDocument;
            var f = new File(${JSON.stringify(path)});
            var opts = new TiffSaveOptions();
            opts.layers = true;
            opts.embedColorProfile = true;
            doc.saveAs(f, opts, true);
            return { exported: ${JSON.stringify(path)}, format: 'tiff' };
          `;
          break;
        default:
          return err(`Unsupported format: ${format}`);
      }
      const result = await executeScript(script);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_preview() {
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmpPath = join(tmpdir(), `ps_preview_${Date.now()}.png`);
    try {
      await executeScript(`
        var doc = app.activeDocument;
        var f = new File(${JSON.stringify(tmpPath)});
        var opts = new PNGSaveOptions();
        opts.interlaced = false;
        opts.compression = 6;
        doc.saveAs(f, opts, true);
      `);

      const file = Bun.file(tmpPath);
      if (!(await file.exists())) {
        return err("Preview export failed — file was not created.");
      }
      const buf = await file.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");

      // Clean up
      Bun.spawn(["rm", "-f", tmpPath]);

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
          {
            type: "text" as const,
            text: "Preview of current document state.",
          },
        ],
      };
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_screenshot() {
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmpPath = join(tmpdir(), `ps_screenshot_${Date.now()}.png`);
    const IS_WIN = process.platform === "win32";

    try {
      if (IS_WIN) {
        const ps = `
          Add-Type -AssemblyName System.Windows.Forms
          Add-Type -AssemblyName System.Drawing
          $proc = Get-Process -Name "Photoshop" -ErrorAction SilentlyContinue | Select-Object -First 1
          if (-not $proc) { Write-Error "Photoshop not found"; exit 1 }
          Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WinCapture {
              [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
              [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
              public struct RECT { public int Left, Top, Right, Bottom; }
            }
"@
          $hwnd = $proc.MainWindowHandle
          [WinCapture]::SetForegroundWindow($hwnd) | Out-Null
          Start-Sleep -Milliseconds 300
          $rect = New-Object WinCapture+RECT
          [WinCapture]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
          $w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
          $bmp = New-Object System.Drawing.Bitmap($w, $h)
          $g = [System.Drawing.Graphics]::FromImage($bmp)
          $g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
          $bmp.Save('${tmpPath.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png)
          $g.Dispose(); $bmp.Dispose()
        `;
        const capProc = Bun.spawn(
          ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
          { stderr: "pipe" }
        );
        const capErr = await new Response(capProc.stderr as ReadableStream).text();
        if ((await capProc.exited) !== 0) {
          return err(`Screenshot failed: ${capErr.trim()}`);
        }
      } else {
        // macOS: get Photoshop's window ID via JXA, then screencapture it
        const jxa = `
          ObjC.import("CoreGraphics");
          var list = ObjC.deepUnwrap(
            $.CGWindowListCopyWindowInfo(
              $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0
            )
          );
          var win = list.find(function(w) {
            return w.kCGWindowOwnerName === "Adobe Photoshop" && w.kCGWindowLayer === 0;
          });
          win ? String(win.kCGWindowNumber) : "";
        `;
        const idProc = Bun.spawn(["osascript", "-l", "JavaScript", "-e", jxa], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const windowId = (await new Response(idProc.stdout as ReadableStream).text()).trim();
        await idProc.exited;

        if (!windowId) {
          return err(
            "Could not find Photoshop window. Is it open and visible?"
          );
        }

        const capProc = Bun.spawn(
          ["screencapture", "-l", windowId, "-x", "-o", tmpPath],
          { stderr: "pipe" }
        );
        const capErr = await new Response(capProc.stderr as ReadableStream).text();
        if ((await capProc.exited) !== 0) {
          return err(
            `Screenshot failed: ${capErr.trim()}. Make sure your terminal has screen recording permission in System Settings > Privacy & Security.`
          );
        }
      }

      const file = Bun.file(tmpPath);
      if (!(await file.exists())) {
        return err(
          "Screenshot failed — no image was captured. Check screen recording permissions."
        );
      }
      const buf = await file.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");

      // Clean up
      if (IS_WIN) {
        Bun.spawn(["cmd", "/c", "del", "/f", tmpPath]);
      } else {
        Bun.spawn(["rm", "-f", tmpPath]);
      }

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
          {
            type: "text" as const,
            text: "Screenshot of Photoshop window captured.",
          },
        ],
      };
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_run_script(args: any) {
    try {
      const result = await executeScript(args.script);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
