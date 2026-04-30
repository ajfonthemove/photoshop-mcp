import { tools as docTools, handlers as docHandlers } from "./document.ts";
import { tools as layerTools, handlers as layerHandlers } from "./layers.ts";
import { tools as createTools, handlers as createHandlers } from "./create.ts";
import { tools as selectionTools, handlers as selectionHandlers } from "./selection.ts";
import { tools as adjustmentTools, handlers as adjustmentHandlers } from "./adjustments.ts";
import { tools as filterTools, handlers as filterHandlers } from "./filters.ts";
import { tools as transformTools, handlers as transformHandlers } from "./transform.ts";
import { tools as exportTools, handlers as exportHandlers } from "./export.ts";

export const allTools = [
  ...docTools,
  ...layerTools,
  ...createTools,
  ...selectionTools,
  ...adjustmentTools,
  ...filterTools,
  ...transformTools,
  ...exportTools,
] as any[];

const allHandlers: Record<string, (args: any) => Promise<any>> = {
  ...docHandlers,
  ...layerHandlers,
  ...createHandlers,
  ...selectionHandlers,
  ...adjustmentHandlers,
  ...filterHandlers,
  ...transformHandlers,
  ...exportHandlers,
};

export async function handleTool(name: string, args: Record<string, unknown>) {
  const handler = allHandlers[name];
  if (!handler) {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  return handler(args);
}
