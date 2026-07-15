import railPlansData from "../../../../data/trips/europa-2026/rail-plans.json";

export type RailPlanKind = "saver_day_pass" | "regional_flexible";

export type RailPlan = {
  id: string;
  days: number[];
  kind: RailPlanKind;
  title: string;
  summary: string;
  notes?: string[];
  options?: Array<{ label: "Ideal" | "Alternativo" | "No recomendado"; segments: string[]; margin: string }>;
};

export const railPlans = railPlansData as RailPlan[];

export function getRailPlansForDay(day: number) {
  return railPlans.filter((plan) => plan.days.includes(day));
}

export function railPlanLabel(kind: RailPlanKind) {
  return kind === "saver_day_pass" ? "Cubierto por Saver Day Pass" : "Regional flexible - compra en estación";
}
