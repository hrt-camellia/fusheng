import { BraceletEditor } from "@/components/bracelet/BraceletEditor";

export const metadata = {
  title: "水晶手串DIY",
};

export default function BraceletPage() {
  return (
    <main className="shell py-8 sm:py-12">
      <div className="mb-7 max-w-3xl">
        <p className="eyebrow">水晶手串DIY工坊</p>
        <h1 className="mt-3 font-serif text-4xl">
          为当前阶段，设计一份个人仪式
        </h1>
        <p className="mt-3 leading-7 text-muted">
          从主题、尺寸、配色到珠子顺序都可以自行调整。MVP使用SVG实时预览，手机和电脑均可操作。
        </p>
      </div>
      <BraceletEditor />
    </main>
  );
}
