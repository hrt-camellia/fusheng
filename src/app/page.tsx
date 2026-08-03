import Link from "next/link";
import {
  ArrowRight,
  Gem,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "准确排盘，温柔解读",
    text: "计算与AI解读分离，命盘结构化后再进入对话。",
  },
  {
    icon: MessageCircleHeart,
    title: "不替你决定",
    text: "围绕真实困惑梳理选择、风险与下一步行动。",
  },
  {
    icon: Gem,
    title: "设计你的仪式",
    text: "按主题、审美与尺寸DIY一条属于当前阶段的手串。",
  },
  {
    icon: ShieldCheck,
    title: "跨端与隐私",
    text: "手机、平板和电脑统一体验；未登录也可先试用。",
  },
];

const dailySign = [
  ["专注", "整理当前优先级"],
  ["关系", "表达真实的需要"],
  ["行动", "完成一个小目标"],
] as const;

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden bg-hero-glow py-14 sm:py-20 lg:py-24">
        <div className="shell">
          <div className="mx-auto max-w-5xl text-center">
            <p className="eyebrow">AI 心灵导航 · 文化娱乐体验</p>

            <h1 className="mt-6 font-serif text-[2rem] font-semibold leading-[1.35] tracking-tight sm:text-5xl sm:leading-[1.25] lg:text-6xl">
              <span className="block sm:whitespace-nowrap">
                人生如梦，<span className="text-brand-700">每一次迷茫</span>
              </span>
              <span className="mt-1 block sm:whitespace-nowrap">
                都值得被温柔以待
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              浮生不替你预言结果，而是借助传统命理框架与AI对话，
              帮你看见自己的倾向、顾虑和可以采取的行动。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/bazi" className="btn-primary w-full sm:w-auto">
                开始免费排盘
                <ArrowRight size={18} />
              </Link>

              <Link href="/bracelet" className="btn-secondary w-full sm:w-auto">
                <Gem size={18} />
                设计我的手串
              </Link>
            </div>

            <p className="mx-auto mt-4 max-w-2xl text-xs leading-5 text-muted">
              无需注册即可体验。内容仅供文化娱乐和自我反思，不构成医疗、法律、投资或人生决策建议。
            </p>
          </div>

          <div className="card relative mx-auto mt-12 max-w-5xl overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand-200/60 blur-3xl" />

            <div className="relative text-center">
              <p className="text-sm text-muted">今日的浮生签</p>
              <blockquote className="mx-auto mt-4 max-w-3xl font-serif text-2xl leading-relaxed sm:text-3xl">
                “先把眼前的一步走稳，答案会在行动中逐渐清晰。”
              </blockquote>
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              {dailySign.map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-brand-50 p-5 text-center">
                  <strong className="text-brand-800">{title}</strong>
                  <p className="mt-2 text-sm leading-5 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                <Icon size={21} />
              </span>
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
