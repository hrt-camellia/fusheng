export interface Crystal {
  id: string;
  name: string;
  color: string;
  gradient: string;
  tags: string[];
  meaning: string;
}

export const crystals: Crystal[] = [
  {
    id: "amethyst",
    name: "紫水晶",
    color: "#8C73D9",
    gradient:
      "radial-gradient(circle at 32% 25%, #EDE7FF 0, #A78BE8 38%, #6D4BB8 78%, #49307E 100%)",
    tags: ["专注", "平静", "清冷"],
    meaning: "常被赋予平静与专注的文化寓意。",
  },
  {
    id: "rose",
    name: "粉水晶",
    color: "#E9AFC3",
    gradient:
      "radial-gradient(circle at 32% 25%, #FFF1F6 0, #F0B9CD 45%, #CE829E 100%)",
    tags: ["关系", "温柔", "浪漫"],
    meaning: "常用于表达温柔、自我接纳与关系关怀。",
  },
  {
    id: "clear",
    name: "白水晶",
    color: "#E8E9F4",
    gradient:
      "radial-gradient(circle at 32% 25%, #FFFFFF 0, #E2E5F4 50%, #AEB4CB 100%)",
    tags: ["清晰", "百搭", "通勤"],
    meaning: "清透、克制，适合作为平衡配色的基础珠。",
  },
  {
    id: "citrine",
    name: "黄水晶",
    color: "#E6BE65",
    gradient:
      "radial-gradient(circle at 32% 25%, #FFF6C8 0, #E8C36E 45%, #B68A35 100%)",
    tags: ["行动", "明亮", "活力"],
    meaning: "常被用于表达行动力、明朗感与积极期待。",
  },
  {
    id: "aventurine",
    name: "绿东陵",
    color: "#82BAA0",
    gradient:
      "radial-gradient(circle at 32% 25%, #E9FFF3 0, #8AC4A6 45%, #4E8468 100%)",
    tags: ["成长", "自然", "稳定"],
    meaning: "绿色调带来自然、成长和稳定的视觉感受。",
  },
  {
    id: "obsidian",
    name: "黑曜石",
    color: "#37353E",
    gradient:
      "radial-gradient(circle at 32% 25%, #7D7988 0, #37343D 48%, #15141A 100%)",
    tags: ["边界", "力量", "极简"],
    meaning: "深色材质适合表达边界感、坚定与极简风格。",
  },
];
