import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, Calendar } from "lucide-react"

export function Roadmap() {
  const phases = [
    {
      phase: 1,
      title: "Launch zk-SNARK burn circuit & WORM",
      status: "complete",
      description: "Core privacy infrastructure and burn receipt system",
    },
    {
      phase: 2,
      title: "WORM contract deployment with capped minting",
      status: "complete",
      description: "Scarce asset minting with competitive distribution",
    },
    {
      phase: 3,
      title: "DEX & Oracle Integration",
      status: "ongoing",
      description: "Trading infrastructure and price discovery mechanisms",
    },
    {
      phase: 4,
      title: "Rollup & L2 Expansion",
      status: "planned",
      description: "Multi-chain deployment for broader accessibility",
    },
    {
      phase: 5,
      title: "Privacy-Native DeFi Suite",
      status: "planned",
      description: "Lending, borrowing, and yield farming with privacy",
    },
    {
      phase: 6,
      title: "DAO Transition + Treasury Disbursement",
      status: "planned",
      description: "Community governance and protocol treasury management",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "ongoing":
        return <Clock className="w-5 h-5 text-green-400" />
      case "planned":
        return <Calendar className="w-5 h-5 text-green-600" />
      default:
        return <Calendar className="w-5 h-5 text-green-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "border-green-800 bg-green-900/30"
      case "ongoing":
        return "border-green-600 bg-green-900/20"
      case "planned":
        return "border-green-800/50 bg-green-950/20"
      default:
        return "border-green-800/50 bg-green-950/20"
    }
  }

  return (
    <section className="py-20 bg-green-950/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Roadmap</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Building the future of privacy-first, burn-native cryptoeconomics
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {phases.map((phase, index) => (
              <Card key={index} className={`${getStatusColor(phase.status)} border transition-all hover:scale-[1.02]`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-900 rounded-full text-green-300 font-bold font-mono">
                        {phase.phase}
                      </div>
                      <CardTitle className="text-xl">{phase.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(phase.status)}
                      <span className="text-sm capitalize text-gray-400">{phase.status}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 ml-14">{phase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-6 bg-green-950/40 border border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300">Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-300">Planned</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
