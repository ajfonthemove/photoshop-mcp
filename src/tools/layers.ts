import { executeScript, ok, err, HELPERS } from "../bridge.ts";

export const tools = [
  {
    name: "ps_list_layers",
    description:
      "List all layers in the active document with name, kind, visibility, opacity, blend mode, and bounds. Includes both art layers and layer sets (groups).",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_create_layer",
    description: "Create a new empty layer in the active document.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Layer name" },
        opacity: { type: "number", description: "Layer opacity 0-100 (default 100)" },
        blendMode: {
          type: "string",
          enum: [
            "normal", "dissolve", "darken", "multiply", "colorBurn", "linearBurn",
            "lighten", "screen", "colorDodge", "linearDodge", "overlay", "softLight",
            "hardLight", "vividLight", "linearLight", "pinLight", "hardMix",
            "difference", "exclusion", "hue", "saturation", "color", "luminosity",
          ],
          description: "Blend mode (default normal)",
        },
      },
    },
  },
  {
    name: "ps_set_active_layer",
    description: "Set the active layer by name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Layer name" },
      },
      required: ["name"],
    },
  },
  {
    name: "ps_duplicate_layer",
    description: "Duplicate the active layer (or a named layer).",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name to duplicate. Omit for active layer." },
      },
    },
  },
  {
    name: "ps_delete_layer",
    description: "Delete the active layer (or a named layer).",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name to delete. Omit for active layer." },
      },
    },
  },
  {
    name: "ps_merge_visible",
    description: "Merge all visible layers.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_flatten",
    description: "Flatten the entire image into a single background layer.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_set_blend_mode",
    description: "Set the blend mode of a layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name. Omit for active layer." },
        mode: {
          type: "string",
          enum: [
            "normal", "dissolve", "darken", "multiply", "colorBurn", "linearBurn",
            "lighten", "screen", "colorDodge", "linearDodge", "overlay", "softLight",
            "hardLight", "vividLight", "linearLight", "pinLight", "hardMix",
            "difference", "exclusion", "hue", "saturation", "color", "luminosity",
          ],
          description: "Blend mode",
        },
      },
      required: ["mode"],
    },
  },
  {
    name: "ps_set_layer_opacity",
    description: "Set the opacity of a layer (0-100).",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name. Omit for active layer." },
        opacity: { type: "number", description: "Opacity 0-100" },
      },
      required: ["opacity"],
    },
  },
  {
    name: "ps_set_layer_visibility",
    description: "Show or hide a layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        target: { type: "string", description: "Layer name. Omit for active layer." },
        visible: { type: "boolean", description: "true to show, false to hide" },
      },
      required: ["visible"],
    },
  },
];

