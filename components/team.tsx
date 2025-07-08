"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Github, ExternalLink } from "lucide-react"

export function Team() {
  const teamMembers = [
    {
      name: "Keyvan Kambakhsh",
      role: "Protocol Architect",
      description:
        "Core developer and architect of the WORM protocol, specializing in zero-knowledge cryptography and privacy-preserving systems.",
      github: "https://github.com/keyvank",
      avatar: "https://avatars.githubusercontent.com/u/4275654?v=4",
    },
  ]

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Team</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Building the future of privacy-first cryptoeconomics with expertise in zero-knowledge proofs and
            decentralized systems
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card
                key={index}
                className="bg-green-950/30 border-green-800 hover:border-green-700 transition-all hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-900/50 border-2 border-green-700 flex items-center justify-center overflow-hidden">
                    <img
                      src={member.avatar || "/placeholder.svg"}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-xl text-green-300">{member.name}</CardTitle>
                  <p className="text-sm text-green-400 font-mono">{member.role}</p>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-400 text-sm leading-relaxed">{member.description}</p>

                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
                      onClick={() => window.open(member.github, "_blank")}
                    >
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-green-950/60 to-green-900/60 border border-green-700 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-4 text-green-300">Join the Team</h3>
            <p className="text-gray-400 mb-6">
              Interested in contributing to privacy-preserving cryptoeconomics? We're always looking for talented
              developers, researchers, and cryptographers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
              >
                <Github className="w-4 h-4 mr-2" />
                Contribute on GitHub
              </Button>
              <Button
                variant="outline"
                className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
              >
                Join Community
              </Button>
            </div>
          </div>
        </div> */}
      </div>
    </section>
  )
}
