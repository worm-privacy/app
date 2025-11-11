"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/use-wallet"
import { Loader2, Copy, CheckCircle2 } from "lucide-react"
import { ethers } from "ethers"

interface GenerateSignatureDialogProps {
  children: React.ReactNode
}

export function GenerateSignatureDialog({ children }: GenerateSignatureDialogProps) {
  const [open, setOpen] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSignature, setGeneratedSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { signer, address } = useWallet()

  const handleGenerate = async () => {
    if (!signer) {
      setError("Wallet not connected")
      return
    }

    if (!ethers.isAddress(userAddress)) {
      setError("Invalid Ethereum address")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Create message hash from user address
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [userAddress]))

      // Sign the message hash
      const signature = await signer.signMessage(ethers.getBytes(messageHash))

      setGeneratedSignature(signature)
      console.log("[v0] Generated signature:", signature)
    } catch (err: any) {
      console.error("[v0] Error generating signature:", err)
      setError(err.message || "Failed to generate signature")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (generatedSignature) {
      navigator.clipboard.writeText(generatedSignature)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setUserAddress("")
      setGeneratedSignature(null)
      setError(null)
      setCopied(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-gray-900 border-green-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-green-300">Generate Signature for New User</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a signature that allows a new user to join the network under your referral
          </DialogDescription>
        </DialogHeader>

        {!generatedSignature ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userAddress" className="text-green-300">
                New User's Address
              </Label>
              <Input
                id="userAddress"
                placeholder="0x..."
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="bg-black border-green-800 text-white"
              />
              <p className="text-xs text-gray-400">Enter the Ethereum address of the user who will join</p>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">{error}</div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !userAddress}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Signature"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center text-green-400 mb-2">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <Label className="text-green-300">Generated Signature</Label>
              <div className="relative">
                <div className="bg-black border border-green-800 rounded p-3 pr-12 font-mono text-xs text-green-300 break-all">
                  {generatedSignature}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 text-green-400 hover:text-green-300"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">Share this signature with the new user ({userAddress})</p>
            </div>

            <div className="bg-blue-950/30 border border-blue-800 rounded p-3 text-sm text-blue-300">
              <p className="font-semibold mb-1">Next Steps:</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-gray-300">
                <li>Copy and share this signature with the new user</li>
                <li>
                  Share your KOL address: <span className="font-mono text-green-300">{address}</span>
                </li>
                <li>They should use the "Join Network" feature with both pieces of information</li>
              </ol>
            </div>

            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full border-green-600 text-green-300 bg-transparent"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
