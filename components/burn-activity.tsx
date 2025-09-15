"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Flame, TrendingUp, Clock, Activity, Coins } from "lucide-react"
import { useNetwork } from "@/hooks/use-network"
import { ethers } from "ethers"

interface EpochData {
  epoch: number
  total: string
  userAmount: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}

export function BurnActivity() {
  const [epochData, setEpochData] = useState<EpochData[]>([])
  const [currentEpoch, setCurrentEpoch] = useState<number>(0)
  const [totalSupply, setTotalSupply] = useState<string>("0.0000")
  const [totalWormMinted, setTotalWormMinted] = useState<string>("0.0000")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const { networkConfig, selectedNetwork } = useNetwork()

  const WORM_CONTRACT_ABI = [
    "function currentEpoch() view returns (uint256)",
    "function epochTotal(uint256) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function epochUser(uint256 epoch, address user) public view returns (uint256)",
  ]

  const BETH_CONTRACT_ABI = ["function totalSupply() view returns (uint256)"]

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  const getUserAddress = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setUserAddress(accounts[0])
          return accounts[0]
        }
      } catch (error) {
        console.error("Error getting user address:", error)
      }
    }
    return null
  }

  const fetchContractData = async () => {
    try {
      setLoading(true)
      setError(null)

      const address = await getUserAddress()

      const rpcUrl = networkConfig.rpcUrls[0]
      console.log("[v0] Fetching burn activity from:", rpcUrl)
      console.log("[v0] Using BETH contract:", networkConfig.contracts.beth)
      console.log("[v0] Using WORM contract:", networkConfig.contracts.worm)

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const wormContract = new ethers.Contract(networkConfig.contracts.worm, WORM_CONTRACT_ABI, provider)
      const bethContract = new ethers.Contract(networkConfig.contracts.beth, BETH_CONTRACT_ABI, provider)

      // Get total supply from BETH contract
      console.log("[v0] Calling BETH totalSupply()")
      const bethTotalSupply = await bethContract.totalSupply()
      setTotalSupply(Number.parseFloat(ethers.formatEther(bethTotalSupply)).toFixed(4))

      // Get total WORM minted from WORM contract
      console.log("[v0] Calling WORM totalSupply()")
      const wormTotalSupply = await wormContract.totalSupply()
      setTotalWormMinted(Number.parseFloat(ethers.formatEther(wormTotalSupply)).toFixed(4))

      // Get current epoch from WORM contract
      console.log("[v0] Calling currentEpoch()")
      const currentEpochResult = await wormContract.currentEpoch()
      const current = Number(currentEpochResult)
      setCurrentEpoch(current)

      const epochRange = isMobile ? 2 : 5 // 2 past/future on mobile, 5 on desktop
      const epochs: EpochData[] = []

      for (let i = -epochRange; i <= epochRange; i++) {
        const epoch = current + i
        if (epoch >= 0) {
          try {
            console.log(`[v0] Calling epochTotal(${epoch})`)
            const totalResult = await wormContract.epochTotal(epoch)
            const total = ethers.formatEther(totalResult)

            let userAmount = "0.0000"
            if (address) {
              try {
                console.log(`[v0] Calling epochUser(${epoch}, ${address})`)
                const userResult = await wormContract.epochUser(epoch, address)
                userAmount = ethers.formatEther(userResult)
                console.log(`[v0] epochUser result for epoch ${epoch}: ${userAmount} BETH`)
              } catch (err) {
                console.log(`[v0] epochUser call failed for epoch ${epoch}:`, err)
                userAmount = "0.0000"
              }
            }

            epochs.push({
              epoch,
              total,
              userAmount,
              isCurrent: i === 0,
              isPast: i < 0,
              isFuture: i > 0,
            })
          } catch (err) {
            // If epoch doesn't exist yet, show 0
            epochs.push({
              epoch,
              total: "0.0000",
              userAmount: "0.0000",
              isCurrent: i === 0,
              isPast: i < 0,
              isFuture: i > 0,
            })
          }
        }
      }

      setEpochData(epochs)
    } catch (err) {
      console.error("[v0] Error fetching burn activity:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContractData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchContractData, 30000)
    return () => clearInterval(interval)
  }, [networkConfig, isMobile])

  const getBlockExplorerUrl = (address: string) => {
    if (networkConfig.blockExplorerUrls.length > 0) {
      return `${networkConfig.blockExplorerUrls[0]}/address/${address}`
    }
    return "#" // No block explorer for local networks
  }

  const networkDisplayName = selectedNetwork === "sepolia" ? "Sepolia" : "Anvil"
  const networkColor = selectedNetwork === "sepolia" ? "text-blue-300" : "text-orange-300"

  const WORM_PER_EPOCH = 50 // Max WORM tokens distributed per epoch

  const calculateWormReward = (userContribution: number, totalContribution: number): number => {
    if (totalContribution === 0 || userContribution === 0) return 0

    // User's share percentage * max WORM per epoch
    const userSharePercent = userContribution / totalContribution
    const estimatedReward = userSharePercent * WORM_PER_EPOCH

    return estimatedReward
  }

  const gridCols = isMobile ? "grid-cols-5" : "grid-cols-11"
  const epochRange = isMobile ? 2 : 5

  const truncateAddress = (address: string, isMobile = false) => {
    if (isMobile) {
      // On mobile, show first 6 and last 4 characters
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
    // On desktop, show more characters
    return `${address.slice(0, 10)}...${address.slice(-6)}`
  }

  return (
    <section className="py-20 bg-green-950/20">
      <div className="container mx-auto px-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Current Epoch</CardTitle>
              <Clock className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300 font-mono">{loading ? "..." : currentEpoch}</div>
              <p className="text-xs text-gray-400 mt-1">Active burn period</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Total ETH Burned</CardTitle>
              <Flame className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300 font-mono">{loading ? "..." : totalSupply}</div>
              <p className="text-xs text-gray-400 mt-1">BETH total supply</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Total WORM Minted</CardTitle>
              <Coins className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300 font-mono">{loading ? "..." : totalWormMinted}</div>
              <p className="text-xs text-gray-400 mt-1">WORM total supply</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Network</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${networkColor}`}>{networkDisplayName}</div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedNetwork === "sepolia" ? "Ethereum testnet" : "Local development"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Epoch Timeline */}
        <Card className="bg-green-950/40 border-green-800">
          <CardHeader>
            <CardTitle className="text-xl text-green-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Epoch Burn Timeline
            </CardTitle>
            <p className="text-sm text-gray-400">ETH consumption across past, current, and future epochs</p>
            {userAddress ? (
              <p className="text-xs text-cyan-300">Connected: {truncateAddress(userAddress, isMobile)}</p>
            ) : (
              <p className="text-xs text-yellow-300">Connect wallet to see your contributions</p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <span className="ml-3 text-gray-400">Loading burn data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error loading data: {error}</p>
                <button
                  onClick={fetchContractData}
                  className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline Header */}
                <div className={`grid ${gridCols} gap-2 text-xs text-gray-400 font-mono`}>
                  <div className={`col-span-${epochRange} text-center`}>Past Epochs</div>
                  <div className="text-center">Current</div>
                  <div className={`col-span-${epochRange} text-center`}>Future Epochs</div>
                </div>

                {/* Timeline Bars */}
                <div className={`grid ${gridCols} gap-2`}>
                  {epochData.map((epoch, index) => {
                    const maxTotal = Math.max(...epochData.map((e) => Number.parseFloat(e.total)))
                    const height = maxTotal > 0 ? (Number.parseFloat(epoch.total) / maxTotal) * 100 : 0

                    const userContribution = Number.parseFloat(epoch.userAmount)
                    const totalContribution = Number.parseFloat(epoch.total)
                    const userSharePercent = totalContribution > 0 ? (userContribution / totalContribution) * 100 : 0
                    const userHeight = (height * userSharePercent) / 100

                    const estimatedWormReward = calculateWormReward(userContribution, totalContribution)

                    return (
                      <div key={epoch.epoch} className="flex flex-col items-center">
                        <div className="w-full h-32 bg-gray-800 rounded relative overflow-hidden">
                          {/* Total bar */}
                          <div
                            className={`absolute bottom-0 w-full transition-all duration-500 ${
                              epoch.isCurrent
                                ? "bg-gradient-to-t from-yellow-500 to-yellow-300"
                                : epoch.isPast
                                  ? "bg-gradient-to-t from-green-600 to-green-400"
                                  : "bg-gradient-to-t from-gray-600 to-gray-500"
                            }`}
                            style={{ height: `${height}%` }}
                          />

                          {userContribution > 0 && (
                            <div
                              className="absolute bottom-0 w-full transition-all duration-500 bg-black/40"
                              style={{ height: `${userHeight}%` }}
                            />
                          )}

                          {epoch.isCurrent && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />}
                        </div>

                        <div className="mt-2 text-center">
                          <div className={`text-xs font-mono ${epoch.isCurrent ? "text-yellow-300" : "text-gray-400"}`}>
                            {epoch.epoch}
                          </div>
                          <div
                            className={`text-xs font-mono ${epoch.isCurrent ? "text-yellow-300" : "text-green-300"}`}
                          >
                            {Number.parseFloat(epoch.total).toFixed(4)}
                          </div>
                          {estimatedWormReward > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="text-xs font-mono text-yellow-200 hover:text-yellow-100 cursor-pointer underline decoration-dotted">
                                  ~{estimatedWormReward.toFixed(1)} WORM
                                </button>
                              </DialogTrigger>
                              <DialogContent className="bg-green-950/95 border-green-800 text-green-100">
                                <DialogHeader>
                                  <DialogTitle className="text-yellow-300">Epoch {epoch.epoch} Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-400">Your Contribution</p>
                                      <p className="text-lg font-mono text-cyan-300">{epoch.userAmount} ETH</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400">Total Burned</p>
                                      <p className="text-lg font-mono text-green-300">{epoch.total} ETH</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-400">Your Share</p>
                                      <p className="text-lg font-mono text-cyan-300">{userSharePercent.toFixed(2)}%</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-400">Expected WORM Reward</p>
                                      <p className="text-lg font-mono text-yellow-300">
                                        {estimatedWormReward.toFixed(3)} WORM
                                      </p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-green-800">
                                    <p className="text-xs text-gray-400">
                                      Rewards are calculated as your share percentage × 50 WORM (max per epoch)
                                    </p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-center gap-4 pt-4 border-t border-green-800 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-green-600 to-green-400 rounded"></div>
                    <span className="text-xs text-gray-400">Past Epochs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded"></div>
                    <span className="text-xs text-gray-400">Current Epoch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-gray-600 to-gray-500 rounded"></div>
                    <span className="text-xs text-gray-400">Future Epochs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-black/40 rounded"></div>
                    <span className="text-xs text-gray-400">Your Contribution</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Info */}
        <div className="mt-8 text-center space-y-2">
          <div className="m-4 inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-sm">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">WORM Contract:</span>
            {networkConfig.blockExplorerUrls.length > 0 ? (
              <a
                href={getBlockExplorerUrl(networkConfig.contracts.worm)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 font-mono text-xs hover:text-green-200 hover:underline transition-colors cursor-pointer"
                title={networkConfig.contracts.worm}
              >
                <span className="hidden sm:inline">{truncateAddress(networkConfig.contracts.worm, false)}</span>
                <span className="sm:hidden">{truncateAddress(networkConfig.contracts.worm, true)}</span>
              </a>
            ) : (
              <span className="text-green-300 font-mono text-xs" title={networkConfig.contracts.worm}>
                <span className="hidden sm:inline">{truncateAddress(networkConfig.contracts.worm, false)}</span>
                <span className="sm:hidden">{truncateAddress(networkConfig.contracts.worm, true)}</span>
              </span>
            )}
          </div>
          <div className="m-4 inline-flex items-center gap-2 bg-green-950/30 border border-green-700 rounded-lg px-4 py-2 text-sm">
            <Flame className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300">BETH Contract:</span>
            {networkConfig.blockExplorerUrls.length > 0 ? (
              <a
                href={getBlockExplorerUrl(networkConfig.contracts.beth)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-300 font-mono text-xs hover:text-yellow-200 hover:underline transition-colors cursor-pointer"
                title={networkConfig.contracts.beth}
              >
                <span className="hidden sm:inline">{truncateAddress(networkConfig.contracts.beth, false)}</span>
                <span className="sm:hidden">{truncateAddress(networkConfig.contracts.beth, true)}</span>
              </a>
            ) : (
              <span className="text-yellow-300 font-mono text-xs" title={networkConfig.contracts.beth}>
                <span className="hidden sm:inline">{truncateAddress(networkConfig.contracts.beth, false)}</span>
                <span className="sm:hidden">{truncateAddress(networkConfig.contracts.beth, true)}</span>
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Updates every 30 seconds •{" "}
            {networkConfig.blockExplorerUrls.length > 0
              ? "Click addresses to view on block explorer"
              : "Local network - no block explorer"}
          </div>
        </div>
      </div>
    </section>
  )
}