const BLEND_MODE_MAP: Record<string, string> = {
  normal: "BlendMode.NORMAL",
  dissolve: "BlendMode.DISSOLVE",
  darken: "BlendMode.DARKEN",
  multiply: "BlendMode.MULTIPLY",
  colorBurn: "BlendMode.COLORBURN",
  linearBurn: "BlendMode.LINEARBURN",
  lighten: "BlendMode.LIGHTEN",
  screen: "BlendMode.SCREEN",
  colorDodge: "BlendMode.COLORDODGE",
  linearDodge: "BlendMode.LINEARDODGE",
  overlay: "BlendMode.OVERLAY",
  softLight: "BlendMode.SOFTLIGHT",
  hardLight: "BlendMode.HARDLIGHT",
  vividLight: "BlendMode.VIVIDLIGHT",
  linearLight: "BlendMode.LINEARLIGHT",
  pinLight: "BlendMode.PINLIGHT",
  hardMix: "BlendMode.HARDMIX",
  difference: "BlendMode.DIFFERENCE",
  exclusion: "BlendMode.EXCLUSION",
  hue: "BlendMode.HUE",
  saturation: "BlendMode.SATURATION",
  color: "BlendMode.COLORBLEND",
  luminosity: "BlendMode.LUMINOSITY",
};

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_list_layers() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        var results = [];

        function blendName(bm) {
          switch (bm) {
            case BlendMode.NORMAL: return 'normal';
            case BlendMode.DISSOLVE: return 'dissolve';
            case BlendMode.DARKEN: return 'darken';
            case BlendMode.MULTIPLY: return 'multiply';
            case BlendMode.COLORBURN: return 'colorBurn';
            case BlendMode.LINEARBURN: return 'linearBurn';
            case BlendMode.LIGHTEN: return 'lighten';
            case BlendMode.SCREEN: return 'screen';
            case BlendMode.COLORDODGE: return 'colorDodge';
            case BlendMode.LINEARDODGE: return 'linearDodge';
            case BlendMode.OVERLAY: return 'overlay';
            case BlendMode.SOFTLIGHT: return 'softLight';
            case BlendMode.HARDLIGHT: return 'hardLight';
            case BlendMode.VIVIDLIGHT: return 'vividLight';
            case BlendMode.LINEARLIGHT: return 'linearLight';
            case BlendMode.PINLIGHT: return 'pinLight';
            case BlendMode.HARDMIX: return 'hardMix';
            case BlendMode.DIFFERENCE: return 'difference';
            case BlendMode.EXCLUSION: return 'exclusion';
            case BlendMode.HUE: return 'hue';
            case BlendMode.SATURATION: return 'saturation';
            case BlendMode.COLORBLEND: return 'color';
            case BlendMode.LUMINOSITY: return 'luminosity';
            default: return 'unknown';
          }
        }

        function kindName(k) {
          switch (k) {
            case LayerKind.NORMAL: return 'normal';
            case LayerKind.TEXT: return 'text';
            case LayerKind.SOLIDFILL: return 'solidFill';
            case LayerKind.GRADIENTFILL: return 'gradientFill';
            case LayerKind.PATTERNFILL: return 'patternFill';
            case LayerKind.LEVELS: return 'levels';
            case LayerKind.CURVES: return 'curves';
            case LayerKind.COLORBALANCE: return 'colorBalance';
            case LayerKind.BRIGHTNESSCONTRAST: return 'brightnessContrast';
            case LayerKind.HUESATURATION: return 'hueSaturation';
            case LayerKind.SMARTOBJECT: return 'smartObject';
            default: return 'other';
          }
        }

        function collectLayers(parent, depth) {
          for (var i = 0; i < parent.artLayers.length; i++) {
            var l = parent.artLayers[i];
            var info = {
              name: l.name,
              type: 'artLayer',
              kind: kindName(l.kind),
              visible: l.visible,
              opacity: l.opacity,
              blendMode: blendName(l.blendMode),
              depth: depth,
              isActive: (l === doc.activeLayer)
            };
            try {
              var b = l.bounds;
              info.bounds = {
                left: b[0].as('px'),
                top: b[1].as('px'),
                right: b[2].as('px'),
                bottom: b[3].as('px')
              };
            } catch(e) {}
            results.push(info);
          }
          for (var j = 0; j < parent.layerSets.length; j++) {
            var ls = parent.layerSets[j];
            results.push({
              name: ls.name,
              type: 'layerSet',
              kind: 'group',
              visible: ls.visible,
              opacity: ls.opacity,
              blendMode: blendName(ls.blendMode),
              depth: depth,
              children: ls.artLayers.length + ls.layerSets.length,
              isActive: (ls === doc.activeLayer)
            });
            collectLayers(ls, depth + 1);
          }
        }

        collectLayers(doc, 0);
        return results;
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_create_layer(args: any) {
    const name = args.name ? JSON.stringify(args.name) : '"Layer"';
    const opacity = args.opacity ?? 100;
    const blendMode = BLEND_MODE_MAP[args.blendMode ?? "normal"] ?? "BlendMode.NORMAL";
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        var layer = doc.artLayers.add();
        layer.name = ${name};
        layer.opacity = ${opacity};
        layer.blendMode = ${blendMode};
        return { name: layer.name, opacity: layer.opacity };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_set_active_layer(args: any) {
    const name = JSON.stringify(args.name);
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        doc.activeLayer = getLayer(${name});
        return { activeLayer: ${name} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_duplicate_layer(args: any) {
    const target = args.target;
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        var dup = layer.duplicate();
        return { name: dup.name, original: layer.name };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_delete_layer(args: any) {
    const target = args.target;
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        var name = layer.name;
        layer.remove();
        return { deleted: name };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_merge_visible() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.mergeVisibleLayers();
        return { merged: true, layerCount: doc.layers.length };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_flatten() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.flatten();
        return { flattened: true, layerCount: doc.layers.length };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_set_blend_mode(args: any) {
    const target = args.target;
    const mode = BLEND_MODE_MAP[args.mode] ?? "BlendMode.NORMAL";
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        layer.blendMode = ${mode};
        return { layer: layer.name, blendMode: ${JSON.stringify(args.mode)} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_set_layer_opacity(args: any) {
    const target = args.target;
    const opacity = args.opacity;
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        layer.opacity = ${opacity};
        return { layer: layer.name, opacity: layer.opacity };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_set_layer_visibility(args: any) {
    const target = args.target;
    const visible = args.visible;
    try {
      const result = await executeScript(`
        ${HELPERS}
        var doc = app.activeDocument;
        var layer = ${target ? `getLayer(${JSON.stringify(target)})` : "doc.activeLayer"};
        layer.visible = ${visible};
        return { layer: layer.name, visible: layer.visible };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
