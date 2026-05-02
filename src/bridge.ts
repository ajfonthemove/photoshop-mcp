/**
 * Cross-platform bridge to Adobe Photoshop.
 *
 * macOS:   AppleScript  -> `osascript -e 'tell application "Adobe Photoshop" to do javascript ...'`
 * Windows: PowerShell   -> `New-Object -ComObject Photoshop.Application` + `.DoJavaScript()`
 *
 * ExtendScript is written to a temp .jsx file, executed by the host, and the
 * result string is captured from stdout.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";

const IS_WIN = process.platform === "win32";

export async function executeScript(script: string): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpFile = join(tmpdir(), `ps_mcp_${id}.jsx`);

  // Wrap user script in an IIFE that catches errors and always returns a string
  const wrapped = `(function(){
try{
var __r=(function(){
${script}
})();
if(__r===undefined||__r===null)return"ok";
if(typeof __r==="object")return JSON.stringify(__r);
return String(__r);
}catch(e){
return JSON.stringify({__error:true,message:String(e.message||e),line:e.line||0});
}
})()`;

  await Bun.write(tmpFile, wrapped);

  let proc: ReturnType<typeof Bun.spawn>;

  if (IS_WIN) {
    // Windows: use PowerShell with COM automation
    const ps = `
      $ErrorActionPreference = 'Stop'
      try {
        $ps = New-Object -ComObject Photoshop.Application
        $script = [System.IO.File]::ReadAllText('${tmpFile.replace(/\\/g, "\\\\")}')
        $ps.DoJavaScript($script)
      } catch {
        Write-Error $_.Exception.Message
        exit 1
      } finally {
        Remove-Item -Force '${tmpFile.replace(/\\/g, "\\\\")}' -ErrorAction SilentlyContinue
      }
    `;
    proc = Bun.spawn(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps], {
      stdout: "pipe",
      stderr: "pipe",
    });
  } else {
    // macOS: use AppleScript
    const appleScript = `tell application "Adobe Photoshop 2026" to do javascript (read POSIX file "${tmpFile}")`;
    proc = Bun.spawn(["osascript", "-e", appleScript], {
      stdout: "pipe",
      stderr: "pipe",
    });
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout as ReadableStream).text(),
    new Response(proc.stderr as ReadableStream).text(),
    proc.exited,
  ]);

  // Clean up temp file (fire-and-forget) — macOS only; Windows cleans up in the PS script
  if (!IS_WIN) Bun.spawn(["rm", "-f", tmpFile]);

  if (exitCode !== 0) {
    const errMsg = stderr.trim();
    if (
      errMsg.includes("not running") ||
      errMsg.includes("Connection is invalid") ||
      errMsg.includes("-600") ||
      errMsg.includes("Retrieving the COM class factory") ||
      errMsg.includes("RPC server is unavailable")
    ) {
      throw new Error("Adobe Photoshop is not running. Please launch it first.");
    }
    throw new Error(`Script execution failed: ${errMsg}`);
  }

  const result = stdout.trim();

  // Check for ExtendScript-level errors
  try {
    const parsed = JSON.parse(result);
    if (parsed && parsed.__error) {
      throw new Error(`ExtendScript: ${parsed.message} (line ${parsed.line})`);
    }
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    // Not valid JSON — plain string result, that's fine
  }

  return result;
}

// ---------- common ExtendScript helpers injected into scripts ----------

export const HELPERS = `
function getLayer(name) {
  var doc = app.activeDocument;
  try { return doc.artLayers.getByName(name); }
  catch(e) {
    try { return doc.layerSets.getByName(name); }
    catch(e2) { throw new Error('Layer not found: ' + name); }
  }
}

function makeColor(r, g, b) {
  var c = new SolidColor();
  c.rgb.red = r;
  c.rgb.green = g;
  c.rgb.blue = b;
  return c;
}

function hexToColor(hex) {
  hex = hex.replace('#', '');
  return makeColor(
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  );
}
`;

// ---------- response helpers ----------

export function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function err(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}
