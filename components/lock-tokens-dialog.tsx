"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNetwork } from "@/hooks/use-network"
import { useContract } from "@/hooks/use-ethers"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Lock, AlertCircle } from 'lucide-react'
import { getRevertReason } from "@/lib/error-utils"

interface LockTokensDialogProps {
  children: React.ReactNode
  wormBalance: string
}

const STAKING_ABI = [
  {
    inputs: [
      { name: "_amount", type: "uint256" },
      { name: "_numEpochs", type: "uint256" }
    ],
    name: "lock",
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

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

export function LockTokensDialog({ children, wormBalance }: LockTokensDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [weeks, setWeeks] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(true)
  
  const { networkConfig } = useNetwork()
  const { writeContract: writeWormContract } = useContract(networkConfig.contracts.worm, ERC20_ABI)
  const { writeContract: writeStakingContract } = useContract(networkConfig.contracts.staking, STAKING_ABI)
  const { toast } = useToast()

  const handleApprove = async () => {
    if (!amount) return

    try {
      setIsApproving(true)

      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const tx = await writeWormContract("approve", [networkConfig.contracts.staking, amountWei])
      
      toast({
        title: "Approval pending",
        description: "Please wait for transaction confirmation...",
      })

      await tx.wait()

      setNeedsApproval(false)
      toast({
        title: "Approval successful",
        description: `Approved ${amount} WORM for staking`,
      })
    } catch (error: any) {
      console.error("[v0] Approval error:", error)
      toast({
        title: "Approval failed",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleLock = async () => {
    if (!amount || !weeks) return

    try {
      setIsLocking(true)

      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const numWeeks = BigInt(parseInt(weeks))

      const tx = await writeStakingContract("lock", [amountWei, numWeeks])
      
      toast({
        title: "Locking tokens",
        description: "Please wait for transaction confirmation...",
      })

      await tx.wait()

      toast({
        title: "Tokens locked successfully",
        description: `Locked ${amount} WORM for ${weeks} weeks`,
      })

      setOpen(false)
      setAmount("")
      setWeeks("")
      setNeedsApproval(true)
    } catch (error: any) {
      console.error("[v0] Lock error:", error)
      toast({
        title: "Lock failed",
        description: getRevertReason(error),
        variant: "destructive",
      })
    } finally {
      setIsLocking(false)
    }
  }

  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(wormBalance || "0")
  const isValidWeeks = weeks && parseInt(weeks) > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-gray-900 border-green-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-green-300 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Lock WORM Tokens
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Lock your WORM tokens for a specified number of weeks to earn BETH rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-green-300">
              Amount (WORM)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setNeedsApproval(true)
              }}
              className="bg-gray-800 border-green-700 text-white"
            />
            <p className="text-xs text-gray-400">Available: {wormBalance} WORM</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeks" className="text-green-300">
              Lock Duration (Weeks)
            </Label>
            <Input
              id="weeks"
              type="number"
              min="1"
              placeholder="1"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              className="bg-gray-800 border-green-700 text-white"
            />
            <p className="text-xs text-gray-400">
              Tokens will be locked from next week to week {weeks ? parseInt(weeks) : "N"}
            </p>
          </div>

          {needsApproval && isValidAmount && (
            <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">
                You need to approve the staking contract to spend your WORM tokens before locking
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {needsApproval && (
              <Button
                onClick={handleApprove}
                disabled={!isValidAmount || isApproving}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
            )}

            <Button
              onClick={handleLock}
              disabled={!isValidAmount || !isValidWeeks || needsApproval || isLocking}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
            >
              {isLocking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Lock Tokens
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
