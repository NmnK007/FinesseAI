"use client";
/* localized-ui */
import { T,useLanguage } from '@/components/finance/Language';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Globe, LogOut, MessageCircle, User } from "lucide-react";
import { Wordmark } from "./Logo";
import { type Session } from "@/lib/auth";

const NAV = [
  { label: "Health Card", href: "/intelligence" },
  { label: "For MSMEs", href: "/dashboard" },
  { label: "For Lenders", href: "/lender" },
  { label: "Architecture", href: "/architecture" },
  { label: "Data sources", href: "/data-sources" },
];


export function TopNav() {
 const {t}=useLanguage();

  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/session').then(r=>r.json()).then(data=>setSession(data.session ?? null)).catch(()=>setSession(null));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b border-line bg-black/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
        <Link href="/">
          <Wordmark variant="dark" size={28} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <T>{NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[14px] font-medium text-white/85 transition hover:text-white"
            >
              <T>{n.label}</T>
            </Link>
          ))}</T>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-medium text-white/85 lg:inline-flex">
            <Globe className="h-3.5 w-3.5" /><T>
            IN
            </T><ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </span>

          {/* Development inbox — always visible · triggers the /onboarding conversational flow */}
          <Link
            href="/onboarding"
            title={t("Open local sign-in")}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#25D366] bg-[#25D366]/10 px-3 py-1.5 text-[13px] font-bold text-[#25D366] transition hover:bg-[#25D366] hover:text-black"
          >
            <MessageCircle className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline"><T>Development inbox</T></span>
          </Link>


          <T>{session ? (
            <div className="flex items-center gap-2">
              {/* Session chip with dropdown for details */}
              <div className="relative" ref={menuRef}>
                <button
                  aria-label={t('My dashboard')}
                  aria-expanded={menuOpen}
                  onKeyDown={e=>{if(e.key==='Escape')setMenuOpen(false);}}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-base-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:border-white/40"
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${
                      session.role === "customer"
                        ? "bg-rh-lime text-black"
                        : "bg-[#78141e] text-white"
                    }`}
                  >
                    <T>{session.displayName.slice(0, 1).toUpperCase()}</T>
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    <T>{session.displayName.split(" ")[0]}</T>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                <T>{menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line-strong bg-base-900 shadow-pop"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                        <T>{session.role === "customer" ? "MSME · Signed in" : "Lender · Signed in"}</T>
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-white">
                        <T>{session.displayName}</T>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-white/60">
                        <T>{session.gstin || session.employeeId}</T>
                      </div>
                      <T>{session.bank && (
                        <div className="mt-0.5 text-[11px] text-white/60"><T>{session.bank}</T></div>
                      )}</T>
                    </div>
                    <Link
                      href={session.role === "customer" ? "/dashboard" : "/lender"}
                      className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-base-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4" /><T>
                      My dashboard
                    </T></Link>
                    <Link
                      href="/logout"
                      className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[13px] font-medium text-rh-red hover:bg-base-800"
                    >
                      <LogOut className="h-4 w-4" /><T>
                      Sign out
                    </T></Link>
                  </motion.div>
                )}</T>
              </div>

              {/* Always-visible Sign out button (no click-through) */}
              <Link
                href="/logout"
                className="inline-flex items-center gap-1.5 rounded-full border border-rh-red/50 bg-rh-red/10 px-4 py-1.5 text-[13px] font-semibold text-rh-red transition hover:bg-rh-red/20"
                title={t("Sign out")}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline"><T>Sign out</T></span>
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-rh-lime px-5 py-1.5 text-[14px] font-semibold text-white transition hover:bg-rh-lime/10"
              ><T>
                Log in
              </T></Link>
              <Link
                href="/signup"
                className="rounded-full bg-rh-lime px-5 py-1.5 text-[14px] font-semibold text-black transition hover:bg-rh-lime-bright"
              ><T>
                Sign up
              </T></Link>
            </>
          )}</T>
        </div>
      </div>
    </motion.header>
  );
}
