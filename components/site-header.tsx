"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          <nav className="flex items-center space-x-6">
            <a href="/" className="font-semibold">
              checktheprice.ie
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
} 