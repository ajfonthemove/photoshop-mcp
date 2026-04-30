import { executeScript, ok, err, HELPERS } from "../bridge.ts";

export const tools = [
  {
    name: "ps_transform",
    description:
      "Move, scale, and/or rotate a layer. All parameters are optional — only supplied values are applied.",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name. Omit for active layer." },
        deltaX: { type: "number", description: "Move right by this many pixels (negative = left)" },
        deltaY: { type: "number", description: "Move down by this many pixels (negative = up)" },
        scaleX: { type: "number", description: "Horizontal scale percentage (100 = no change)" },
        scaleY: { type: "number", description: "Vertical scale percentage (100 = no change)" },
        angle: { type: "number", description: "Rotation in degrees (positive = clockwise)" },
      },
    },
  },
  {
    name: "ps_flip_canvas",
    description: "Flip the entire canvas horizontally or vertically.",
    inputSchema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["horizontal", "vertical"],
          description: "Flip direction",
        },
      },
      required: ["direction"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_transform(args: any) {
    const { target, deltaX, deltaY, scaleX, scaleY, angle } = args;
    const ops: string[] = [];

    if (deltaX !== undefined || deltaY !== undefined) {
      ops.push(
        `layer.translate(new UnitValue(${deltaX ?? 0}, 'px'), new UnitValue(${deltaY ?? 0}, 'px'));`
      );
    }
    if (scaleX !== undefined || scaleY !== undefined) {
      ops.push(
        `layer.resize(${scaleX ?? 100}, ${scaleY ?? 100}, AnchorPosition.MIDDLECENTER);`
      );
    }
    if (angle !== undefined) {
      ops.push(`layer.rotate(${angle}, AnchorPosition.MIDDLECENTER);`);
    }

    if (ops.length === 0) {
      return ok("No transform parameters provided");
    }

    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        ${ops.join("\n")}
        return { layer: layer.name, transformed: true };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_flip_canvas(args: any) {
    const { direction } = args;
    const dir =
      direction === "vertical" ? "Direction.VERTICAL" : "Direction.HORIZONTAL";
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.flipCanvas(${dir});
        return { flipped: ${JSON.stringify(direction)} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
