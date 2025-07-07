import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, Lock, Fingerprint } from "lucide-react"

export function Privacy() {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Privacy Architecture</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            WORM is built on zero-knowledge foundations, ensuring strong privacy guarantees through cryptographic proofs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-green-950/30 border-green-800 text-center">
            <CardHeader>
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <CardTitle className="text-lg text-green-300">zk-SNARKs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Zero-knowledge proofs ensure burns are valid without revealing sender or transaction details
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/30 border-green-800 text-center">
            <CardHeader>
              <Fingerprint className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <CardTitle className="text-lg text-green-300">Nullifiers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Unique identifiers prevent reuse of proofs without linking to burn addresses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/30 border-green-800 text-center">
            <CardHeader>
              <Lock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <CardTitle className="text-lg text-green-300">Commitment Trees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Efficient Merkle trees enable scalable inclusion proofs for burn verification
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/30 border-green-800 text-center">
            <CardHeader>
              <Eye className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <CardTitle className="text-lg text-green-300">Anonymity Set</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">Each new burn increases the pool of indistinguishable burn events</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-green-950/60 to-green-900/60 border border-green-700 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-green-300">Technical Stack</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-400">ZK Circuits</h4>
              <div className="space-y-1 text-sm text-green-300 font-mono">
                <p>• Circom & SnarkJS</p>
                <p>• MiMC7 Hashing</p>
                <p>• Groth16 Proof System</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-green-400">Smart Contracts</h4>
              <div className="space-y-1 text-sm text-green-300 font-mono">
                <p>• Solidity & OpenZeppelin</p>
                <p>• On-chain ZK Verifier</p>
                <p>• Ethereum Mainnet</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-green-400">Security</h4>
              <div className="space-y-1 text-sm text-green-300 font-mono">
                <p>• Circuit Constraint Validation</p>
                <p>• Nullifier Uniqueness</p>
                <p>• Economic Finality</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
