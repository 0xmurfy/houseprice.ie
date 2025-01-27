import React from 'react';

export function GridPattern() {
  return (
    <div className="absolute inset-0 h-full w-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="absolute inset-0 [background:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px] motion-safe:animate-[grid_2s_linear_infinite]" />
    </div>
  );
} 