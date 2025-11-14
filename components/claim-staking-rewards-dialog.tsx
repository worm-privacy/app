"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNetwork } from "@/hooks/use-network"
import { useContract, useEthers } from "@/hooks/use-ethers"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Gift } from 'lucide-react'
import { getRevertReason } from "@/lib/error-utils"

interface ClaimStakingRewardsDialogProps {
  children: React.ReactNode
}

const STAKING_ABI = [
  {
    inputs: [
      { name: "_fromEpoch", type: "uint256" },
      { name: "_count", type: "uint256" }
    ],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "currentEpoch",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

export function ClaimStakingRewardsDialog({ children }: ClaimStakingRewardsDialogProps) {
  const [open, setOpen] = useState(false)
  const [fromWeek, setFromWeek] = useState("")
  const [count, setCount] = useState("")
  const [isClaiming, setIsClaiming] = useState(false)
  const [currentWeek, setCurrentWeek] = useState<number>(0)
  
  const { networkConfig } = useNetwork()
  const { address } = useEthers()
  const { readContract, writeContract } = useContract(networkConfig.contracts.staking, STAKING_ABI)
  const { toast } = useToast()

  useEffect(() => {
    const fetchCurrentWeek = async () => {
      if (!address) return

      try {
        const week = await readContract("currentEpoch", [])
        if (week !== null) {
          setCurrentWeek(Number(week))
        }
      } catch (error) {
        console.error("[v0] Error fetching current week:", error)
      }
    }

    if (open) {
      fetchCurrentWeek()
    }
  }, [open, address, readContract])

  const handleClaim = async () => {
    if (!fromWeek || !count) return

    try {
      setIsClaiming(true)

      const tx = await writeContract("claimReward", [BigInt(parseInt(fromWeek)), BigInt(parseInt(count))])
      
      toast({
        title: "Claiming rewards",
        description: "Please wait for transaction confirmation...",
      })

      await tx.wait()

      toast({
        title: "Rewards claimed successfully",
        description: `Claimed rewards from weeks ${fromWeek} to ${parseInt(fromWeek) + parseInt(count) - 1}`,
      })

      setOpen(false)
      setFromWeek("")
      setCount("")
    } catch (error: any) {
      console.error("[v0] Claim error:", error)
      toast({
        title: "Claim failed",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  const isValidInput = fromWeek && count && parseInt(count) > 0 && parseInt(fromWeek) >= 0
  const toWeek = fromWeek && count ? parseInt(fromWeek) + parseInt(count) - 1 : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-gray-900 border-purple-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-purple-300 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Claim Staking Rewards
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Claim BETH rewards from completed staking weeks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
            <p className="text-sm text-purple-300">Current Week: {currentWeek}</p>
            <p className="text-xs text-gray-400 mt-1">
              You can only claim rewards from completed weeks (before week {currentWeek})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromWeek" className="text-purple-300">
              From Week
            </Label>
            <Input
              id="fromWeek"
              type="number"
              min="0"
              placeholder="0"
              value={fromWeek}
              onChange={(e) => setFromWeek(e.target.value)}
              className="bg-gray-800 border-purple-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="count" className="text-purple-300">
              Number of Weeks
            </Label>
            <Input
              id="count"
              type="number"
              min="1"
              placeholder="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="bg-gray-800 border-purple-700 text-white"
            />
            {isValidInput && (
              <p className="text-xs text-gray-400">
                Claiming weeks {fromWeek} to {toWeek}
              </p>
            )}
          </div>

          <Button
            onClick={handleClaim}
            disabled={!isValidInput || isClaiming}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
          >
            {isClaiming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim Rewards
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
