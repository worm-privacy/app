import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Target, Users, Zap } from "lucide-react"

export function Tokenomics() {
  return (
    <section className="py-20 bg-green-950/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Economic Design</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            WORM introduces scarcity through competitive minting and hard emission caps, creating a zero-sum dynamic
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="bg-green-950/40 border-green-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-green-400" />
                <CardTitle className="text-xl text-green-300">Emission Schedule</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-900/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-300 font-mono">100</p>
                  <p className="text-sm text-gray-400">WORM per block</p>
                </div>
                <div className="bg-green-900/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-300 font-mono">0</p>
                  <p className="text-sm text-gray-400">Premine</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fixed Cap per Block</span>
                  <span className="text-green-400">✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Halving Events</span>
                  <span className="text-red-400">✗</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inflation Curves</span>
                  <span className="text-red-400">✗</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Burn-to-Earn Only</span>
                  <span className="text-white">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-400" />
                <CardTitle className="text-xl text-green-300">Distribution Algorithm</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-900/50 rounded-lg p-4 font-mono text-center">
                <p className="text-lg text-green-300 mb-2 font-mono">WORM_i = E × (B_i / B_total)</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">Proportional distribution formula</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">Example Block:</p>
                  <p className="text-xs text-gray-400 font-mono">3 users burn 1, 2, and 7 BETH (total: 10)</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-900/30 rounded p-2">
                    <p className="text-lg font-bold text-green-300 font-mono">10</p>
                    <p className="text-xs text-gray-400">WORM</p>
                  </div>
                  <div className="bg-green-900/30 rounded p-2">
                    <p className="text-lg font-bold text-green-300 font-mono">20</p>
                    <p className="text-xs text-gray-400">WORM</p>
                  </div>
                  <div className="bg-green-900/30 rounded p-2">
                    <p className="text-lg font-bold text-green-300 font-mono">70</p>
                    <p className="text-xs text-gray-400">WORM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-800/50">
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-red-400 mb-2" />
              <CardTitle>Block Contention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                More burners in a block means smaller individual shares, creating strategic timing incentives
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-800/50">
            <CardHeader>
              <Zap className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle>Strategic Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                Users monitor burn activity and choose optimal blocks to maximize WORM yield
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-800/50">
            <CardHeader>
              <Target className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle>Market-Driven Scarcity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                As WORM gains value, BETH demand rises, increasing the ETH burn rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
