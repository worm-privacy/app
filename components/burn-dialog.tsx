"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, AlertCircle, Loader2, CheckCircle, ExternalLink } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { ethers } from "ethers"

interface BurnDialogProps {
  children: React.ReactNode
  onBurnComplete?: () => void
}

export function BurnDialog({ children, onBurnComplete }: BurnDialogProps) {
  const { signer, address } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [burnAddress, setBurnAddress] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [step, setStep] = useState<"input" | "generating" | "confirming" | "success">("input")

  const validateAmount = (value: string): string | null => {
    if (!value || value === "0") {
      return "Please enter an amount"
    }

    const numValue = Number.parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      return "Please enter a valid amount"
    }

    if (numValue > 10) {
      return "Maximum burn amount is 1 ETH"
    }

    return null
  }

  const generateBurnAddress = async (burnAmount: string): Promise<string> => {
    console.log("[v0] Generating burn address for amount:", burnAmount)

    // Mock API call - replace with actual API endpoint
    const response = await fetch("/api/generate-burn-address", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: burnAmount }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate burn address")
    }

    const data = await response.json()
    if (!data.burnAddress) {
      throw new Error("Invalid response from burn address API")
    }

    return data.burnAddress
  }

  const handleBurn = async () => {
    if (!signer || !address) {
      setError("Wallet not connected")
      return
    }

    const validationError = validateAmount(amount)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setStep("generating")

      // Generate burn address
      const generatedBurnAddress = await generateBurnAddress(amount)
      setBurnAddress(generatedBurnAddress)
      console.log("[v0] Generated burn address:", generatedBurnAddress)

      setStep("confirming")

      // Create transaction
      const tx = await signer.sendTransaction({
        to: generatedBurnAddress,
        value: ethers.parseEther(amount),
      })

      console.log("[v0] Transaction sent:", tx.hash)
      setTxHash(tx.hash)

      // Wait for confirmation
      await tx.wait()
      console.log("[v0] Transaction confirmed")

      setStep("success")
      onBurnComplete?.()
    } catch (err: any) {
      console.error("[v0] Burn transaction error:", err)
      setError(err.message || "Transaction failed")
      setStep("input")
    } finally {
      setLoading(false)
    }
  }

  const resetDialog = () => {
    setAmount("")
    setError(null)
    setBurnAddress(null)
    setTxHash(null)
    setStep("input")
    setLoading(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(resetDialog, 300) // Reset after dialog closes
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-green-950/95 border-green-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-green-300 flex items-center gap-2">
            <Flame className="w-6 h-6" />
            Burn ETH to Mine WORM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === "input" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-green-300">
                  Amount to Burn (ETH)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max="1"
                  step="0.0001"
                  className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400">Maximum: 1 ETH per transaction</p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBurn}
                  disabled={loading || !amount}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 mr-2" />
                      Burn ETH
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "generating" && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-300 mb-2">Generating Burn Address</h3>
              <p className="text-gray-400">Creating unique burn address for your transaction...</p>
            </div>
          )}

          {step === "confirming" && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">Confirming Transaction</h3>
              <p className="text-gray-400 mb-4">Please confirm the transaction in your wallet</p>
              {burnAddress && (
                <div className="bg-green-950/60 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Burn Address:</p>
                  <p className="font-mono text-sm text-green-300 break-all">{burnAddress}</p>
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-300 mb-2">Burn Successful!</h3>
              <p className="text-gray-400 mb-4">Your ETH has been burned and WORM tokens will be minted</p>

              {txHash && (
                <div className="bg-green-950/60 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-400 mb-2">Transaction Hash:</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-green-300 hover:text-green-200 flex items-center justify-center gap-1"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
