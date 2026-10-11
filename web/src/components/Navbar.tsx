"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Sparkles, Github, LogOut, LayoutDashboard, Compass } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isDiscover = pathname === "/";
  const isDashboard = pathname === "/dashboard";

  const isAuthenticated = status === "authenticated" || !!session;
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              ContribHQ
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                isDiscover
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Discover</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                isDashboard
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>My Dashboard</span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Live
              </span>
            </Link>
          </nav>
        </div>

        {/* Auth / User Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
              <div className="w-20 h-8 rounded-lg bg-zinc-800 animate-pulse hidden sm:block" />
            </div>
          ) : isAuthenticated && session?.user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile Link to Dashboard */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all text-xs sm:text-sm group"
                title="Go to My Dashboard"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User Avatar"}
                    className="w-6 h-6 rounded-full border border-zinc-700 group-hover:border-zinc-500 transition-colors"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}
                <span className="font-medium text-zinc-300 group-hover:text-white transition-colors max-w-[100px] sm:max-w-[140px] truncate">
                  {session.user.name || session.user.email?.split("@")[0] || "Contributor"}
                </span>
              </Link>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors border border-transparent hover:border-rose-900/30"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl: "/" })}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm shadow-blue-500/25 transition-all hover:shadow-blue-500/40 active:scale-95"
            >
              <Github className="w-4 h-4" />
              <span>Sign In with GitHub</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
