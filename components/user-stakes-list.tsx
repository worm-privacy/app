"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { ethers } from "ethers"
import { AlertCircle, Lock, Unlock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getRevertReason } from "@/lib/error-utils"

interface StakeInfo {
  id: number
  owner: string
  amount: string
  startingEpoch: number
  releaseEpoch: number
  released: boolean
}

const STAKING_ABI = [
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "stakeInfos",
    outputs: [
      { name: "owner", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "startingEpoch", type: "uint256" },
      { name: "releaseEpoch", type: "uint256" },
      { name: "released", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentEpoch",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_stakeId", type: "uint256" }],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export function UserStakesList() {
  const { address, signer } = useWallet()
  const { networkConfig } = useNetwork()
  const { toast } = useToast()
  const [stakes, setStakes] = useState<StakeInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [currentEpoch, setCurrentEpoch] = useState<number>(0)
  const [releasing, setReleasing] = useState<number | null>(null)
  

  useEffect(() => {
    if (address && networkConfig?.contracts.staking) {
      fetchUserStakes()
    }
  }, [address, networkConfig])

  const fetchUserStakes = async () => {
    if (!address || !networkConfig?.contracts.staking) return

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const contract = new ethers.Contract(networkConfig?.contracts.staking, STAKING_ABI, provider)

      // Get current epoch
      const epoch = await contract.currentEpoch()
      setCurrentEpoch(Number(epoch))

      // Loop through stakeInfos - try reading until we hit an error (end of array)
      const userStakes: StakeInfo[] = []
      let index = 0

      while (true) {
        try {
          const stakeInfo = await contract.stakeInfos(index)

          // Check if this stake belongs to the user
          if (stakeInfo.owner.toLowerCase() === address.toLowerCase()) {
            userStakes.push({
              id: index,
              owner: stakeInfo.owner,
              amount: ethers.formatEther(stakeInfo.amount),
              startingEpoch: Number(stakeInfo.startingEpoch),
              releaseEpoch: Number(stakeInfo.releaseEpoch),
              released: stakeInfo.released,
            })
          }

          index++
        } catch (error) {
          // End of array reached
          break
        }
      }

      setStakes(userStakes)
    } catch (error) {
      console.error("Error fetching stakes:", error)
      toast({
        title: "Error",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (stakeId: number) => {
    if (!signer || !networkConfig?.contracts.staking) return

    setReleasing(stakeId)
    try {
      const contract = new ethers.Contract(networkConfig?.contracts.staking, STAKING_ABI, signer)

      const tx = await contract.release(stakeId)

      toast({
        title: "Transaction Submitted",
        description: "Releasing your staked tokens...",
      })

      await tx.wait()

      toast({
        title: "Success",
        description: "Tokens released successfully!",
        variant: "default",
      })

      // Refresh stakes list
      await fetchUserStakes()
    } catch (error) {
      console.error("Error releasing stake:", error)
      toast({
        title: "Release Failed",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setReleasing(null)
    }
  }

  const getStakeStatus = (stake: StakeInfo) => {
    if (stake.released) return "Released"
    if (currentEpoch >= stake.releaseEpoch) return "Ready"
    return "Locked"
  }

  const getStatusColor = (stake: StakeInfo) => {
    if (stake.released) return "text-gray-500"
    if (currentEpoch >= stake.releaseEpoch) return "text-green-400"
    return "text-yellow-400"
  }

  if (!address) {
    return (
      <section className="py-12 bg-black">
        <div className="container mx-auto px-6">
          <Card className="bg-green-950/40 border-green-800 max-w-4xl mx-auto">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-gray-400">Connect your wallet to view your stakes</p>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-black">
      <div className="container mx-auto px-6">
        <Card className="bg-green-950/40 border-green-800 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-green-300 flex items-center justify-between">
              <span>Your Stakes</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && stakes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Loading your stakes...</div>
            ) : stakes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>You don't have any stakes yet</p>
                <p className="text-sm mt-2">Lock your WORM tokens to start earning rewards</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stakes.map((stake) => {
                  const status = getStakeStatus(stake)
                  const canRelease = status === "Ready"

                  return (
                    <div
                      key={stake.id}
                      className="bg-green-950/20 border border-green-800/50 rounded-lg p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-green-300">{stake.amount} WORM</span>
                          <span className={`text-xs font-semibold ${getStatusColor(stake)}`}>{status}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Weeks {stake.startingEpoch} - {stake.releaseEpoch - 1}
                          {!stake.released && ` (${stake.releaseEpoch - stake.startingEpoch} weeks)`}
                        </div>
                      </div>

                      {!stake.released && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canRelease || releasing === stake.id}
                          onClick={() => handleRelease(stake.id)}
                          className={
                            canRelease
                              ? "border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
                              : "border-gray-600 text-gray-500"
                          }
                        >
                          {releasing === stake.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Releasing...
                            </>
                          ) : (
                            <>
                              <Unlock className="w-4 h-4 mr-2" />
                              Release
                            </>
                          )}
                        </Button>
                      )}

                      {stake.released && <div className="text-sm text-gray-500 font-semibold">Released</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
