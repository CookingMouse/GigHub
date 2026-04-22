import { describe, expect, it } from "vitest";
import { jobFormValuesToInput } from "./job-form";

describe("jobFormValuesToInput", () => {
  it("normalizes multi-line checklist fields into structured brief arrays", () => {
    const result = jobFormValuesToInput({
      title: "Campaign landing page redesign",
      budget: "3200",
      milestoneCount: "2",
      overview:
        "Build a mobile-first campaign page that explains the financing offer and captures qualified leads for the SME team.",
      scopeText: "Design the page layout\nMap the content hierarchy\n",
      deliverablesText: "Figma file\nHandoff note",
      requirementsText: "Use the current brand palette",
      acceptanceCriteriaText: "CTA hierarchy is clear\nAll required sections are present",
      timelineStartDate: "2026-04-25",
      timelineEndDate: "2026-05-02",
      timelineNotes: "First review in three working days."
    });

    expect(result.budget).toBe(3200);
    expect(result.milestoneCount).toBe(2);
    expect(result.brief.scope).toEqual(["Design the page layout", "Map the content hierarchy"]);
    expect(result.brief.deliverables).toEqual(["Figma file", "Handoff note"]);
  });
});
