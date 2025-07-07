import { Hero } from "@/components/hero"
import { Overview } from "@/components/overview"
import { Privacy } from "@/components/privacy"
import { Tokenomics } from "@/components/tokenomics"
import { UseCases } from "@/components/use-cases"
import { Roadmap } from "@/components/roadmap"
import { Resources } from "@/components/resources"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Hero />
      <Overview />
      <Privacy />
      <Tokenomics />
      <UseCases />
      <Roadmap />
      <Resources />
    </div>
  )
}
