import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { PRODUCT_NAME } from "@/config/product";
import { authService } from "@/features/auth/auth.service";

export const dynamic = "force-dynamic";

const PRODUCT_PILLARS = [
  {
    step: "01",
    title: "Lá»™ trÃ¬nh dá»… theo dÃµi",
    description:
      "Má»—i khÃ³a há»c Ä‘Æ°á»£c chia thÃ nh cÃ¡c Lesson vá»«a sá»©c, giÃºp báº¡n luÃ´n biáº¿t mÃ¬nh Ä‘ang á»Ÿ Ä‘Ã¢u vÃ  nÃªn há»c gÃ¬ tiáº¿p theo.",
  },
  {
    step: "02",
    title: "Há»c Ä‘i Ä‘Ã´i vá»›i lÃ m",
    description:
      "Checkpoint vÃ  bÃ i táº­p gáº¯n trá»±c tiáº¿p vá»›i tá»«ng Lesson, Ä‘á»ƒ kiáº¿n thá»©c Ä‘Æ°á»£c cá»§ng cá»‘ ngay khi cÃ²n má»›i.",
  },
  {
    step: "03",
    title: "Há»— trá»£ Ä‘Ãºng thá»i Ä‘iá»ƒm",
    description:
      "Nguá»“n há»c Ä‘Ã¡ng tin cáº­y káº¿t há»£p cÃ¹ng trá»£ giÃºp AI phÃ¹ há»£p, trong má»™t tráº£i nghiá»‡m táº­p trung vÃ  cÃ³ kiá»ƒm soÃ¡t.",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
      <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function HomePage() {
  const user = await authService.getCurrentUser().catch(() => null);

  return (
    <main className="dark min-h-screen overflow-hidden bg-background text-text-primary">
      <header className="relative z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <nav aria-label="Äiá»u hÆ°á»›ng trang chá»§" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg text-[15px] font-semibold tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:gap-2.5 sm:text-base">
            <BrandMark className="size-7 text-primary sm:size-8" />
            <span>{PRODUCT_NAME}</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/courses" className="hidden min-h-11 items-center rounded-xl px-3.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-text-primary sm:flex">KhÃ³a há»c</Link>
            {user ? (
              <>
                <Link href="/profile" className="hidden min-h-11 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-text-primary sm:flex">Há»“ sÆ¡</Link>
                <Link href="/dashboard" className="flex min-h-11 items-center whitespace-nowrap rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-hover sm:px-4">Tá»•ng quan</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="flex min-h-11 items-center whitespace-nowrap rounded-xl px-2.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-subtle hover:text-text-primary sm:px-3.5">ÄÄƒng nháº­p</Link>
                <Link href="/register" className="flex min-h-11 items-center whitespace-nowrap rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-hover sm:px-4"><span className="sm:hidden">Báº¯t Ä‘áº§u</span><span className="hidden sm:inline">Báº¯t Ä‘áº§u há»c</span></Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-center lg:gap-16 lg:pb-24 lg:pt-24">
        <div aria-hidden="true" className="absolute -right-64 -top-64 size-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            Há»c cÃ³ Ä‘á»‹nh hÆ°á»›ng, tiáº¿n bá»™ cÃ³ thá»ƒ tháº¥y
          </p>
          <h1 className="mt-6 max-w-[15ch] text-4xl font-semibold leading-[1.1] tracking-[-0.045em] [text-wrap:balance] sm:text-5xl lg:text-[3.75rem]">
            Má»™t lá»™ trÃ¬nh rÃµ rÃ ng cho Ä‘iá»u báº¡n muá»‘n há»c.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
            KhÃ¡m phÃ¡ khÃ³a há»c tá»« nguá»“n kiáº¿n thá»©c Ä‘Ã¡ng tin cáº­y, luyá»‡n táº­p ngay trong tá»«ng Lesson vÃ  theo dÃµi tiáº¿n Ä‘á»™ mÃ  khÃ´ng bá»‹ phÃ¢n tÃ¢m.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/dashboard" : "/register"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-hover">
              {user ? "Tiáº¿p tá»¥c há»c" : "Táº¡o tÃ i khoáº£n miá»…n phÃ­"} <ArrowIcon />
            </Link>
            <Link href="/courses" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface/70 px-5 font-semibold text-text-primary transition-colors duration-200 hover:bg-surface-elevated">KhÃ¡m phÃ¡ khÃ³a há»c</Link>
          </div>
          <p className="mt-5 text-sm text-text-muted">{user ? `ChÃ o ${user.username} Â· Tiáº¿p tá»¥c theo tiáº¿n Ä‘á»™ cá»§a báº¡n` : "Báº¯t Ä‘áº§u miá»…n phÃ­ Â· Há»c theo tá»‘c Ä‘á»™ cá»§a báº¡n"}</p>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md rounded-[1.75rem] border border-border bg-surface p-3 shadow-[0_32px_90px_-45px_rgba(99,102,241,0.5)]">
          <div className="rounded-2xl border border-border bg-surface-subtle p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Lá»™ trÃ¬nh Ä‘ang há»c</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">TÆ° duy há»‡ thá»‘ng</h2>
              </div>
              <span className="rounded-full border border-success/25 bg-success-soft px-2.5 py-1 text-xs font-medium text-success">Äang há»c</span>
            </div>

            <div className="mt-6" aria-label="Tiáº¿n Ä‘á»™ máº«u cá»§a khÃ³a há»c">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Tiáº¿n Ä‘á»™ khÃ³a há»c</span>
                <strong className="font-semibold text-text-primary">42%</strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                <div className="h-full w-[42%] rounded-full bg-primary" />
              </div>
            </div>

            <ol className="mt-6 space-y-1" aria-label="CÃ¡c bÆ°á»›c trong lá»™ trÃ¬nh máº«u">
              <li className="flex gap-3 rounded-xl px-2 py-3">
                <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success">âœ“</span>
                <span><strong className="block text-sm font-medium">Ná»n táº£ng tÆ° duy</strong><span className="mt-0.5 block text-xs text-text-muted">Lesson Ä‘Ã£ hoÃ n thÃ nh</span></span>
              </li>
              <li className="flex gap-3 rounded-xl border border-primary/30 bg-primary-soft px-2 py-3">
                <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">2</span>
                <span><strong className="block text-sm font-medium">PhÃ¢n tÃ­ch má»‘i quan há»‡</strong><span className="mt-0.5 block text-xs text-text-secondary">Lesson Ä‘ang há»c</span></span>
              </li>
              <li className="flex gap-3 rounded-xl px-2 py-3">
                <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-text-muted">3</span>
                <span><strong className="block text-sm font-medium text-text-secondary">Checkpoint kiáº¿n thá»©c</strong><span className="mt-0.5 block text-xs text-text-muted">BÆ°á»›c tiáº¿p theo</span></span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="learning-flow-title" className="border-t border-border bg-surface-subtle/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Há»c Â· LÃ m Â· Hiá»ƒu</p>
              <h2 id="learning-flow-title" className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.03em] [text-wrap:balance] sm:text-4xl">Tiáº¿n bá»™ tá»« nhá»¯ng bÆ°á»›c nhá» nhÆ°ng cÃ³ chá»§ Ä‘Ã­ch.</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-text-secondary lg:justify-self-end">LearningApp káº¿t ná»‘i ná»™i dung, luyá»‡n táº­p vÃ  tiáº¿n Ä‘á»™ trong cÃ¹ng má»™t luá»“ng há»c táº­p nháº¥t quÃ¡n.</p>
          </div>
          <div className="mt-12 grid border-y border-border md:grid-cols-3">
            {PRODUCT_PILLARS.map((pillar, index) => (
              <article key={pillar.step} className={`py-7 md:px-7 ${index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""}`}>
                <span className="font-mono text-xs font-semibold text-primary">{pillar.step}</span>
                <h3 className="mt-5 text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

