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
      { x: 50, y: 90, role: "GK" },
      { x: 15, y: 72, role: "LB" },
      { x: 38, y: 75, role: "CB" },
      { x: 62, y: 75, role: "CB" },
      { x: 85, y: 72, role: "RB" },
      { x: 15, y: 50, role: "LM" },
      { x: 38, y: 53, role: "CM" },
      { x: 62, y: 53, role: "CM" },
      { x: 85, y: 50, role: "RM" },
      { x: 35, y: 25, role: "ST" },
      { x: 65, y: 25, role: "ST" },
    ],
  },
  "4-3-3": {
    name: "4-3-3",
    positions: [
      { x: 50, y: 90, role: "GK" },
      { x: 15, y: 72, role: "LB" },
      { x: 38, y: 75, role: "CB" },
      { x: 62, y: 75, role: "CB" },
      { x: 85, y: 72, role: "RB" },
      { x: 25, y: 52, role: "CM" },
      { x: 50, y: 48, role: "CM" },
      { x: 75, y: 52, role: "CM" },
      { x: 18, y: 25, role: "LW" },
      { x: 50, y: 20, role: "ST" },
      { x: 82, y: 25, role: "RW" },
    ],
  },
  "3-5-2": {
    name: "3-5-2",
    positions: [
      { x: 50, y: 90, role: "GK" },
      { x: 25, y: 75, role: "CB" },
      { x: 50, y: 78, role: "CB" },
      { x: 75, y: 75, role: "CB" },
      { x: 10, y: 52, role: "LWB" },
      { x: 35, y: 55, role: "CM" },
      { x: 50, y: 50, role: "CM" },
      { x: 65, y: 55, role: "CM" },
      { x: 90, y: 52, role: "RWB" },
      { x: 35, y: 25, role: "ST" },
      { x: 65, y: 25, role: "ST" },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    positions: [
      { x: 50, y: 90, role: "GK" },
      { x: 15, y: 72, role: "LB" },
      { x: 38, y: 75, role: "CB" },
      { x: 62, y: 75, role: "CB" },
      { x: 85, y: 72, role: "RB" },
      { x: 35, y: 58, role: "CDM" },
      { x: 65, y: 58, role: "CDM" },
      { x: 18, y: 38, role: "LW" },
      { x: 50, y: 35, role: "CAM" },
      { x: 82, y: 38, role: "RW" },
      { x: 50, y: 18, role: "ST" },
    ],
  },
  "5-3-2": {
    name: "5-3-2",
    positions: [
      { x: 50, y: 90, role: "GK" },
      { x: 10, y: 70, role: "LWB" },
      { x: 30, y: 75, role: "CB" },
      { x: 50, y: 78, role: "CB" },
      { x: 70, y: 75, role: "CB" },
      { x: 90, y: 70, role: "RWB" },
      { x: 30, y: 50, role: "CM" },
      { x: 50, y: 48, role: "CM" },
      { x: 70, y: 50, role: "CM" },
      { x: 35, y: 25, role: "ST" },
      { x: 65, y: 25, role: "ST" },
    ],
  },
};

export const formationKeys = Object.keys(formations);
