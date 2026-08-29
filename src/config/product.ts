export const PRODUCT_NAME = "LearningApp";
export const PRODUCT_DESCRIPTION =
  "Nền tảng học theo lộ trình từ nguồn kiến thức đáng tin cậy, kết hợp bài học, luyện tập và hỗ trợ AI phù hợp.";

export function createProductTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${PRODUCT_NAME}` : PRODUCT_NAME;
}
