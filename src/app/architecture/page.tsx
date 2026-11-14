import { TopNav } from "@/components/TopNav";
import { ArchitectureTabs } from "@/components/motion/ArchitectureTabs";

export const dynamic = "force-dynamic";

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-mist-fade">
      <TopNav />
      <div className="bg-rh-lime p-5 text-center font-semibold text-black">Historical architecture exploration. Current implementation: Next.js + PostgreSQL, local Mailpit and owner-authorized CSV analysis. AA/ULI/OCEN and production lending are not connected.</div>
      <ArchitectureTabs />
    </main>
  );
}
