import { executeScript, ok, err, HELPERS } from "../bridge.ts";

export const tools = [
  {
    name: "ps_create_text",
    description:
      "Create a text layer at the given position. Coordinates in pixels from the top-left.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "Text content" },
        x: { type: "number", description: "X position in pixels" },
        y: { type: "number", description: "Y position in pixels" },
        fontSize: { type: "number", description: "Font size in points (default 24)" },
        fontFamily: {
          type: "string",
          description: "PostScript font name, e.g. 'ArialMT', 'Helvetica'. Use ps_run_script to list available fonts.",
        },
        r: { type: "number", description: "Red 0-255 (default 0)" },
        g: { type: "number", description: "Green 0-255 (default 0)" },
        b: { type: "number", description: "Blue 0-255 (default 0)" },
        hex: { type: "string", description: "Hex color e.g. '#FF6600'. Alternative to r/g/b." },
      },
      required: ["content", "x", "y"],
    },
  },
  {
    name: "ps_fill_layer",
    description:
      "Fill the active layer (or current selection within it) with a solid color.",
    inputSchema: {
      type: "object" as const,
      properties: {
        r: { type: "number", description: "Red 0-255" },
        g: { type: "number", description: "Green 0-255" },
        b: { type: "number", description: "Blue 0-255" },
        hex: { type: "string", description: "Hex color. Alternative to r/g/b." },
        opacity: { type: "number", description: "Fill opacity 0-100 (default 100)" },
      },
    },
  },
  {
    name: "ps_stroke_selection",
    description: "Stroke the current selection with a color.",
    inputSchema: {
      type: "object" as const,
      properties: {
        r: { type: "number", description: "Red 0-255" },
        g: { type: "number", description: "Green 0-255" },
        b: { type: "number", description: "Blue 0-255" },
        hex: { type: "string", description: "Hex color. Alternative to r/g/b." },
        width: { type: "number", description: "Stroke width in pixels (default 1)" },
        location: {
          type: "string",
          enum: ["inside", "center", "outside"],
          description: "Stroke location (default center)",
        },
      },
    },
  },
  {
    name: "ps_place_image",
    description: "Place an external image file into the active document as a new layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path to the image file" },
      },
      required: ["path"],
    },
  },
  {
    name: "ps_create_shape",
    description:
      "Draw a shape (rectangle or ellipse) by creating a selection, filling it with a color, then deselecting. Works on the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["rectangle", "ellipse"],
          description: "Shape type",
        },
        left: { type: "number", description: "Left edge in pixels" },
        top: { type: "number", description: "Top edge in pixels" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        r: { type: "number", description: "Red 0-255 (default 0)" },
        g: { type: "number", description: "Green 0-255 (default 0)" },
        b: { type: "number", description: "Blue 0-255 (default 0)" },
        hex: { type: "string", description: "Hex color. Alternative to r/g/b." },
        layerName: { type: "string", description: "Name for the new layer that will be created for this shape" },
      },
      required: ["type", "left", "top", "width", "height"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_create_text(args: any) {
    const { content, x, y, fontSize = 24, fontFamily, r = 0, g = 0, b = 0, hex } = args;
    const colorScript = hex
      ? `hexToColor(${JSON.stringify(hex)})`
      : `makeColor(${r}, ${g}, ${b})`;
    const fontSet = fontFamily
      ? `layer.textItem.font = ${JSON.stringify(fontFamily)};`
      : "";
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = doc.artLayers.add();
        layer.kind = LayerKind.TEXT;
        layer.textItem.contents = ${JSON.stringify(content)};
        layer.textItem.size = new UnitValue(${fontSize}, 'pt');
        layer.textItem.position = [new UnitValue(${x}, 'px'), new UnitValue(${y}, 'px')];
        layer.textItem.color = ${colorScript};
        ${fontSet}
        return {
          name: layer.name,
          content: layer.textItem.contents,
          x: ${x},
          y: ${y},
          fontSize: ${fontSize}
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_fill_layer(args: any) {
    const { r = 0, g = 0, b = 0, hex, opacity = 100 } = args;
    const colorScript = hex
      ? `hexToColor(${JSON.stringify(hex)})`
      : `makeColor(${r}, ${g}, ${b})`;
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        doc.selection.fill(${colorScript}, ColorBlendMode.NORMAL, ${opacity});
        return { filled: true, opacity: ${opacity} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_stroke_selection(args: any) {
    const { r = 0, g = 0, b = 0, hex, width = 1, location = "center" } = args;
    const colorScript = hex
      ? `hexToColor(${JSON.stringify(hex)})`
      : `makeColor(${r}, ${g}, ${b})`;
    const locMap: Record<string, string> = {
      inside: "StrokeLocation.INSIDE",
      center: "StrokeLocation.CENTER",
      outside: "StrokeLocation.OUTSIDE",
    };
    const loc = locMap[location] ?? "StrokeLocation.CENTER";
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        doc.selection.stroke(${colorScript}, ${width}, ${loc});
        return { stroked: true, width: ${width}, location: ${JSON.stringify(location)} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_place_image(args: any) {
    const { path } = args;
    try {
      const result = await executeScript(`
        var targetDoc = app.activeDocument;
        var file = new File(${JSON.stringify(path)});
        if (!file.exists) throw new Error('File not found: ' + ${JSON.stringify(path)});
        var placed = app.open(file);
        placed.activeLayer.duplicate(targetDoc);
        placed.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = targetDoc;
        return {
          placed: true,
          source: ${JSON.stringify(path)},
          newLayer: targetDoc.activeLayer.name
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_create_shape(args: any) {
    const {
      type: shapeType,
      left, top, width, height,
      r = 0, g = 0, b = 0, hex,
      layerName,
    } = args;
    const right = left + width;
    const bottom = top + height;
    const colorScript = hex
      ? `hexToColor(${JSON.stringify(hex)})`
      : `makeColor(${r}, ${g}, ${b})`;
    const nameSet = layerName ? `layer.name = ${JSON.stringify(layerName)};` : "";

    let selectionScript: string;
    if (shapeType === "ellipse") {
      selectionScript = `
        var region = [[${left},${top}],[${right},${top}],[${right},${bottom}],[${left},${bottom}]];
        doc.selection.select(region, SelectionType.REPLACE, 0, true);
      `;
    } else {
      selectionScript = `
        var region = [[${left},${top}],[${right},${top}],[${right},${bottom}],[${left},${bottom}]];
        doc.selection.select(region);
      `;
    }

    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = doc.artLayers.add();
        ${nameSet}
        ${selectionScript}
        doc.selection.fill(${colorScript});
        doc.selection.deselect();
        return {
          layer: layer.name,
          shape: ${JSON.stringify(shapeType)},
          bounds: { left: ${left}, top: ${top}, right: ${right}, bottom: ${bottom} }
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
