"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
      <div className="container flex h-14 items-center">
        <div className="mr-8 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2 text-zinc-100 hover:text-zinc-200">
            <span className="font-bold">Check The Price</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/"
            className="transition-colors text-zinc-400 hover:text-zinc-100"
          >
            Home
          </Link>
          <Link
            href="/reports"
            className="transition-colors text-zinc-400 hover:text-zinc-100"
          >
            Reports
          </Link>
          <Link
            href="/data"
            className="transition-colors text-zinc-400 hover:text-zinc-100"
          >
            Data
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
} 