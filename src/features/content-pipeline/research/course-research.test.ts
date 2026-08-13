import { describe, expect, it } from "vitest";

import { planResearchQueries } from "./course-research";

describe("planResearchQueries", () => {
  it("normalizes the topic and rejects values outside 3..300 characters", () => {
    expect(planResearchQueries("  Lập   trình\u00a0Python  ").topic).toBe("Lập trình Python");
    expect(() => planResearchQueries("  a ")).toThrow(/3.*300/);
    expect(() => planResearchQueries("x".repeat(301))).toThrow(/3.*300/);
    expect(() => planResearchQueries(null)).toThrow(/3.*300/);
  });

  it("is deterministic and Vietnamese-first", () => {
    const first = planResearchQueries("Kiến trúc phần mềm");
    const second = planResearchQueries("Kiến trúc phần mềm");
    expect(first).toEqual(second);
    expect(first.queries[0]).toEqual({
      query: "Kiến trúc phần mềm hướng dẫn học tập tiếng Việt",
      searchLanguage: "vi",
      country: "VN",
    });
    expect(first.queries[2].query).toBe("Kiến trúc phần mềm tài liệu chính thức tham khảo");
  });

  it("adds an English official-reference variant for an English topic", () => {
    const plan = planResearchQueries("Python async programming");
    expect(plan.queries).toEqual([
      { query: "Python async programming hướng dẫn học tập tiếng Việt", searchLanguage: "vi", country: "VN" },
      { query: "Python async programming", searchLanguage: "en", country: "US" },
      { query: "Python async programming official documentation reference", searchLanguage: "en", country: "US" },
    ]);
  });

  it("never emits more than three provider-bounded queries", () => {
    const topic = Array.from({ length: 60 }, (_, index) => `term${index}`).join(" ").slice(0, 300);
    const plan = planResearchQueries(topic);
    expect(plan.queries).toHaveLength(3);
    for (const item of plan.queries) {
      expect(item.query.length).toBeLessThanOrEqual(400);
      expect(item.query.split(/\s+/u).length).toBeLessThanOrEqual(50);
    }
  });
});
