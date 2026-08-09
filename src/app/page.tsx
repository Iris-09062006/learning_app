import Link from "next/link";

const PRODUCT_PILLARS = [
  {
    step: "01",
    title: "Lộ trình rõ ràng",
    description: "Đi từ nền tảng Python đến từng bài học ngắn, biết mình đang ở đâu và nên học gì tiếp theo.",
  },
  {
    step: "02",
    title: "Thực hành ngay",
    description: "Củng cố kiến thức bằng bài Predict the Output và Fix the Bug với phản hồi đúng, sai tức thì.",
  },
  {
    step: "03",
    title: "AI Mentor an toàn",
    description: "Nhận lời giải thích theo đúng ngữ cảnh bài làm; khóa AI và đáp án đúng luôn được xử lý phía server.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="relative z-20 border-b border-white/10">
        <nav aria-label="Điều hướng trang chủ" className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 font-mono text-sm">Py</span>
            Python Learning
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/courses" className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:flex">Khóa học</Link>
            <Link href="/login" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-slate-200 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">Đăng nhập</Link>
            <Link href="/register" className="flex min-h-10 items-center rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Bắt đầu học</Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28">
        <div aria-hidden="true" className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Python cho người mới bắt đầu</p>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Học Python bằng cách <span className="text-indigo-400">thật sự làm bài.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Một hành trình học có cấu trúc: chọn khóa học, đi theo roadmap, sửa lỗi trong code và hiểu sâu hơn với AI Mentor khi bạn cần.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-500 px-6 font-bold shadow-lg shadow-indigo-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-400 hover:shadow-xl hover:shadow-indigo-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 motion-reduce:transform-none motion-reduce:transition-none">Tạo tài khoản miễn phí</Link>
            <Link href="/courses" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 font-bold transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">Khám phá khóa học</Link>
          </div>
        </div>

        <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-indigo-950/60 backdrop-blur sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Minh họa một lộ trình</p>
              <h2 className="mt-2 text-xl font-bold">Điều kiện và nhánh rẽ</h2>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Đang học</span>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-[#0b1020] p-5 font-mono text-sm leading-7 text-slate-200"><code><span className="text-fuchsia-300">score</span> = <span className="text-amber-300">8</span>{"\n"}<span className="text-cyan-300">if</span> score &gt;= <span className="text-amber-300">8</span>:{"\n"}    <span className="text-emerald-300">print</span>(<span className="text-yellow-200">&quot;Bạn đã mở khóa bài tiếp theo!&quot;</span>)</code></pre>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/5 p-3"><strong className="block text-xl">12</strong><span className="text-xs text-slate-400">bài học</span></div>
            <div className="rounded-xl bg-white/5 p-3"><strong className="block text-xl">36</strong><span className="text-xs text-slate-400">bài tập</span></div>
            <div className="rounded-xl bg-white/5 p-3"><strong className="block text-xl">42%</strong><span className="text-xs text-slate-400">tiến độ</span></div>
          </div>
        </div>
      </section>

      <section aria-labelledby="learning-flow-title" className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-300">Học — Làm — Hiểu</p>
            <h2 id="learning-flow-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Mỗi bước đều đưa bạn tiến về phía trước.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PRODUCT_PILLARS.map((pillar) => (
              <article key={pillar.step} className="group rounded-2xl border border-white/10 bg-slate-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-lg hover:shadow-indigo-950/50 motion-reduce:transform-none motion-reduce:transition-none">
                <span className="font-mono text-sm font-bold text-indigo-300 transition-colors duration-300 group-hover:text-indigo-200">{pillar.step}</span>
                <h3 className="mt-5 text-xl font-bold">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
