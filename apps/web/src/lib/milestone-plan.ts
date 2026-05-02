"use client";

import {
  milestonePlanSchema,
  type MilestonePlanInput,
  type MilestoneRecord
} from "@gighub/shared";

export type MilestoneFormValue = {
  sequence: string;
  title: string;
  description: string;
  amount: string;
  dueAt: string;
};

const createDefaultMilestone = (sequence: number): MilestoneFormValue => ({
  sequence: String(sequence),
  title: `Milestone ${sequence}`,
  description: "",
  amount: "",
  dueAt: ""
});

export const createDefaultMilestonePlanValues = (count: number) =>
  Array.from({ length: count }, (_, index) => createDefaultMilestone(index + 1));

export const milestoneRecordsToFormValues = (
  milestones: MilestoneRecord[],
  count: number
) => {
  if (milestones.length === 0) {
    return createDefaultMilestonePlanValues(count);
  }

  return milestones.map((milestone) => ({
    sequence: String(milestone.sequence),
    title: milestone.title,
    description: milestone.description,
    amount: milestone.amount.toFixed(2),
    dueAt: milestone.dueAt ? milestone.dueAt.slice(0, 10) : ""
  }));
};

export const milestoneFormValuesToInput = (
  milestones: MilestoneFormValue[]
): MilestonePlanInput =>
  milestonePlanSchema.parse({
    milestones: milestones.map((milestone) => ({
      sequence: milestone.sequence,
      title: milestone.title,
      description: milestone.description,
      amount: milestone.amount,
      dueAt: milestone.dueAt
    }))
  });

export const applyHalfSplit = (totalBudget: number, milestones: MilestoneFormValue[]) => {
  if (milestones.length !== 2) {
    return milestones;
  }

  const firstAmount = Number((totalBudget / 2).toFixed(2));
  const secondAmount = Number((totalBudget - firstAmount).toFixed(2));

  return milestones.map((milestone, index) => ({
    ...milestone,
    amount: (index === 0 ? firstAmount : secondAmount).toFixed(2)
  }));
};
