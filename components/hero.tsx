import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, Shield, Coins, DollarSign, Pickaxe } from "lucide-react"
import Link from "next/link"
import { FundingDialog } from "@/components/funding-dialog"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-green-950 to-black overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(34,197,94,0.05)_49%,rgba(34,197,94,0.05)_51%,transparent_52%)] bg-[length:20px_20px]" />
      </div>

      <div className="container mx-auto px-6 py-12 text-center relative z-10">
        <div className="m-8">
          <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-full px-4 py-2 text-sm text-green-300 mb-6">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="font-mono">Powered by EIP-7503</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 text-green-300 font-mono">WORM</h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            A Scarce Cryptoasset Rooted in Private ETH Destruction
          </p>

          <p className="text-lg text-gray-400 mb-8 max-w-4xl mx-auto">
            Transform irreversible ETH burns into an economically meaningful, scarce asset using zk-SNARKs!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/mine">
            <Button
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold border-0"
            >
              Mine
              <Pickaxe className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <FundingDialog>
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
            >
              Fund us!
              <DollarSign className="w-4 h-4" />
            </Button>
          </FundingDialog>
          <a href="https://discord.gg/EIP7503">
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
            >
              Join Discord
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </a>
          <a href="https://github.com/worm-privacy/proof-of-burn">
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
            >
              View Circuits
            </Button>
          </a>
        </div>

        {/* Existing code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-green-950/30 border border-green-800 rounded-lg p-6">
            <Shield className="w-8 h-8 text-green-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2 text-green-300">Private by Design</h3>
            <p className="text-gray-400 text-sm">
              Zero-knowledge proofs ensure burns are unlinkable to origin addresses
            </p>
          </div>

          <div className="bg-green-950/30 border border-green-800 rounded-lg p-6">
            <Coins className="w-8 h-8 text-green-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2 text-green-300">Cryptographically Scarce</h3>
            <p className="text-gray-400 text-sm">Hard emission caps per epoch ensure permanent scarcity</p>
          </div>

          <div className="bg-green-950/30 border border-green-800 rounded-lg p-6">
            <Zap className="w-8 h-8 text-green-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2 text-green-300">Burn Economy</h3>
            <p className="text-gray-400 text-sm">
              Value rooted in irreversible ETH destruction and competitive minting
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
