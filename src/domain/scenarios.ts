import type { Scenario } from './types';

export const CUSTOM_SCENARIO_TITLE_MAX_LENGTH = 60;
export const CUSTOM_SCENARIO_OBJECTIVE_MAX_LENGTH = 240;

export function createCustomScenario(title: string, objective: string): Scenario | null {
  const normalizedTitle = title.trim().slice(0, CUSTOM_SCENARIO_TITLE_MAX_LENGTH);
  const normalizedObjective = objective.trim().slice(0, CUSTOM_SCENARIO_OBJECTIVE_MAX_LENGTH);

  if (!normalizedTitle || !normalizedObjective) return null;

  return {
    id: 'custom',
    title: normalizedTitle,
    subtitle: 'Your own practice scenario',
    icon: '✦',
    objective: normalizedObjective,
  };
}
