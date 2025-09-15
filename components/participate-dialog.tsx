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

interface ParticipateDialogProps {
  children: React.ReactNode
  bethBalance: string
  currentEpoch: number
}

export function ParticipateDialog({ children, bethBalance, currentEpoch }: ParticipateDialogProps) {
  const [open, setOpen] = useState(false)
  const [numEpochs, setNumEpochs] = useState("")
  const [bethPerEpoch, setBethPerEpoch] = useState("")
  const [loading, setLoading] = useState(false)
  const [approximateWormAmount, setApproximateWormAmount] = useState<bigint | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approving, setApproving] = useState(false)

  const { address } = useEthers()
  const { networkConfig } = useNetwork()
  const { readContract, writeContract } = useContract(networkConfig.contracts.worm, [
    {
      name: "approximate",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "_amountPerEpoch", type: "uint256" },
        { name: "_numEpochs", type: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "participate",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_amountPerEpoch", type: "uint256" },
        { name: "_numEpochs", type: "uint256" },
      ],
      outputs: [],
    },
  ])

  const { readContract: readBethContract, writeContract: writeBethContract } = useContract(
    networkConfig.contracts.beth,
    [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
      {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
      {
        name: "name",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
      },
      {
        name: "symbol",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
      },
      {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
      },
      {
        name: "totalSupply",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
  )

  const calculateTotal = () => {
    const epochs = Number.parseFloat(numEpochs) || 0
    const perEpoch = Number.parseFloat(bethPerEpoch) || 0
    return epochs * perEpoch
  }

  const totalBeth = calculateTotal()
  const userBalance = Number.parseFloat(bethBalance) || 0
  const hasEnoughBalance = totalBeth <= userBalance
  const isValid = numEpochs && bethPerEpoch && Number.parseFloat(numEpochs) > 0 && Number.parseFloat(bethPerEpoch) > 0

  useEffect(() => {
    const abortController = new AbortController()

    const fetchApproximateAmount = async () => {
      if (
        numEpochs &&
        bethPerEpoch &&
        Number.parseFloat(numEpochs) > 0 &&
        Number.parseFloat(bethPerEpoch) > 0 &&
        address &&
        networkConfig.contracts.worm
      ) {
        try {
          if (abortController.signal.aborted) return

          console.log("[v0] Calling approximate with:", {
            amountPerEpoch: Math.floor((Number.parseFloat(bethPerEpoch) || 0) * 1e18),
            numEpochs: Number.parseInt(numEpochs) || 0,
            contractAddress: networkConfig.contracts.worm,
            userAddress: address,
          })

          const result = await readContract("approximate", [
            BigInt(Math.floor((Number.parseFloat(bethPerEpoch) || 0) * 1e18)),
            BigInt(Number.parseInt(numEpochs) || 0),
          ])

          if (abortController.signal.aborted) return

          console.log("[v0] Approximate result:", result)
          setApproximateWormAmount(result)
        } catch (error: any) {
          if (!(error?.code === "NETWORK_ERROR" && error?.message?.includes("network changed"))) {
            console.error("[v0] Error fetching approximate WORM amount:", error)
          }
          if (!abortController.signal.aborted) {
            setApproximateWormAmount(null)
          }
        }
      } else {
        console.log("[v0] Not fetching amount - conditions not met:", {
          isValid: !!(
            numEpochs &&
            bethPerEpoch &&
            Number.parseFloat(numEpochs) > 0 &&
            Number.parseFloat(bethPerEpoch) > 0
          ),
          hasAddress: !!address,
          hasContractAddress: !!networkConfig.contracts.worm,
        })
        setApproximateWormAmount(null)
      }
    }

    fetchApproximateAmount()

    return () => {
      abortController.abort()
    }
  }, [numEpochs, bethPerEpoch, address, readContract, networkConfig.contracts.worm])

  useEffect(() => {
    const checkApproval = async () => {
      if (address && networkConfig.contracts.beth && networkConfig.contracts.worm && totalBeth > 0) {
        try {
          const allowance = await readBethContract("allowance", [address, networkConfig.contracts.worm])
          const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
          const hasInfiniteApproval = allowance >= maxUint256 / BigInt(2) // Consider anything above half of max as infinite
          const requiredAmount = BigInt(Math.floor(totalBeth * 1e18))
          setNeedsApproval(!hasInfiniteApproval && allowance < requiredAmount)
        } catch (error) {
          console.error("[v0] Error checking allowance:", error)
          setNeedsApproval(true)
        }
      } else {
        setNeedsApproval(false)
      }
    }

    checkApproval()
  }, [address, networkConfig.contracts.beth, networkConfig.contracts.worm, totalBeth, readBethContract])

  const handleApprove = async () => {
    if (!address || !networkConfig.contracts.worm) return

    setApproving(true)
    try {
      const largeApprovalAmount = BigInt("1000000000000000000000000") // 1M BETH tokens
      console.log("[v0] Approving large BETH spend:", {
        spender: networkConfig.contracts.worm,
        amount: largeApprovalAmount.toString(),
      })

      const tx = await writeBethContract("approve", [networkConfig.contracts.worm, largeApprovalAmount])
      console.log("[v0] Approval transaction sent:", tx.hash)

      await tx.wait()
      console.log("[v0] Approval transaction confirmed")

      setNeedsApproval(false)
    } catch (error) {
      console.error("[v0] Approval error:", error)
    } finally {
      setApproving(false)
    }
  }

  const handleParticipate = async () => {
    if (!isValid || needsApproval) return

    setLoading(true)
    try {
      console.log("[v0] Participating:", { numEpochs, bethPerEpoch, totalBeth })

      const amountPerEpochWei = BigInt(Math.floor((Number.parseFloat(bethPerEpoch) || 0) * 1e18))
      const numEpochsBigInt = BigInt(Number.parseInt(numEpochs) || 0)

      console.log("[v0] Calling participate with:", {
        amountPerEpoch: amountPerEpochWei.toString(),
        numEpochs: numEpochsBigInt.toString(),
      })

      const tx = await writeContract("participate", [amountPerEpochWei, numEpochsBigInt])
      console.log("[v0] Participate transaction sent:", tx.hash)

      await tx.wait()
      console.log("[v0] Participate transaction confirmed")

      setOpen(false)
      setNumEpochs("")
      setBethPerEpoch("")
    } catch (error) {
      console.error("[v0] Participate error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-green-950/95 border-green-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-green-300">Participate in Mining</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="numEpochs" className="text-green-300">
              Number of Epochs
            </Label>
            <Input
              id="numEpochs"
              type="number"
              value={numEpochs}
              onChange={(e) => setNumEpochs(e.target.value)}
              className="bg-green-950/60 border-green-700 text-white"
              placeholder="Enter number of epochs"
            />
          </div>

          <div>
            <Label htmlFor="bethPerEpoch" className="text-green-300">
              BETH per Epoch
            </Label>
            <Input
              id="bethPerEpoch"
              type="number"
              step="0.0001"
              value={bethPerEpoch}
              onChange={(e) => setBethPerEpoch(e.target.value)}
              className="bg-green-950/60 border-green-700 text-white"
              placeholder="Enter BETH amount per epoch"
            />
          </div>

          {/* Total Calculation */}
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-medium">Total BETH Required</span>
            </div>
            <div className="text-2xl font-mono text-yellow-300">{totalBeth.toFixed(4)} BETH</div>
            <div className="text-sm text-gray-400">Your Balance: {bethBalance} BETH</div>

            {!hasEnoughBalance && totalBeth > 0 && (
              <div className="flex items-center gap-2 mt-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Insufficient BETH balance</span>
              </div>
            )}
          </div>

          {numEpochs && bethPerEpoch && Number.parseFloat(numEpochs) > 0 && Number.parseFloat(bethPerEpoch) > 0 && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-green-400" />
                <span className="text-green-300 font-medium">Approximate WORM Reward</span>
              </div>
              <div className="text-2xl font-mono text-yellow-300">
                {approximateWormAmount ? (Number(approximateWormAmount) / 1e18).toFixed(4) : "Calculating..."} WORM
              </div>
              <div className="text-sm text-gray-400">Estimated based on current conditions</div>
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
            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={!isValid || !hasEnoughBalance || approving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
              >
                {approving ? "Approving..." : "Approve BETH"}
              </Button>
            ) : (
              <Button
                onClick={handleParticipate}
                disabled={!isValid || !hasEnoughBalance || loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
              >
                {loading ? "Participating..." : "Participate"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
