"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { Loader2, Lock } from 'lucide-react'
import { ethers } from "ethers"
import { ClaimWeekRewardDialog } from "./claim-week-reward-dialog"

interface StakeInfo {
  week: number
  totalStaked: string
  userStaked: string
  epochRewards: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}

const STAKING_ABI = [
  {
    inputs: [],
    name: "currentEpoch",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

// Storage slot calculation helpers
function getStorageSlot(mappingSlot: number, key: bigint): string {
  // For mapping(uint256 => uint256), slot = keccak256(abi.encode(key, mappingSlot))
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256"],
    [key, mappingSlot]
  )
  return ethers.keccak256(encoded)
}

function getNestedStorageSlot(mappingSlot: number, key1: bigint, key2: string): string {
  // For mapping(uint256 => mapping(address => uint256))
  // First hash: keccak256(abi.encode(key1, mappingSlot))
  const encoded1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256"],
    [key1, mappingSlot]
  )
  const firstHash = ethers.keccak256(encoded1)
  
  // Second hash: keccak256(abi.encode(key2, firstHash))
  const encoded2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes32"],
    [key2, firstHash]
  )
  return ethers.keccak256(encoded2)
}

export function StakingActivity() {
  const [weekData, setWeekData] = useState<StakeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<number>(0)
  const [isMobile, setIsMobile] = useState(false)
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<StakeInfo | null>(null)
  
  const { address } = useWallet()
  const { networkConfig } = useNetwork()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  useEffect(() => {
    const fetchStakes = async () => {
      try {
        setLoading(true)
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrls[0])
        const stakingContract = new ethers.Contract(
          networkConfig.contracts.staking,
          STAKING_ABI,
          provider
        )

        const week = await stakingContract.currentEpoch()
        const currentWeekNum = Number(week)
        setCurrentWeek(currentWeekNum)

        const weekRange = isMobile ? 2 : 4
        const numWeeks = 2 * weekRange + 1
        const startWeek = Math.max(0, currentWeekNum - weekRange)
        const endWeek = currentWeekNum < weekRange ? (startWeek + numWeeks) : (currentWeekNum + weekRange + 1)

        const weeks: StakeInfo[] = []
        const userAddr = address || ethers.ZeroAddress

        for (let w = startWeek; w < endWeek; w++) {
          try {
            const weekBigInt = BigInt(w)
            
            // Field 3: epochRewards mapping(uint256 => uint256)
            const rewardsSlot = getStorageSlot(3, weekBigInt)
            const rewardsData = await provider.getStorage(networkConfig.contracts.staking, rewardsSlot)
            const epochRewards = ethers.toBigInt(rewardsData)
            
            // Field 4: totalStakings mapping(uint256 => uint256)
            const totalSlot = getStorageSlot(4, weekBigInt)
            const totalData = await provider.getStorage(networkConfig.contracts.staking, totalSlot)
            const totalStaked = ethers.toBigInt(totalData)
            
            // Field 5: userStakings mapping(uint256 => mapping(address => uint256))
            const userSlot = getNestedStorageSlot(5, weekBigInt, userAddr)
            const userData = await provider.getStorage(networkConfig.contracts.staking, userSlot)
            const userStaked = ethers.toBigInt(userData)

            weeks.push({
              week: w,
              totalStaked: ethers.formatEther(totalStaked),
              userStaked: ethers.formatEther(userStaked),
              epochRewards: ethers.formatEther(epochRewards),
              isCurrent: w === currentWeekNum,
              isPast: w < currentWeekNum,
              isFuture: w > currentWeekNum
            })
          } catch (error) {
            console.error(`Error fetching week ${w}:`, error)
            weeks.push({
              week: w,
              totalStaked: "0",
              userStaked: "0",
              epochRewards: "0",
              isCurrent: w === currentWeekNum,
              isPast: w < currentWeekNum,
              isFuture: w > currentWeekNum
            })
          }
        }

        setWeekData(weeks)
      } catch (error) {
        console.error("Error fetching stakes:", error)
      } finally {
        setLoading(false)
      }
    }

    if (networkConfig.contracts.staking) {
      fetchStakes()
    }
  }, [address, networkConfig.contracts.staking, isMobile, networkConfig.rpcUrls])

  const gridCols = isMobile ? "grid-cols-5" : "grid-cols-9"
  const weekRange = isMobile ? 2 : 4

  const handleClaimClick = (week: StakeInfo) => {
    setSelectedWeek(week)
    setClaimDialogOpen(true)
  }

  if (loading) {
    return (
      <section className="py-12 bg-black">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
            <span className="text-gray-400">Loading staking activity...</span>
          </div>
        </div>
      </section>
    )
  }

  if (!address) {
    return (
      <section className="py-12 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center text-gray-400">
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Connect your wallet to view staking activity</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-black">
      <div className="container mx-auto px-6">
        <Card className="bg-green-950/40 border-green-800">
          <CardHeader>
            <CardTitle className="text-xl text-green-300 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Staking Timeline
            </CardTitle>
            <p className="text-sm text-gray-400">WORM tokens staked across past, current, and future weeks</p>
            <p className="text-sm text-cyan-300">Current Week: {currentWeek}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`grid ${gridCols} gap-2 text-xs text-gray-400 font-mono`}>
                <div className={`col-span-${weekRange} text-center`}>Past Weeks</div>
                <div className="text-center">Current</div>
                <div className={`col-span-${weekRange} text-center`}>Future Weeks</div>
              </div>

              <div className={`grid ${gridCols} gap-2`}>
                {weekData.map((week) => {
                  const maxTotal = Math.max(...weekData.map((w) => Number.parseFloat(w.totalStaked)))
                  const height = maxTotal > 0 ? (Number.parseFloat(week.totalStaked) / maxTotal) * 100 : 0

                  const userStaked = Number.parseFloat(week.userStaked)
                  const totalStaked = Number.parseFloat(week.totalStaked)
                  const userSharePercent = totalStaked > 0 ? (userStaked / totalStaked) * 100 : 0
                  const userHeight = (height * userSharePercent) / 100

                  return (
                    <div key={week.week} className="flex flex-col items-center">
                      <div className="w-full h-32 bg-gray-800 rounded relative overflow-hidden">
                        <div
                          className={`absolute bottom-0 w-full transition-all duration-500 ${
                            week.isCurrent
                              ? "bg-gradient-to-t from-yellow-500 to-yellow-300"
                              : week.isPast
                                ? "bg-gradient-to-t from-green-600 to-green-400"
                                : "bg-gradient-to-t from-gray-600 to-gray-500"
                          }`}
                          style={{ height: `${height}%` }}
                        />

                        {userStaked > 0 && (
                          <div
                            className="absolute bottom-0 w-full transition-all duration-500 bg-cyan-500/40"
                            style={{ height: `${userHeight}%` }}
                          />
                        )}

                        {week.isCurrent && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />}
                      </div>

                      <div className="mt-2 text-center">
                        <div className={`text-xs font-mono ${week.isCurrent ? "text-yellow-300" : "text-gray-400"}`}>
                          Week {week.week}
                        </div>
                        <div
                          className={`text-xs font-mono ${week.isCurrent ? "text-yellow-300" : "text-green-300"}`}
                        >
                          {Number.parseFloat(week.totalStaked).toFixed(2)} WORM
                        </div>
                        <div className="text-xs font-mono text-purple-300">
                          {Number.parseFloat(week.epochRewards).toFixed(4)} BETH
                        </div>
                        {userStaked > 0 && (
                          <div className="text-xs font-mono text-cyan-300">
                            {userStaked.toFixed(2)} WORM
                          </div>
                        )}
                        
                        {userStaked > 0 && (
                          <Button
                            size="sm"
                            variant={week.isPast ? "default" : "ghost"}
                            disabled={!week.isPast}
                            onClick={() => handleClaimClick(week)}
                            className={`mt-1 text-xs h-6 px-2 ${
                              week.isPast 
                                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center gap-4 pt-4 border-t border-green-800 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-t from-green-600 to-green-400 rounded"></div>
                  <span className="text-xs text-gray-400">Past Weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded"></div>
                  <span className="text-xs text-gray-400">Current Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-t from-gray-600 to-gray-500 rounded"></div>
                  <span className="text-xs text-gray-400">Future Weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500/40 rounded"></div>
                  <span className="text-xs text-gray-400">Your Stake</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500/40 rounded"></div>
                  <span className="text-xs text-gray-400">BETH Rewards</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {selectedWeek && (
          <ClaimWeekRewardDialog
            open={claimDialogOpen}
            onOpenChange={setClaimDialogOpen}
            week={selectedWeek}
          />
        )}
      </div>
    </section>
  )
}
