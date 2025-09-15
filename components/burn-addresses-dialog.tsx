"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Flame, Sprout, RefreshCw } from "lucide-react"
import { keccak256, Signature, formatEther, parseEther } from "ethers"
import { poseidon4 } from "poseidon-lite"
import { useWallet } from "@/hooks/use-wallet"

const FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617")
const POSEIDON_BURN_ADDRESS_PREFIX = BigInt("0xba44186ee7876b8007d2482cd46cec2d115b780980a6b46f0363f983d892f7e")

interface BurnKeyResult {
  index: number
  burnKey: string
  burnAddress: string
  balance?: string
}

interface MintStage {
  stage: "confirm" | "generate" | "submit" | "complete"
  proof?: any
}

interface BurnAddressesDialogProps {
  children: React.ReactNode
  onBurnComplete?: () => void
}

export function BurnAddressesDialog({ children, onBurnComplete }: BurnAddressesDialogProps) {
  const { address: walletAddress, signer } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<BurnKeyResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCount, setCurrentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [scalarValue, setScalarValue] = useState<bigint | null>(null)
  const [loadingBalances, setLoadingBalances] = useState<Set<number>>(new Set())
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [selectedBurnAddress, setSelectedBurnAddress] = useState<string>("")
  const [burnAmount, setBurnAmount] = useState("")
  const [isBurning, setIsBurning] = useState(false)
  const [isMintOperation, setIsMintOperation] = useState(false)
  const [selectedBurnKey, setSelectedBurnKey] = useState<string>("")
  const [mintStage, setMintStage] = useState<MintStage>({ stage: "confirm" })
  const [selectedEndpoint, setSelectedEndpoint] = useState("http://12.23.34.45:8000/prove")

  const STORAGE_KEY = `burn-key-results-${walletAddress}`
  const PROVING_ENDPOINTS = ["http://12.23.34.45:8000/prove", "http://45.34.23.12:8000/prove"]

  const saveToLocalStorage = (newResults: BurnKeyResult[]) => {
    try {
      if (walletAddress) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults))
      }
    } catch (err) {
      console.error("Failed to save to localStorage:", err)
    }
  }

  const loadFromLocalStorage = (): BurnKeyResult[] => {
    try {
      if (!walletAddress) return []
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error("Failed to load from localStorage:", err)
      return []
    }
  }

  useEffect(() => {
    if (walletAddress && isOpen) {
      const cachedResults = loadFromLocalStorage()
      if (cachedResults.length > 0) {
        setResults(cachedResults)
        setCurrentCount(Math.max(...cachedResults.map((r) => r.index)) + 1)
      }
    }
  }, [walletAddress, isOpen])

  const fetchBalance = async (address: string, index: number) => {
    if (!signer) return

    setLoadingBalances((prev) => new Set(prev).add(index))

    try {
      const provider = signer.provider
      const balance = await provider.getBalance(address)
      const balanceInEth = formatEther(balance)

      setResults((prev) =>
        prev.map((result) => (result.index === index ? { ...result, balance: balanceInEth } : result)),
      )

      const updatedResults = results.map((result) =>
        result.index === index ? { ...result, balance: balanceInEth } : result,
      )
      saveToLocalStorage(updatedResults)
    } catch (err) {
      console.error("Failed to fetch balance:", err)
    } finally {
      setLoadingBalances((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  function numberToBytes(num: bigint, length: number): Uint8Array {
    const hex = num.toString(16).padStart(length * 2, "0")
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = Number.parseInt(hex.substr(i * 2, 2), 16)
    }
    return bytes
  }

  function concatBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const arr of arrays) {
      result.set(arr, offset)
      offset += arr.length
    }
    return result
  }

  function hasMinZeroBytes(hash: string, minZeros: number): boolean {
    const hashWithoutPrefix = hash.slice(2)
    return hashWithoutPrefix.slice(0, minZeros * 2) === "0".repeat(minZeros * 2)
  }

  function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = Number.parseInt(cleanHex.substr(i, 2), 16)
    }
    return bytes
  }

  async function getDeterministicStartingPoint(): Promise<bigint> {
    if (!signer) {
      throw new Error("Wallet not connected")
    }

    if (scalarValue !== null) {
      return scalarValue
    }

    const message = "EIP-7503"
    const signature = await signer.signMessage(message)
    const parsedSignature = Signature.from(signature)
    const startingPoint = BigInt(parsedSignature.s) % FIELD_SIZE

    setScalarValue(startingPoint)
    return startingPoint
  }

  function deriveBurnAddress(burnKey: bigint, receiverAddr: string, feeAmount: bigint): string {
    try {
      const receiverAddrBigInt = BigInt(receiverAddr)

      const prefixHex = "0x" + POSEIDON_BURN_ADDRESS_PREFIX.toString(16)
      const burnKeyHex = "0x" + burnKey.toString(16)
      const receiverHex = "0x" + receiverAddrBigInt.toString(16)
      const feeHex = "0x" + feeAmount.toString(16)

      const poseidonHash = poseidon4([prefixHex, burnKeyHex, receiverHex, feeHex])

      const hashBytes = numberToBytes(BigInt(poseidonHash), 32)
      const addressBytes = hashBytes.slice(0, 20)

      const addressHex =
        "0x" +
        Array.from(addressBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")

      return addressHex
    } catch (err) {
      console.error("Error deriving burn address:", err)
      throw new Error("Failed to derive burn address")
    }
  }

  async function findBurnKey(index: number) {
    setIsGenerating(true)
    setError(null)

    try {
      if (!signer || !walletAddress) {
        throw new Error("Please connect your wallet first")
      }

      const receiverAddress = walletAddress
      const feeAmount = BigInt(0)
      const minZeros = 2

      const receiverAddressBytes = hexToBytes(receiverAddress)
      const feeBytes = numberToBytes(feeAmount, 32)
      const eipBytes = new TextEncoder().encode("EIP-7503")

      const baseScalar = await getDeterministicStartingPoint()
      let burnKey = (baseScalar + BigInt(index) * BigInt(10) ** BigInt(18)) % FIELD_SIZE

      let iterations = 0
      const maxIterations = 1000000

      while (iterations < maxIterations) {
        if (burnKey >= FIELD_SIZE) {
          burnKey = BigInt(0)
        }

        const burnKeyBytes = numberToBytes(burnKey, 32)
        const combined = concatBytes(burnKeyBytes, receiverAddressBytes, feeBytes, eipBytes)
        const hexString =
          "0x" +
          Array.from(combined)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")

        const hash = keccak256(hexString)

        if (hasMinZeroBytes(hash, minZeros)) {
          const derivedBurnAddress = deriveBurnAddress(burnKey, receiverAddress, feeAmount)

          const newResult = {
            index,
            burnKey: burnKey.toString(),
            burnAddress: derivedBurnAddress,
          }

          setResults((prev) => {
            const newResults = prev.filter((r) => r.index !== index)
            const updatedResults = [...newResults, newResult].sort((a, b) => a.index - b.index)
            saveToLocalStorage(updatedResults)
            return updatedResults
          })

          setTimeout(() => fetchBalance(derivedBurnAddress, index), 100)
          return
        }

        burnKey += BigInt(1)
        iterations++

        if (iterations % 1000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      throw new Error(`Could not find suitable burn key within ${maxIterations} iterations for index ${index}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const generateNextBurnKey = () => {
    findBurnKey(currentCount)
    setCurrentCount((prev) => prev + 1)
  }

  const openBurnDialog = (burnAddress: string) => {
    const result = results.find((r) => r.burnAddress === burnAddress)
    const balance = result?.balance ? Number.parseFloat(result.balance) : 0
    const isMint = balance > 0

    setSelectedBurnAddress(burnAddress)
    setSelectedBurnKey(result?.burnKey || "")
    setIsMintOperation(isMint)
    setMintStage({ stage: "confirm" })
    setBurnDialogOpen(true)
    setBurnAmount("")
  }

  const handleBurn = async () => {
    if (!signer || !burnAmount || !selectedBurnAddress) return

    setIsBurning(true)
    try {
      const amountInWei = parseEther(burnAmount)

      const tx = await signer.sendTransaction({
        to: selectedBurnAddress,
        value: amountInWei,
      })

      await tx.wait()

      // Refresh balance after successful burn
      const result = results.find((r) => r.burnAddress === selectedBurnAddress)
      if (result) {
        setTimeout(() => fetchBalance(selectedBurnAddress, result.index), 1000)
      }

      setBurnDialogOpen(false)
      setBurnAmount("")
      onBurnComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to burn ETH")
    } finally {
      setIsBurning(false)
    }
  }

  const generateProof = async () => {
    setMintStage({ stage: "generate" })

    const proofRequest = {
      burnKey: selectedBurnKey,
      receiverAddress: walletAddress,
      fee: 0,
    }

    console.log(`[v0] Generating proof with endpoint: ${selectedEndpoint}`)
    console.log("[v0] Generating proof with request:", JSON.stringify(proofRequest, null, 2))

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const fakeProof = {
      proof: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      publicSignals: ["0x123", "0x456", "0x789"],
    }

    console.log("[v0] Generated proof:", JSON.stringify(fakeProof, null, 2))
    setMintStage({ stage: "submit", proof: fakeProof })
  }

  const submitProof = async () => {
    console.log("[v0] Submitting proof:", JSON.stringify(mintStage.proof, null, 2))

    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("[v0] Proof submitted successfully!")
    setMintStage({ stage: "complete" })

    setTimeout(() => {
      setBurnDialogOpen(false)
      setMintStage({ stage: "confirm" })
    }, 2000)
  }

  const refreshBalances = () => {
    results.forEach((result) => {
      fetchBalance(result.burnAddress, result.index)
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="bg-green-950/95 border-green-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-green-300 flex items-center gap-2">
              <Flame className="w-6 h-6" />
              Burn Addresses
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your burn addresses for EIP-7503 transactions. Generate new addresses or use existing ones to burn
              ETH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={refreshBalances}
                size="sm"
                variant="outline"
                className="border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
                disabled={loadingBalances.size > 0}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingBalances.size > 0 ? "animate-spin" : ""}`} />
                Refresh Balances
              </Button>

              <Button
                onClick={generateNextBurnKey}
                disabled={isGenerating || !walletAddress}
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating #{currentCount}...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Address #{currentCount}
                  </>
                )}
              </Button>
            </div>

            {results.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.index}
                    className="flex items-center gap-2 p-3 bg-green-950/40 border border-green-800 rounded-lg"
                  >
                    <span className="text-sm font-medium min-w-[60px] text-green-300">#{result.index}</span>
                    <span className="text-xs text-gray-300 flex-1 font-mono bg-black/30 px-2 py-1 rounded">
                      {result.burnAddress}
                    </span>
                    <span className="text-xs text-gray-400 min-w-[120px]">
                      Balance:{" "}
                      {loadingBalances.has(result.index) ? (
                        <Loader2 className="h-3 w-3 animate-spin inline text-green-400" />
                      ) : result.balance ? (
                        <span className="text-green-300 font-medium">
                          {Number.parseFloat(result.balance).toFixed(6)} ETH
                        </span>
                      ) : (
                        "Unknown"
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openBurnDialog(result.burnAddress)}
                      className="ml-2 border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
                    >
                      {result.balance && Number.parseFloat(result.balance) > 0 ? (
                        <>
                          <Sprout className="h-3 w-3 mr-1 text-green-400" />
                          Mint
                        </>
                      ) : (
                        <>
                          <Flame className="h-3 w-3 mr-1 text-yellow-400" />
                          Burn
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Flame className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <p>No burn addresses generated yet.</p>
                <p className="text-sm">Click "Generate Address" to create your first burn address.</p>
              </div>
            )}

            {error && (
              <Alert className="bg-red-900/30 border-red-700">
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={burnDialogOpen} onOpenChange={setBurnDialogOpen}>
        <DialogContent className="bg-green-950/95 border-green-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-green-300">{isMintOperation ? "Mint BETH" : "Burn ETH"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {isMintOperation ? (
                <>
                  {mintStage.stage === "confirm" && (
                    <>
                      <strong>{results.find((r) => r.burnAddress === selectedBurnAddress)?.balance || "0"} BETH</strong>{" "}
                      is going to be minted for address <strong>{walletAddress}</strong>
                      <br />
                      <br />
                      The process has two stages:
                      <br />
                      1. Generate proof
                      <br />
                      2. Submit proof
                    </>
                  )}
                  {mintStage.stage === "generate" && "Generating cryptographic proof..."}
                  {mintStage.stage === "submit" && "Proof generated successfully. Ready to submit."}
                  {mintStage.stage === "complete" && "BETH minted successfully!"}
                </>
              ) : (
                `Send ETH to the burn address: ${selectedBurnAddress}`
              )}
            </DialogDescription>
          </DialogHeader>

          {isMintOperation ? (
            <div className="space-y-4">
              {/* Privacy warning box for mint operations */}
              <Alert className="bg-yellow-900/30 border-yellow-600">
                <AlertDescription className="text-yellow-200">
                  <strong>Privacy Notice:</strong> If you want to use the privacy aspects of this protocol, it's
                  mandatory to broadcast the proof submission transaction through a different wallet. If you just want
                  to get BETH for WORM mining, using the same wallet is okay.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-green-950/40 border border-green-800 rounded-lg">
                <p className="text-sm text-white">
                  <strong>Burn Address:</strong> <span className="font-mono text-xs">{selectedBurnAddress}</span>
                </p>
                <p className="text-sm text-white">
                  <strong>Available Balance:</strong>{" "}
                  <span className="text-green-300 font-medium">
                    {results.find((r) => r.burnAddress === selectedBurnAddress)?.balance || "0"} ETH
                  </span>
                </p>
              </div>

              {mintStage.stage === "confirm" && (
                <div className="space-y-2">
                  <Label htmlFor="endpoint" className="text-white">
                    Proving Endpoint
                  </Label>
                  <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                    <SelectTrigger className="bg-green-950/60 border-green-700 text-white">
                      <SelectValue placeholder="Select proving endpoint" />
                    </SelectTrigger>
                    <SelectContent className="bg-green-950 border-green-700">
                      {PROVING_ENDPOINTS.map((endpoint) => (
                        <SelectItem key={endpoint} value={endpoint}>
                          {endpoint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mintStage.stage === "submit" && (
                <div className="p-3 bg-green-950/40 border border-green-800 rounded text-xs">
                  <strong className="text-white">Proof Generated:</strong>
                  <pre className="mt-1 text-xs overflow-x-auto text-gray-300">
                    {JSON.stringify(mintStage.proof, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setBurnDialogOpen(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>

                {mintStage.stage === "confirm" && (
                  <Button
                    onClick={generateProof}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
                  >
                    Generate proof
                  </Button>
                )}
                {mintStage.stage === "generate" && (
                  <Button disabled className="flex-1 bg-gray-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating proof...
                  </Button>
                )}
                {mintStage.stage === "submit" && (
                  <Button
                    onClick={submitProof}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
                  >
                    Submit proof
                  </Button>
                )}
                {mintStage.stage === "complete" && (
                  <Button disabled className="flex-1 bg-green-600">
                    <Sprout className="mr-2 h-4 w-4" />
                    Minted successfully!
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="burnAmount" className="text-white">
                  Amount (ETH)
                </Label>
                <Input
                  id="burnAmount"
                  type="number"
                  placeholder="0.0"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  min="0"
                  max="1"
                  step="0.001"
                  className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Maximum: 1 ETH</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setBurnDialogOpen(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBurn}
                  disabled={
                    !burnAmount || Number.parseFloat(burnAmount) <= 0 || Number.parseFloat(burnAmount) > 10 || isBurning
                  }
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
                >
                  {isBurning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Burning...
                    </>
                  ) : (
                    <>
                      <Flame className="mr-2 h-4 w-4" />
                      Burn {burnAmount} ETH
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
