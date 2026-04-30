import { executeScript, ok, err } from "../bridge.ts";

export const tools = [
  {
    name: "ps_get_document",
    description:
      "Get information about the active Photoshop document: name, dimensions, resolution, color mode, bit depth, layer count, and file path.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_new_document",
    description:
      "Create a new Photoshop document. Defaults to 1920x1080 at 300 PPI, RGB mode.",
    inputSchema: {
      type: "object" as const,
      properties: {
        width: { type: "number", description: "Width in pixels (default 1920)" },
        height: { type: "number", description: "Height in pixels (default 1080)" },
        resolution: { type: "number", description: "Resolution in PPI (default 300)" },
        name: { type: "string", description: "Document name" },
        mode: {
          type: "string",
          enum: ["RGB", "CMYK", "Grayscale", "Bitmap", "Lab"],
          description: "Color mode (default RGB)",
        },
      },
    },
  },
  {
    name: "ps_save_document",
    description: "Save the active document. Optionally save-as to a new path.",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute file path for Save As. Omit to save in place.",
        },
      },
    },
  },
  {
    name: "ps_close_document",
    description: "Close the active document.",
    inputSchema: {
      type: "object" as const,
      properties: {
        save: {
          type: "string",
          enum: ["save", "discard", "ask"],
          description: "Whether to save changes (default: ask)",
        },
      },
    },
  },
  {
    name: "ps_resize_image",
    description:
      "Resize the active document image. Provide width and/or height in pixels. Optionally change resolution and resample method.",
    inputSchema: {
      type: "object" as const,
      properties: {
        width: { type: "number", description: "New width in pixels" },
        height: { type: "number", description: "New height in pixels" },
        resolution: { type: "number", description: "New resolution in PPI" },
        resampleMethod: {
          type: "string",
          enum: ["bicubic", "bilinear", "nearestNeighbor", "bicubicSharper", "bicubicSmoother", "none"],
          description: "Resample method (default bicubic). Use 'none' to change resolution without resampling.",
        },
      },
    },
  },
  {
    name: "ps_resize_canvas",
    description:
      "Resize the canvas of the active document. Content stays in place; canvas expands or shrinks around the anchor point.",
    inputSchema: {
      type: "object" as const,
      properties: {
        width: { type: "number", description: "New canvas width in pixels" },
        height: { type: "number", description: "New canvas height in pixels" },
        anchor: {
          type: "string",
          enum: [
            "topLeft", "topCenter", "topRight",
            "middleLeft", "middleCenter", "middleRight",
            "bottomLeft", "bottomCenter", "bottomRight",
          ],
          description: "Anchor position (default middleCenter)",
        },
      },
      required: ["width", "height"],
    },
  },
  {
    name: "ps_crop",
    description:
      "Crop the active document to the given bounds (in pixels from the top-left origin).",
    inputSchema: {
      type: "object" as const,
      properties: {
        left: { type: "number", description: "Left edge in pixels" },
        top: { type: "number", description: "Top edge in pixels" },
        right: { type: "number", description: "Right edge in pixels" },
        bottom: { type: "number", description: "Bottom edge in pixels" },
      },
      required: ["left", "top", "right", "bottom"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_get_document() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        var modeName;
        switch (doc.mode) {
          case DocumentMode.RGB: modeName = 'RGB'; break;
          case DocumentMode.CMYK: modeName = 'CMYK'; break;
          case DocumentMode.GRAYSCALE: modeName = 'Grayscale'; break;
          case DocumentMode.BITMAP: modeName = 'Bitmap'; break;
          case DocumentMode.LAB: modeName = 'Lab'; break;
          case DocumentMode.INDEXEDCOLOR: modeName = 'Indexed'; break;
          case DocumentMode.DUOTONE: modeName = 'Duotone'; break;
          case DocumentMode.MULTICHANNEL: modeName = 'Multichannel'; break;
          default: modeName = 'Unknown';
        }
        var layerCount = 0;
        try { layerCount = doc.layers.length; } catch(e) {}
        return {
          name: doc.name,
          path: doc.path ? doc.path.fsName : null,
          width: doc.width.as('px'),
          height: doc.height.as('px'),
          resolution: doc.resolution,
          mode: modeName,
          bitDepth: doc.bitsPerChannel == BitsPerChannelType.EIGHT ? 8 : doc.bitsPerChannel == BitsPerChannelType.SIXTEEN ? 16 : 32,
          layerCount: layerCount,
          saved: doc.saved
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_new_document(args: any) {
    const w = args.width ?? 1920;
    const h = args.height ?? 1080;
    const res = args.resolution ?? 300;
    const name = args.name ? JSON.stringify(args.name) : '"Untitled"';
    const modeMap: Record<string, string> = {
      RGB: "NewDocumentMode.RGB",
      CMYK: "NewDocumentMode.CMYK",
      Grayscale: "NewDocumentMode.GRAYSCALE",
      Bitmap: "NewDocumentMode.BITMAP",
      Lab: "NewDocumentMode.LAB",
    };
    const mode = modeMap[args.mode ?? "RGB"] ?? "NewDocumentMode.RGB";
    try {
      const result = await executeScript(`
        var doc = app.documents.add(
          new UnitValue(${w}, 'px'),
          new UnitValue(${h}, 'px'),
          ${res},
          ${name},
          ${mode}
        );
        return {
          name: doc.name,
          width: doc.width.as('px'),
          height: doc.height.as('px'),
          resolution: doc.resolution
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_save_document(args: any) {
    const path = args.path;
    try {
      const result = await executeScript(
        path
          ? `var doc = app.activeDocument;
             doc.saveAs(new File(${JSON.stringify(path)}));
             return { saved: true, path: ${JSON.stringify(path)} };`
          : `var doc = app.activeDocument;
             doc.save();
             return { saved: true, name: doc.name };`
      );
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_close_document(args: any) {
    const saveOpt =
      args.save === "save"
        ? "SaveOptions.SAVECHANGES"
        : args.save === "discard"
          ? "SaveOptions.DONOTSAVECHANGES"
          : "SaveOptions.PROMPTTOSAVECHANGES";
    try {
      const result = await executeScript(`
        app.activeDocument.close(${saveOpt});
        return 'closed';
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_resize_image(args: any) {
    const { width, height, resolution, resampleMethod = "bicubic" } = args;
    const methodMap: Record<string, string> = {
      bicubic: "ResampleMethod.BICUBIC",
      bilinear: "ResampleMethod.BILINEAR",
      nearestNeighbor: "ResampleMethod.NEARESTNEIGHBOR",
      bicubicSharper: "ResampleMethod.BICUBICSHARPER",
      bicubicSmoother: "ResampleMethod.BICUBICSMOOTHER",
      none: "ResampleMethod.NONE",
    };
    const method = methodMap[resampleMethod] ?? "ResampleMethod.BICUBIC";
    const wArg = width !== undefined ? `new UnitValue(${width}, 'px')` : "undefined";
    const hArg = height !== undefined ? `new UnitValue(${height}, 'px')` : "undefined";
    const rArg = resolution !== undefined ? String(resolution) : "undefined";
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.resizeImage(${wArg}, ${hArg}, ${rArg}, ${method});
        return {
          width: doc.width.as('px'),
          height: doc.height.as('px'),
          resolution: doc.resolution
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_resize_canvas(args: any) {
    const { width, height, anchor = "middleCenter" } = args;
    const anchorMap: Record<string, string> = {
      topLeft: "AnchorPosition.TOPLEFT",
      topCenter: "AnchorPosition.TOPCENTER",
      topRight: "AnchorPosition.TOPRIGHT",
      middleLeft: "AnchorPosition.MIDDLELEFT",
      middleCenter: "AnchorPosition.MIDDLECENTER",
      middleRight: "AnchorPosition.MIDDLERIGHT",
      bottomLeft: "AnchorPosition.BOTTOMLEFT",
      bottomCenter: "AnchorPosition.BOTTOMCENTER",
      bottomRight: "AnchorPosition.BOTTOMRIGHT",
    };
    const ap = anchorMap[anchor] ?? "AnchorPosition.MIDDLECENTER";
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.resizeCanvas(new UnitValue(${width}, 'px'), new UnitValue(${height}, 'px'), ${ap});
        return {
          width: doc.width.as('px'),
          height: doc.height.as('px')
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_crop(args: any) {
    const { left, top, right, bottom } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.crop([new UnitValue(${left},'px'), new UnitValue(${top},'px'), new UnitValue(${right},'px'), new UnitValue(${bottom},'px')]);
        return {
          width: doc.width.as('px'),
          height: doc.height.as('px')
        };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
