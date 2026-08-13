import type { ResearchQuery } from "@/features/content-pipeline/types";

export interface ResearchQueryPlan {
  topic: string;
  queries: ResearchQuery[];
}

const VIETNAMESE_MARKS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/iu;

export function normalizeResearchTopic(value: unknown): string {
  if (typeof value !== "string") throw new Error("Topic must contain between 3 and 300 characters.");
  const topic = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (topic.length < 3 || topic.length > 300) throw new Error("Topic must contain between 3 and 300 characters.");
  return topic;
}

function boundedQuery(topic: string, suffix = ""): string {
  const suffixWords = suffix ? suffix.split(" ") : [];
  const maxTopicWords = 50 - suffixWords.length;
  const topicWords = topic.split(" ").slice(0, maxTopicWords);
  return [...topicWords, ...suffixWords].join(" ").slice(0, 400).trim();
}

export function planResearchQueries(value: unknown): ResearchQueryPlan {
  const topic = normalizeResearchTopic(value);
  const vietnameseTopic = VIETNAMESE_MARKS.test(topic);
  const topicLanguage = vietnameseTopic ? "vi" : "en";
  const topicCountry = vietnameseTopic ? "VN" : "US";
  return {
    topic,
    queries: [
      { query: boundedQuery(topic, "hướng dẫn học tập tiếng Việt"), searchLanguage: "vi", country: "VN" },
      { query: boundedQuery(topic), searchLanguage: topicLanguage, country: topicCountry },
      vietnameseTopic
        ? { query: boundedQuery(topic, "tài liệu chính thức tham khảo"), searchLanguage: "vi", country: "VN" }
        : { query: boundedQuery(topic, "official documentation reference"), searchLanguage: "en", country: "US" },
    ],
  };
}
