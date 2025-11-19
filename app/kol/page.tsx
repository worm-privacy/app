"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, UserPlus } from 'lucide-react'
import Link from "next/link"
import { WalletProvider, useWallet } from "@/hooks/use-wallet"
import { NetworkProvider } from "@/hooks/use-network"
import { NetworkSwitcher } from "@/components/network-switcher"
import { ParticipateKOLDialog } from "@/components/participate-kol-dialog"
import { useEffect, useState } from "react"

function KOLPageContent() {
  const { isConnected, address, connectWallet, disconnectWallet } = useWallet()
  const [parentCodeFromUrl, setParentCodeFromUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1) // Remove the '#' character
      if (hash) {
        setParentCodeFromUrl(hash)
      }
    }
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-6 flex justify-between items-center">
        <Link href="https://worm.cx" className="inline-flex items-center gap-2 text-green-300 hover:text-green-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-4">
          <NetworkSwitcher />

          {!isConnected ? (
            <Button
              onClick={connectWallet}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold border-0"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-sm font-mono text-green-300 bg-green-950/60 px-3 py-1 rounded-lg">
                {formatAddress(address!)}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={disconnectWallet}
                className="border-red-600 text-red-300 hover:bg-red-900/50 bg-transparent"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      <section className="py-12 bg-green-950/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-full px-4 py-2 text-sm text-green-300 mb-6">
              <Users className="w-4 h-4 text-green-400" />
              <span className="font-mono">KOL Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-green-300 font-mono">Join the KOL Network</h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Use an invite code to join the network and start promoting WORM Privacy
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="bg-green-950/40 border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-950/50 rounded-lg">
                    <UserPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-green-300">Join Network</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Sign up to become a KOL and promote WORM Privacy to earn rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-black/30 border border-green-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-300 mb-2">Requirements:</h4>
                    <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                      <li>Valid invite code from an existing KOL</li>
                      <li>Your unique invite code (must not be taken)</li>
                      <li>Social media accounts for promotion</li>
                    </ul>
                  </div>

                  <ParticipateKOLDialog parentCodeFromUrl={parentCodeFromUrl}>
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                      disabled={!isConnected}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up to Network
                    </Button>
                  </ParticipateKOLDialog>

                  {!isConnected && (
                    <p className="text-xs text-yellow-400 text-center">Connect your wallet to join the network</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="max-w-4xl mx-auto mt-12">
            <Card className="bg-green-950/20 border-green-800/50">
              <CardHeader>
                <CardTitle className="text-green-300">About the KOL Network</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400 space-y-3 text-sm">
                <p>
                  The KOL (Key Opinion Leader) Network allows community members to promote WORM and earn rewards by
                  building their network.
                </p>
                <p>
                  Each KOL receives a unique invite code that new users can use to join the network. When users join
                  using your code, they become part of your referral tree.
                </p>
                <p>
                  Each KOL will receive 10% of its child promoter's score
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function KOLPage() {
  return (
    <NetworkProvider>
      <WalletProvider>
        <KOLPageContent />
      </WalletProvider>
    </NetworkProvider>
  )
}
