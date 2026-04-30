import { executeScript, ok, err } from "../bridge.ts";

export const tools = [
  {
    name: "ps_brightness_contrast",
    description: "Apply brightness and contrast adjustment to the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        brightness: { type: "number", description: "Brightness (-150 to 150)" },
        contrast: { type: "number", description: "Contrast (-50 to 100)" },
      },
      required: ["brightness", "contrast"],
    },
  },
  {
    name: "ps_levels",
    description:
      "Apply a levels adjustment to the active layer. Adjusts the input/output range and gamma.",
    inputSchema: {
      type: "object" as const,
      properties: {
        inputStart: { type: "number", description: "Input black point 0-255 (default 0)" },
        inputEnd: { type: "number", description: "Input white point 0-255 (default 255)" },
        gamma: { type: "number", description: "Gamma 0.1-10 (default 1.0)" },
        outputStart: { type: "number", description: "Output black point 0-255 (default 0)" },
        outputEnd: { type: "number", description: "Output white point 0-255 (default 255)" },
      },
    },
  },
  {
    name: "ps_curves",
    description:
      "Apply a curves adjustment to the active layer. Provide an array of [input, output] control points (0-255).",
    inputSchema: {
      type: "object" as const,
      properties: {
        curvePoints: {
          type: "array",
          items: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
          description: "Array of [input, output] pairs, e.g. [[0,0],[128,180],[255,255]]",
        },
      },
      required: ["curvePoints"],
    },
  },
  {
    name: "ps_invert",
    description: "Invert the colors of the active layer.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_desaturate",
    description: "Desaturate the active layer (remove all color, keep luminosity).",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_brightness_contrast(args: any) {
    const { brightness, contrast } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.adjustBrightnessContrast(${brightness}, ${contrast});
        return { brightness: ${brightness}, contrast: ${contrast} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_levels(args: any) {
    const {
      inputStart = 0,
      inputEnd = 255,
      gamma = 1.0,
      outputStart = 0,
      outputEnd = 255,
    } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.adjustLevels(${inputStart}, ${inputEnd}, ${gamma}, ${outputStart}, ${outputEnd});
        return {
          inputRange: [${inputStart}, ${inputEnd}],
          gamma: ${gamma},
          outputRange: [${outputStart}, ${outputEnd}]
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_curves(args: any) {
    const { curvePoints } = args;
    const pointsStr = (curvePoints as number[][]).map((p) => `[${p[0]},${p[1]}]`).join(",");
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.adjustCurves([${pointsStr}]);
        return { curvePoints: ${curvePoints.length} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_invert() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.invert();
        return { inverted: true };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_desaturate() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.desaturate();
        return { desaturated: true };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
