export interface FormationPosition {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  role: string;
}

export interface Formation {
  name: string;
  positions: FormationPosition[]; // 11 positions (GK + 10 outfield)
}

// Positions are laid out on a vertical pitch (top = goal line, bottom = own goal)
// x: left-right (0=left, 100=right), y: top-bottom (0=opponent goal, 100=own goal)
export const formations: Record<string, Formation> = {
  "4-4-2": {
    name: "4-4-2",
    positions: [
      { x: 50, y: 90, role: "POR" },
      { x: 15, y: 72, role: "LI" },
      { x: 38, y: 75, role: "DFC" },
      { x: 62, y: 75, role: "DFC" },
      { x: 85, y: 72, role: "LD" },
      { x: 15, y: 50, role: "MI" },
      { x: 38, y: 53, role: "MC" },
      { x: 62, y: 53, role: "MC" },
      { x: 85, y: 50, role: "MD" },
      { x: 35, y: 25, role: "DC" },
      { x: 65, y: 25, role: "DC" },
    ],
  },
  "4-3-3": {
    name: "4-3-3",
    positions: [
      { x: 50, y: 90, role: "POR" },
      { x: 15, y: 72, role: "LI" },
      { x: 38, y: 75, role: "DFC" },
      { x: 62, y: 75, role: "DFC" },
      { x: 85, y: 72, role: "LD" },
      { x: 25, y: 52, role: "MC" },
      { x: 50, y: 48, role: "MC" },
      { x: 75, y: 52, role: "MC" },
      { x: 18, y: 25, role: "EI" },
      { x: 50, y: 20, role: "DC" },
      { x: 82, y: 25, role: "ED" },
    ],
  },
  "3-5-2": {
    name: "3-5-2",
    positions: [
      { x: 50, y: 90, role: "POR" },
      { x: 25, y: 75, role: "DFC" },
      { x: 50, y: 78, role: "DFC" },
      { x: 75, y: 75, role: "DFC" },
      { x: 10, y: 52, role: "CAI" },
      { x: 35, y: 55, role: "MC" },
      { x: 50, y: 50, role: "MC" },
      { x: 65, y: 55, role: "MC" },
      { x: 90, y: 52, role: "CAD" },
      { x: 35, y: 25, role: "DC" },
      { x: 65, y: 25, role: "DC" },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    positions: [
      { x: 50, y: 90, role: "POR" },
      { x: 15, y: 72, role: "LI" },
      { x: 38, y: 75, role: "DFC" },
      { x: 62, y: 75, role: "DFC" },
      { x: 85, y: 72, role: "LD" },
      { x: 35, y: 58, role: "MCD" },
      { x: 65, y: 58, role: "MCD" },
      { x: 18, y: 38, role: "EI" },
      { x: 50, y: 35, role: "MCO" },
      { x: 82, y: 38, role: "ED" },
      { x: 50, y: 18, role: "DC" },
    ],
  },
  "5-3-2": {
    name: "5-3-2",
    positions: [
      { x: 50, y: 90, role: "POR" },
      { x: 10, y: 70, role: "CAI" },
      { x: 30, y: 75, role: "DFC" },
      { x: 50, y: 78, role: "DFC" },
      { x: 70, y: 75, role: "DFC" },
      { x: 90, y: 70, role: "CAD" },
      { x: 30, y: 50, role: "MC" },
      { x: 50, y: 48, role: "MC" },
      { x: 70, y: 50, role: "MC" },
      { x: 35, y: 25, role: "DC" },
      { x: 65, y: 25, role: "DC" },
    ],
  },
};

export const formationKeys = Object.keys(formations);
