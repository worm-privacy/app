"use client"

import { BurnActivity } from "@/components/burn-activity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Coins, Flame, ArrowLeft, AlertCircle, RefreshCw, Users, Gift } from "lucide-react"
import Link from "next/link"
import { WalletProvider, useWallet } from "@/hooks/use-wallet"
import { NetworkProvider } from "@/hooks/use-network"
import { NetworkSwitcher } from "@/components/network-switcher"
import { useBalances } from "@/hooks/use-balances"
import { ParticipateDialog } from "@/components/participate-dialog"
import { ClaimDialog } from "@/components/claim-dialog"
import { useCurrentEpoch } from "@/hooks/use-current-epoch"
import { BurnAddressesDialog } from "@/components/burn-addresses-dialog"

function MinePageContent() {
  const { isConnected, address, connectWallet, disconnectWallet, error } = useWallet()
  const { bethBalance, wormBalance, loading: balancesLoading, error: balancesError } = useBalances()
  const { currentEpoch } = useCurrentEpoch()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleBurnComplete = () => {
    // Balances will automatically refresh due to the useEffect in useBalances hook
    console.log("[v0] Burn completed, balances will refresh automatically")
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-6 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 text-green-300 hover:text-green-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Network Switcher and Wallet Connection in Top Right */}
        <div className="flex items-center gap-4">
          <NetworkSwitcher />

          {error && (
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{error}</span>
            </div>
          )}

          {!isConnected ? (
            <Button
              onClick={connectWallet}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold border-0"
            >
              <Wallet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
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

      <section className="py-1 bg-green-950/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${!isConnected ? "opacity-50" : "opacity-100"}`}
            >
              <Card className="bg-green-950/40 border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-300">BETH Balance</CardTitle>
                  <div className="flex items-center gap-2">
                    {balancesLoading && <RefreshCw className="h-3 w-3 text-green-400 animate-spin" />}
                    <Flame className="h-4 w-4 text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xl font-bold text-yellow-300 font-mono">
                    {!isConnected ? "---.----" : balancesLoading ? "..." : bethBalance}
                  </div>
                  <p className="text-xs text-gray-400">Burned ETH tokens</p>
                  {balancesError && <p className="text-xs text-red-400">Error loading balance</p>}

                  <BurnAddressesDialog onBurnComplete={handleBurnComplete}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent w-full"
                      
                    >
                      Burn ETH
                      <Flame className="ml-2 w-4 h-4" />
                    </Button>
                  </BurnAddressesDialog>
                  <p className="text-xs text-gray-400 text-center">Max 1 ETH per transaction</p>
                </CardContent>
              </Card>

              <Card className="bg-green-950/40 border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-300">WORM Balance</CardTitle>
                  <div className="flex items-center gap-2">
                    {balancesLoading && <RefreshCw className="h-3 w-3 text-green-400 animate-spin" />}
                    <Coins className="h-4 w-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xl font-bold text-green-300 font-mono">
                    {!isConnected ? "---.----" : balancesLoading ? "..." : wormBalance}
                  </div>
                  <p className="text-xs text-gray-400">Mined WORM tokens</p>
                  {balancesError && <p className="text-xs text-red-400">Error loading balance</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <ParticipateDialog bethBalance={bethBalance} currentEpoch={currentEpoch}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-300 hover:bg-blue-900/50 bg-transparent"
                        disabled={!isConnected}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        Participate
                      </Button>
                    </ParticipateDialog>

                    <ClaimDialog currentEpoch={currentEpoch}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-600 text-purple-300 hover:bg-purple-900/50 bg-transparent"
                        disabled={!isConnected}
                      >
                        <Gift className="w-3 h-3 mr-1" />
                        Claim
                      </Button>
                    </ClaimDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <BurnActivity />
    </div>
  )
}

export default function MinePage() {
  return (
    <NetworkProvider>
      <WalletProvider>
        <MinePageContent />
      </WalletProvider>
    </NetworkProvider>
  )
}
