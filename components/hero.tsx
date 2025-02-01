import { FlickeringGrid } from "@/components/ui/flickering-grid"

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <FlickeringGrid />
      </div>
      <div className="container relative z-10 mx-auto px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="block text-foreground">Check The Price</span>
            <span className="block text-muted-foreground mt-2 text-2xl sm:text-3xl">
              Irish Property Price Register
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Search through the latest property sales data in Ireland. Find out what properties sold for in your area.
          </p>
        </div>
      </div>
    </div>
  )
} 