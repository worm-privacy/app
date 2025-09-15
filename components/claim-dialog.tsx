"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Calculator } from "lucide-react"
import { useEthers, useContract } from "@/hooks/use-ethers"
import { useNetwork } from "@/hooks/use-network"

interface ClaimDialogProps {
  children: React.ReactNode
  currentEpoch: number
}

export function ClaimDialog({ children, currentEpoch }: ClaimDialogProps) {
  const [open, setOpen] = useState(false)
  const [fromEpoch, setFromEpoch] = useState("")
  const [numEpochs, setNumEpochs] = useState("")
  const [loading, setLoading] = useState(false)
  const [expectedWormAmount, setExpectedWormAmount] = useState<bigint | null>(null)

  const { address } = useEthers()
  const { networkConfig } = useNetwork()
  const { readContract, writeContract } = useContract(networkConfig.contracts.worm, [
    {
      name: "calculateMintAmount",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "_startingEpoch", type: "uint256" },
        { name: "_numEpochs", type: "uint256" },
        { name: "_user", type: "address" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "claim",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_startingEpoch", type: "uint256" },
        { name: "_numEpochs", type: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
  ])

  const fromEpochNum = Number.parseInt(fromEpoch) || 0
  const numEpochsNum = Number.parseInt(numEpochs) || 0
  const toEpoch = fromEpochNum + numEpochsNum - 1
  const isValidEpochRange = fromEpochNum < currentEpoch && toEpoch < currentEpoch
  const isValid = fromEpoch && numEpochs && isValidEpochRange

  useEffect(() => {
    const fetchExpectedAmount = async () => {
      if (isValid && address && networkConfig.contracts.worm) {
        try {
          console.log("[v0] Calling calculateMintAmount with:", {
            startingEpoch: fromEpochNum,
            numEpochs: numEpochsNum,
            userAddress: address,
            contractAddress: networkConfig.contracts.worm,
          })

          const result = await readContract("calculateMintAmount", [
            BigInt(fromEpochNum),
            BigInt(numEpochsNum),
            address,
          ])

          console.log("[v0] calculateMintAmount result:", result)
          setExpectedWormAmount(result)
        } catch (error) {
          console.error("[v0] Error fetching expected WORM amount:", error)
          setExpectedWormAmount(null)
        }
      } else {
        console.log("[v0] Not fetching amount - conditions not met:", {
          isValid,
          hasAddress: !!address,
          hasContractAddress: !!networkConfig.contracts.worm,
        })
        setExpectedWormAmount(null)
      }
    }

    fetchExpectedAmount()
  }, [isValid, address, fromEpochNum, numEpochsNum, readContract, networkConfig.contracts.worm])

  const handleClaim = async () => {
    if (!isValid) return

    setLoading(true)
    try {
      console.log("[v0] Claiming:", { fromEpoch, numEpochs })

      const startingEpochBigInt = BigInt(fromEpochNum)
      const numEpochsBigInt = BigInt(numEpochsNum)

      console.log("[v0] Calling claim with:", {
        startingEpoch: startingEpochBigInt.toString(),
        numEpochs: numEpochsBigInt.toString(),
      })

      const tx = await writeContract("claim", [startingEpochBigInt, numEpochsBigInt])
      console.log("[v0] Claim transaction sent:", tx.hash)

      // Wait for transaction confirmation
      await tx.wait()
      console.log("[v0] Claim transaction confirmed")

      setOpen(false)
      // Reset form
      setFromEpoch("")
      setNumEpochs("")
    } catch (error) {
      console.error("[v0] Claim error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-green-950/95 border-green-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-green-300">Claim WORM Tokens</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="claimFromEpoch" className="text-green-300">
              From Epoch
            </Label>
            <Input
              id="claimFromEpoch"
              type="number"
              value={fromEpoch}
              onChange={(e) => setFromEpoch(e.target.value)}
              className="bg-green-950/60 border-green-700 text-white"
              placeholder="Enter starting epoch"
              max={currentEpoch - 1}
            />
          </div>

          <div>
            <Label htmlFor="claimNumEpochs" className="text-green-300">
              Number of Epochs
            </Label>
            <Input
              id="claimNumEpochs"
              type="number"
              value={numEpochs}
              onChange={(e) => setNumEpochs(e.target.value)}
              className="bg-green-950/60 border-green-700 text-white"
              placeholder="Enter number of epochs to claim"
            />
          </div>

          {fromEpoch && numEpochs && !isValidEpochRange && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Can only claim completed epochs (current: {currentEpoch}, claiming: {fromEpochNum}-{toEpoch})
              </span>
            </div>
          )}

          {isValid && expectedWormAmount !== null && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-green-400" />
                <span className="text-green-300 font-medium">Expected WORM Reward</span>
              </div>
              <div className="text-2xl font-mono text-yellow-300">
                {expectedWormAmount === 0n ? "0.0000" : (Number(expectedWormAmount) / 1e18).toFixed(4)} WORM
              </div>
              <div className="text-sm text-gray-400">
                Claimable from epochs {fromEpochNum} to {toEpoch}
              </div>
              {expectedWormAmount === 0n && (
                <div className="text-sm text-orange-400 mt-2">
                  No WORM tokens available for these epochs. You may not have participated in mining during this period.
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={!isValid || loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
            >
              {loading ? "Claiming..." : "Claim"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
