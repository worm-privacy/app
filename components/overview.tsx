import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Flame, Key, Coins } from "lucide-react"

export function Overview() {
  return (
    <section className="py-20 bg-green-950/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Protocol Architecture</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            WORM operates through a two-token system: BETH as private burn receipts and WORM as the scarce terminal
            asset
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="bg-green-950/40 border-green-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Flame className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-2xl text-green-300">BETH</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                The private burn receipt token. Each BETH represents 1 ETH provably destroyed using zk-SNARKs.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Private Burn Commitment</h4>
                    <p className="text-sm text-gray-400">ETH sent to deterministic unspendable address</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">zk-SNARK Proof Generation</h4>
                    <p className="text-sm text-gray-400">Cryptographic proof without revealing burn details</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">On-Chain Verification</h4>
                    <p className="text-sm text-gray-400">Smart contract verifies proof and mints BETH</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/50 rounded-lg p-4 border border-green-700">
                <p className="text-sm text-green-300">
                  <strong className="font-mono">1 ETH Burned = 1 BETH Minted</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">One-way conversion with complete privacy preservation</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Coins className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-2xl text-green-300">WORM</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                The scarce terminal asset minted by consuming BETH. Hard emission caps ensure permanent scarcity.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Competitive Minting</h4>
                    <p className="text-sm text-gray-400">Fixed emissions per block split pro-rata among burners</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Hard Scarcity</h4>
                    <p className="text-sm text-gray-400">No inflation curves, no premine, only burn-to-earn</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">DeFi Composable</h4>
                    <p className="text-sm text-gray-400">ERC-20 compatible for trading and collateral use</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/50 rounded-lg p-4 border border-green-700">
                <p className="text-sm text-green-300">
                  <strong className="font-mono">WORM_i = E × (B_i / B_total)</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Your share = Block emissions × (Your BETH / Total BETH)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-4 bg-green-950/40 border border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-mono">Burn ETH</span>
            </div>
            <ArrowRight className="w-5 h-5 text-green-500" />
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-mono">Get BETH</span>
            </div>
            <ArrowRight className="w-5 h-5 text-green-500" />
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-mono">Mint WORM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
