import { executeScript, ok, err } from "../bridge.ts";

export const tools = [
  {
    name: "ps_select_all",
    description: "Select the entire canvas.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_deselect",
    description: "Deselect everything.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_select_rectangle",
    description:
      "Create a rectangular selection. Coordinates in pixels from the top-left.",
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
  {
    name: "ps_invert_selection",
    description: "Invert the current selection.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ps_feather_selection",
    description: "Feather the current selection by a given radius.",
    inputSchema: {
      type: "object" as const,
      properties: {
        radius: { type: "number", description: "Feather radius in pixels" },
      },
      required: ["radius"],
    },
  },
];

export const handlers: Record<string, (args: any) => Promise<any>> = {
  async ps_select_all() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.selection.selectAll();
        return { selected: 'all' };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_deselect() {
    try {
      await executeScript(`
        var doc = app.activeDocument;
        doc.selection.deselect();
      `);
      return ok("Deselected all");
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_select_rectangle(args: any) {
    const { left, top, right, bottom } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        var region = [[${left},${top}],[${right},${top}],[${right},${bottom}],[${left},${bottom}]];
        doc.selection.select(region);
        return { selection: { left: ${left}, top: ${top}, right: ${right}, bottom: ${bottom} } };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_invert_selection() {
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.selection.invert();
        return { inverted: true };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },

  async ps_feather_selection(args: any) {
    const { radius } = args;
    try {
      const result = await executeScript(`
        var doc = app.activeDocument;
        doc.selection.feather(${radius});
        return { feathered: true, radius: ${radius} };
      `);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  },
};
