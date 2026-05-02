import { describe, expect, it } from "vitest";
import { applyHalfSplit, createDefaultMilestonePlanValues, milestoneFormValuesToInput } from "./milestone-plan";

describe("milestone-plan helpers", () => {
  it("applies a 50/50 split to two milestone amounts", () => {
    const result = applyHalfSplit(3200, createDefaultMilestonePlanValues(2));

    expect(result[0].amount).toBe("1600.00");
    expect(result[1].amount).toBe("1600.00");
  });

  it("serializes milestone form values into the API payload", () => {
    const input = milestoneFormValuesToInput([
      {
        sequence: "1",
        title: "Kickoff",
        description: "Initial direction",
        amount: "1600",
        dueAt: "2026-05-02"
      },
      {
        sequence: "2",
        title: "Final delivery",
        description: "Approved handoff",
        amount: "1600",
        dueAt: "2026-05-09"
      }
    ]);

    expect(input.milestones).toHaveLength(2);
    expect(input.milestones[0].sequence).toBe(1);
    expect(input.milestones[1].amount).toBe(1600);
  });
});
