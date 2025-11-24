"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { useContract } from "@/hooks/use-ethers"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getRevertReason } from "@/lib/error-utils"

interface StakeInfo {
  week: number
  totalStaked: string
  userStaked: string
  epochRewards: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}

interface ClaimWeekRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  week: StakeInfo
}

const STAKING_ABI = [
  {
    inputs: [
      { name: "_fromEpoch", type: "uint256" },
      { name: "_count", type: "uint256" },
    ],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export function ClaimWeekRewardDialog({ open, onOpenChange, week }: ClaimWeekRewardDialogProps) {
  const [claiming, setClaiming] = useState(false)
  const { address } = useWallet()
  const { networkConfig } = useNetwork()
  const { writeContract } = useContract(networkConfig.contracts.staking, STAKING_ABI)

  // Calculate user's expected reward
  const userStaked = Number.parseFloat(week.userStaked)
  const totalStaked = Number.parseFloat(week.totalStaked)
  const epochRewards = Number.parseFloat(week.epochRewards)
  const userReward = totalStaked > 0 ? (userStaked / totalStaked) * epochRewards : 0

  const handleClaim = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    try {
      setClaiming(true)

      const tx = await writeContract("claimReward", [BigInt(week.week), BigInt(1)])

      toast({
        title: "Transaction Submitted",
        description: "Claiming your rewards...",
      })

      await tx.wait()

      toast({
        title: "Success",
        description: `Successfully claimed ${userReward.toFixed(4)} BETH from week ${week.week}!`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Claim error:", error)
      toast({
        title: "Claim Failed",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-purple-800">
        <DialogHeader>
          <DialogTitle className="text-purple-300">Claim Week {week.week} Rewards</DialogTitle>
          <DialogDescription className="text-gray-400">Confirm your reward claim details below</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Week:</span>
              <span className="text-sm text-purple-300 font-mono">Week {week.week}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Stake:</span>
              <span className="text-sm text-cyan-300 font-mono">{userStaked.toFixed(2)} WORM</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Staked:</span>
              <span className="text-sm text-green-300 font-mono">{totalStaked.toFixed(2)} WORM</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Share:</span>
              <span className="text-sm text-yellow-300 font-mono">
                {totalStaked > 0 ? ((userStaked / totalStaked) * 100).toFixed(2) : "0.00"}%
              </span>
            </div>

            <div className="h-px bg-purple-800 my-2"></div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">You Will Receive:</span>
              <span className="text-base font-bold text-purple-400 font-mono">{userReward.toFixed(4)} BETH</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={claiming}
            className="border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={claiming} className="bg-purple-600 hover:bg-purple-700">
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              "Claim Rewards"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
