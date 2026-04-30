import { executeScript, ok, err } from "../bridge.ts";

export const tools = [
  {
    name: "ps_gaussian_blur",
    description: "Apply a Gaussian blur to the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        radius: { type: "number", description: "Blur radius in pixels (0.1-250)" },
      },
      required: ["radius"],
    },
  },
  {
    name: "ps_unsharp_mask",
    description: "Apply Unsharp Mask sharpening to the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: { type: "number", description: "Sharpening amount 1-500 percent" },
        radius: { type: "number", description: "Radius 0.1-250 pixels" },
        threshold: { type: "number", description: "Threshold 0-255 levels" },
      },
      required: ["amount", "radius", "threshold"],
    },
  },
  {
    name: "ps_motion_blur",
    description: "Apply a motion blur to the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        angle: { type: "number", description: "Blur angle in degrees (-360 to 360)" },
        distance: { type: "number", description: "Blur distance in pixels (1-2000)" },
      },
      required: ["angle", "distance"],
    },
  },
  {
    name: "ps_noise",
    description: "Add noise to the active layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: { type: "number", description: "Noise amount (0.1-400)" },
        distribution: {
          type: "string",
          enum: ["uniform", "gaussian"],
          description: "Noise distribution (default gaussian)",
        },
        monochromatic: {
          type: "boolean",
          description: "Monochromatic noise (default false)",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "ps_median",
    description: "Apply a median noise filter to the active layer. Useful for removing noise while preserving edges.",
    inputSchema: {
      type: "object" as const,
      properties: {
        radius: { type: "number", description: "Median radius in pixels (1-100)" },
      },
      required: ["radius"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_gaussian_blur(args: any) {
    const { radius } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.applyGaussianBlur(${radius});
        return { blurred: true, radius: ${radius} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_unsharp_mask(args: any) {
    const { amount, radius, threshold } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.applyUnSharpMask(${amount}, ${radius}, ${threshold});
        return { sharpened: true, amount: ${amount}, radius: ${radius}, threshold: ${threshold} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_motion_blur(args: any) {
    const { angle, distance } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.applyMotionBlur(${angle}, ${distance});
        return { blurred: true, angle: ${angle}, distance: ${distance} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_noise(args: any) {
    const { amount, distribution = "gaussian", monochromatic = false } = args;
    const dist =
      distribution === "uniform"
        ? "NoiseDistribution.UNIFORM"
        : "NoiseDistribution.GAUSSIAN";
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.applyAddNoise(${amount}, ${dist}, ${monochromatic});
        return { noise: true, amount: ${amount}, distribution: ${JSON.stringify(distribution)}, monochromatic: ${monochromatic} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_median(args: any) {
    const { radius } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.activeLayer.applyMedianNoise(${radius});
        return { median: true, radius: ${radius} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
