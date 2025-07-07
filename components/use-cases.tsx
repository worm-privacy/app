import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Building, Gift, Globe, Beaker, TrendingUp } from "lucide-react"

export function UseCases() {
  const useCases = [
    {
      icon: Shield,
      title: "Anonymous Payments",
      description: "Burn ETH → get BETH → use in WORM-based payment networks with complete privacy",
      color: "text-green-400",
    },
    {
      icon: TrendingUp,
      title: "Speculation",
      description: "WORM as a bet on ETH destruction and the growth of the burn economy",
      color: "text-yellow-400",
    },
    {
      icon: Building,
      title: "DeFi Collateral",
      description: "Use WORM as private, non-inflationary collateral in lending and borrowing protocols",
      color: "text-blue-400",
    },
    {
      icon: Gift,
      title: "Anonymous Grants",
      description: "Fund initiatives and projects without revealing the origin wallet or identity",
      color: "text-purple-400",
    },
    {
      icon: Globe,
      title: "Censorship Resistance",
      description: "Distribute WORM without linking to identities, IPs, or geographic locations",
      color: "text-red-400",
    },
    {
      icon: Beaker,
      title: "ZK Experimentation",
      description: "Base asset for developers experimenting with Private Proof-of-Burn applications",
      color: "text-cyan-400",
    },
  ]

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Use Cases</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            WORM enables a new generation of privacy-first applications and financial primitives
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {useCases.map((useCase, index) => (
            <Card key={index} className="bg-green-950/30 border-green-800 hover:border-green-700 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <useCase.icon className={`w-6 h-6 ${useCase.color}`} />
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm">{useCase.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-gradient-to-r from-green-950/60 to-green-900/60 border border-green-700 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-green-300">Token Utility Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Token</th>
                  <th className="text-left py-3 px-4 text-gray-300">Role</th>
                  <th className="text-center py-3 px-4 text-gray-300">Scarcity</th>
                  <th className="text-left py-3 px-4 text-gray-300">Primary Use Cases</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="font-semibold text-green-300 font-mono">BETH</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300 font-mono">Proof of ETH burn (private)</td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-red-400 font-mono">❌ No</span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">WORM minting, ZK-payments, anonymized burn receipts</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="font-semibold text-green-300 font-mono">WORM</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300 font-mono">Scarce asset minted from BETH</td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-green-400 font-mono">✅ Yes</span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">DeFi collateral, speculative trading, privacy money</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
