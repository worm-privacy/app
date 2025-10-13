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
import { poseidon6, poseidon2 } from "poseidon-lite"
import { useWallet } from "@/hooks/use-wallet"
import { ethers } from "ethers"
import { useNetwork } from "@/hooks/use-network"

const FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617")
const POSEIDON_BURN_ADDRESS_PREFIX = BigInt("0xba44186ee7876b8007d2482cd46cec2d115b780980a6b46f0363f983d892f7e")
const NULLIFIER_PREFIX = BigInt("0xba44186ee7876b8007d2482cd46cec2d115b780980a6b46f0363f983d892f7f")

interface BurnKeyResult {
  index: number
  burnKey: string
  burnAddress: string
  proverFee: string
  broadcasterFee: string
  revealAmount: string
  balance?: string
  isConsumed?: boolean
  checkingConsumption?: boolean
}

interface MintStage {
  stage: "confirm" | "generate" | "submit" | "submitting" | "complete"
  proof?: any
}

interface BurnAddressesDialogProps {
  children: React.ReactNode
  onBurnComplete?: () => void
}

export function BurnAddressesDialog({ children, onBurnComplete }: BurnAddressesDialogProps) {
  const { address: walletAddress, signer } = useWallet()
  const { networkConfig } = useNetwork()
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<BurnKeyResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCount, setCurrentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [scalarValue, setScalarValue] = useState<bigint | null>(null)
  const [loadingBalances, setLoadingBalances] = useState<Set<number>>(new Set())
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [selectedBurnAddress, setSelectedBurnAddress] = useState<string>("")
  const [burnAmount, setBurnAmount] = useState("")
  const [isBurning, setIsBurning] = useState(false)
  const [isMintOperation, setIsMintOperation] = useState(false)
  const [selectedBurnKey, setSelectedBurnKey] = useState<string>("")
  const [mintStage, setMintStage] = useState<MintStage>({ stage: "confirm" })
  const [selectedEndpoint, setSelectedEndpoint] = useState("https://worm-miner-3.darkube.app/proof")
  const [customEndpoint, setCustomEndpoint] = useState("")
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(false)
  const [showConsumedAddresses, setShowConsumedAddresses] = useState(false)

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [newBroadcasterFee, setNewBroadcasterFee] = useState("0")
  const [newProverFee, setNewProverFee] = useState("0")
  const [newBurnAmount, setNewBurnAmount] = useState("")

  const STORAGE_KEY = `burn-key-results-${walletAddress}`
  const PROVING_ENDPOINTS = [
    "https://worm-miner-3.darkube.app/proof",
    "https://worm-testnet.metatarz.xyz/proof",
    "http://localhost:8080/proof",
  ]

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

    console.log(`[v0] Fetching balance for address ${address} at index ${index}`)
    setLoadingBalances((prev) => new Set(prev).add(index))

    try {
      const provider = signer.provider
      const balance = await provider.getBalance(address)
      const balanceInEth = formatEther(balance)

      console.log(`[v0] Balance fetched: ${balanceInEth} ETH for address ${address}`)

      setResults((prev) =>
        prev.map((result) => (result.index === index ? { ...result, balance: balanceInEth } : result)),
      )

      const updatedResults = results.map((result) =>
        result.index === index ? { ...result, balance: balanceInEth } : result,
      )
      saveToLocalStorage(updatedResults)

      if (Number.parseFloat(balanceInEth) > 0) {
        console.log(`[v0] Balance > 0, checking nullifier consumption for index ${index}`)
        const result = results.find((r) => r.index === index)
        if (result) {
          console.log(`[v0] Found result for index ${index}, burn key: ${result.burnKey}`)
          await checkNullifierConsumption(result.burnKey, index)
        } else {
          console.log(`[v0] No result found for index ${index}`)
        }
      }
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

  function deriveBurnAddress(
    burnKey: bigint,
    receiverAddr: string,
    proverFee: bigint,
    broadcasterFee: bigint,
    revealAmount: bigint,
  ): string {
    try {
      const receiverAddrBigInt = BigInt(receiverAddr)

      const prefixHex = "0x" + POSEIDON_BURN_ADDRESS_PREFIX.toString(16)
      const burnKeyHex = "0x" + burnKey.toString(16)
      const receiverHex = "0x" + receiverAddrBigInt.toString(16)
      const proverFeeHex = "0x" + proverFee.toString(16)
      const broadcasterFeeHex = "0x" + broadcasterFee.toString(16)
      const revealAmountHex = "0x" + revealAmount.toString(16)

      const poseidonHash = poseidon6([
        prefixHex,
        burnKeyHex,
        receiverHex,
        proverFeeHex,
        broadcasterFeeHex,
        revealAmountHex,
      ])

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

  function calculateNullifier(burnKey: string): bigint {
    const burnKeyBigInt = BigInt(burnKey)
    return BigInt(poseidon2(["0x" + NULLIFIER_PREFIX.toString(16), "0x" + burnKeyBigInt.toString(16)]))
  }

  function calculateStorageSlot(nullifier: bigint): string {
    const nullifierBytes = new Uint8Array(32)
    const slotBytes = new Uint8Array(32)

    const nullifierHex = nullifier.toString(16).padStart(64, "0")
    for (let i = 0; i < 32; i++) {
      nullifierBytes[i] = Number.parseInt(nullifierHex.substr(i * 2, 2), 16)
    }

    slotBytes[31] = 7

    const combined = new Uint8Array(64)
    combined.set(nullifierBytes, 0)
    combined.set(slotBytes, 32)
    console.log(combined)

    return keccak256(combined)
  }

  const checkNullifierConsumption = async (burnKey: string, index: number) => {
    if (!signer?.provider) {
      console.log(`[v0] No signer or provider available for nullifier check`)
      return
    }

    console.log(`[v0] Checking nullifier consumption for burn key ${burnKey} at index ${index}`)

    setResults((prev) =>
      prev.map((result) => (result.index === index ? { ...result, checkingConsumption: true } : result)),
    )

    try {
      const contractAddress = networkConfig.contracts.beth
      if (!contractAddress) {
        console.warn(`[v0] BETH contract address not configured`)
        return
      }

      console.log(`[v0] Using BETH contract address: ${contractAddress}`)

      const nullifier = calculateNullifier(burnKey)
      const storageSlot = calculateStorageSlot(nullifier)

      console.log(`[v0] Nullifier: ${nullifier.toString()}`)
      console.log(`[v0] Storage slot: ${storageSlot}`)

      const storageValue = await signer.provider.getStorage(contractAddress, storageSlot)
      console.log(storageSlot)
      const isConsumed = storageValue === "0x0000000000000000000000000000000000000000000000000000000000000001"

      console.log(`[v0] Storage value: ${storageValue}`)
      console.log(`[v0] Is consumed: ${isConsumed}`)

      setResults((prev) => {
        const updatedResults = prev.map((result) =>
          result.index === index ? { ...result, isConsumed, checkingConsumption: false } : result,
        )
        saveToLocalStorage(updatedResults)
        return updatedResults
      })
    } catch (error) {
      console.error(`[v0] Error checking nullifier consumption:`, error)
      setResults((prev) =>
        prev.map((result) => (result.index === index ? { ...result, checkingConsumption: false } : result)),
      )
    }
  }

  async function findBurnKey(index: number, proverFee: bigint, broadcasterFee: bigint, revealAmount: bigint) {
    setIsGenerating(true)
    setError(null)

    try {
      if (!signer || !walletAddress) {
        throw new Error("Please connect your wallet first")
      }

      const receiverAddress = walletAddress
      const minZeros = 2

      const receiverAddressBytes = hexToBytes(receiverAddress)
      const proverFeeBytes = numberToBytes(proverFee, 32)
      const broadcasterFeeBytes = numberToBytes(broadcasterFee, 32)
      const revealAmountBytes = numberToBytes(revealAmount, 32)
      const eipBytes = new TextEncoder().encode("EIP-7503")

      const baseScalar = await getDeterministicStartingPoint()
      let burnKey = (baseScalar + BigInt(index) * BigInt(10) ** BigInt(18)) % FIELD_SIZE

      let iterations = 0
      const maxIterations = 100000000

      while (iterations < maxIterations) {
        if (burnKey >= FIELD_SIZE) {
          burnKey = BigInt(0)
        }

        const burnKeyBytes = numberToBytes(burnKey, 32)
        const combined = concatBytes(
          burnKeyBytes,
          receiverAddressBytes,
          proverFeeBytes,
          broadcasterFeeBytes,
          revealAmountBytes,
          eipBytes,
        )
        const hexString =
          "0x" +
          Array.from(combined)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")

        const hash = keccak256(hexString)

        if (hasMinZeroBytes(hash, minZeros)) {
          const derivedBurnAddress = deriveBurnAddress(
            burnKey,
            receiverAddress,
            proverFee,
            broadcasterFee,
            revealAmount,
          )

          const newResult = {
            index,
            burnKey: burnKey.toString(),
            burnAddress: derivedBurnAddress,
            proverFee: proverFee.toString(),
            broadcasterFee: broadcasterFee.toString(),
            revealAmount: revealAmount.toString(),
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

  const openGenerateDialog = () => {
    setGenerateDialogOpen(true)
    setNewBroadcasterFee("0")
    setNewProverFee("0")
    setNewBurnAmount("")
    setError(null)
  }

  const handleGenerate = () => {
    if (!newBurnAmount || Number.parseFloat(newBurnAmount) <= 0) {
      setError("Please enter a valid burn amount")
      return
    }

    const proverFee = parseEther(newProverFee || "0")
    const broadcasterFee = parseEther(newBroadcasterFee || "0")
    const revealAmount = parseEther(newBurnAmount)

    setGenerateDialogOpen(false)
    findBurnKey(currentCount, proverFee, broadcasterFee, revealAmount)
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
    setBurnAmount(isMint ? "" : formatEther(result?.revealAmount || "0"))
    setMintError(null)
    setProgressMessage(null)
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
    setMintError(null)
    setProgressMessage(null)

    const result = results.find((r) => r.burnAddress === selectedBurnAddress)
    const balance = result?.balance || "0"

    let network = "sepolia"
    try {
      if (signer?.provider) {
        const chainId = await signer.provider.getNetwork().then((n) => n.chainId)
        console.log("[v0] Chain ID:", chainId)
        if (chainId === 31337n || chainId === 1337n) {
          network = "anvil"
        }
      }
    } catch (error) {
      console.error("[v0] Error detecting network:", error)
    }

    const proofRequest = {
      amount: balance,
      fee: "0", // This should be the fee from the burn address, not the mint fee
      spend: balance,
      network: network,
      wallet_address: walletAddress,
      burn_key: selectedBurnKey,
    }

    const endpointToUse = useCustomEndpoint ? customEndpoint : selectedEndpoint
    console.log(`[v0] Generating proof with endpoint: ${endpointToUse}`)
    console.log("[v0] Generating proof with request:", JSON.stringify(proofRequest, null, 2))

    try {
      const response = await fetch(endpointToUse, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify(proofRequest),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const jobResponse = await response.json()
      console.log("[v0] Job response:", JSON.stringify(jobResponse, null, 2))

      if (jobResponse.result?.job_id) {
        const jobId = jobResponse.result.job_id
        const pollEndpoint = `${endpointToUse}/${jobId}`
        console.log(`[v0] Starting to poll: ${pollEndpoint}`)

        const pollForResult = async () => {
          try {
            const pollResponse = await fetch(pollEndpoint, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              mode: "cors",
            })

            if (pollResponse.ok) {
              const result = await pollResponse.json()
              console.log("[v0] Poll response:", JSON.stringify(result, null, 2))

              if (result.status === "error" || result.status === "failed") {
                const errorMessage = result.message || result.error || "Unknown error"
                console.error("[v0] Job failed:", errorMessage)
                setProgressMessage(errorMessage)
                setMintError(`Proof generation failed: ${errorMessage}`)
                setMintStage({ stage: "confirm" })
                return
              }

              if (result.status === "in_progress" || result.status === "pending") {
                console.log("[v0] Job in progress, continuing to poll...")
                if (result.message) {
                  setProgressMessage(result.message)
                }
                setTimeout(pollForResult, 5000)
                return
              }

              if (result.status === "completed") {
                console.log("[v0] Job completed, proof ready!")
                setMintStage({ stage: "submit", proof: result.result })
                setProgressMessage(null)
                return
              }

              console.log("[v0] Unknown status, continuing to poll...")
              setTimeout(pollForResult, 5000)
            } else {
              console.error("[v0] Poll request failed:", pollResponse.status)
              setTimeout(pollForResult, 5000)
            }
          } catch (error) {
            console.error("[v0] Polling error:", error)
            setTimeout(pollForResult, 5000)
          }
        }

        pollForResult()
      } else {
        console.error("[v0] No job_id received in response")
        setMintError("Invalid response from proof endpoint - no job_id received")
        setMintStage({ stage: "confirm" })
      }
    } catch (error) {
      console.error("[v0] Error calling proof endpoint:", error)
      setMintError(`Failed to request proof: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMintStage({ stage: "confirm" })
    }
  }

  const submitProof = async () => {
    setMintStage({ stage: "submitting" })
    setMintError(null)
    console.log("[v0] Submitting proof:", JSON.stringify(mintStage.proof, null, 2))

    if (!signer || !mintStage.proof) {
      setMintError("Missing signer or proof data")
      return
    }

    try {
      const proofData = mintStage.proof
      // Extract reveal amount, prover fee, and broadcaster fee from proofData
      const {
        proof,
        block_number,
        nullifier_u256,
        remaining_coin,
        wallet_address,
        reveal_amount,
        prover_fee,
        broadcaster_fee,
        prover
      } = proofData

      const _pA = [proof.proof.pi_a[0], proof.proof.pi_a[1]]
      const _pB = [
        [proof.proof.pi_b[0][1], proof.proof.pi_b[0][0]],
        [proof.proof.pi_b[1][1], proof.proof.pi_b[1][0]],
      ]
      const _pC = [proof.proof.pi_c[0], proof.proof.pi_c[1]]
      const _blockNumber = BigInt(block_number)
      const _nullifier = BigInt(nullifier_u256)
      const _remainingCoin = BigInt(remaining_coin)
      const _revealAmount = BigInt(reveal_amount)
      const _receiver = wallet_address
      const _proverFee = BigInt(prover_fee)
      const _broadcasterFee = BigInt(broadcaster_fee)
      const _prover = prover

      console.log("[v0] Calling mintCoin with parameters:", {
        _pA,
        _pB,
        _pC,
        _blockNumber: _blockNumber.toString(),
        _nullifier: _nullifier.toString(),
        _remainingCoin: _remainingCoin.toString(),
        _receiver,
        _revealAmount: _revealAmount.toString(),
        _proverFee: _proverFee.toString(),
        _broadcasterFee: _broadcasterFee.toString(),
      })

      const contractAddress = networkConfig.contracts.beth
      if (!contractAddress) {
        throw new Error("BETH contract address not configured for current network")
      }

      const mintCoinABI = [
        {
          name: "mintCoin",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "_pA", type: "uint256[2]" },
            { name: "_pB", type: "uint256[2][2]" },
            { name: "_pC", type: "uint256[2]" },
            { name: "_blockNumber", type: "uint256" },
            { name: "_nullifier", type: "uint256" },
            { name: "_remainingCoin", type: "uint256" },
            { name: "_broadcasterFee", type: "uint256" },
            { name: "_revealedAmount", type: "uint256" },
            { name: "_revealedAmountReceiver", type: "address" },
            { name: "_proverFee", type: "uint256" },
            { name: "_prover", type: "address" },
          ],
          outputs: [],
        },
      ]

      const contract = new ethers.Contract(contractAddress, mintCoinABI, signer)

      const tx = await contract.mintCoin(
        _pA,
        _pB,
        _pC,
        _blockNumber,
        _nullifier,
        _remainingCoin,
        _broadcasterFee,
        _revealAmount,
        _receiver,
        _proverFee,
        _prover,
      )

      console.log("[v0] mintCoin transaction sent:", tx.hash)

      await tx.wait()
      console.log("[v0] mintCoin transaction confirmed")

      setMintStage({ stage: "complete" })

      console.log("[v0] Proof submitted successfully, refreshing balances...")
      setTimeout(() => {
        refreshBalances()
      }, 1000)

      setTimeout(() => {
        setBurnDialogOpen(false)
        setMintStage({ stage: "confirm" })
      }, 2000)
    } catch (error) {
      console.error("[v0] Error submitting proof:", error)
      setMintError(`Failed to submit proof: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMintStage({ stage: "submit" })
    }
  }

  const refreshBalances = () => {
    results.forEach((result) => {
      fetchBalance(result.burnAddress, result.index)
    })
  }

  const filteredResults = showConsumedAddresses
    ? results
    : results.filter((result) => !result.isConsumed || !result.balance || Number.parseFloat(result.balance) === 0)

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
              <div className="flex items-center gap-4">
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showConsumed"
                    checked={showConsumedAddresses}
                    onChange={(e) => setShowConsumedAddresses(e.target.checked)}
                    className="rounded border-green-700 bg-green-950/60 text-green-600 focus:ring-green-600"
                  />
                  <Label htmlFor="showConsumed" className="text-white text-sm">
                    Show consumed burn-addresses
                  </Label>
                </div>
              </div>

              <Button
                onClick={openGenerateDialog}
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

            {filteredResults.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredResults.map((result) => (
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
                      disabled={result.balance && Number.parseFloat(result.balance) > 0 && result.isConsumed}
                      className={`ml-2 border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent ${
                        result.isConsumed ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {result.balance && Number.parseFloat(result.balance) > 0 ? (
                        <>
                          <Sprout className="h-3 w-3 mr-1 text-green-400" />
                          {result.isConsumed ? "Consumed" : "Mint"}
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
                {results.length === 0 ? (
                  <>
                    <p>No burn addresses generated yet.</p>
                    <p className="text-sm">Click "Generate Address" to create your first burn address.</p>
                  </>
                ) : (
                  <>
                    <p>No available burn addresses to show.</p>
                    <p className="text-sm">Check "Show consumed burn-addresses" to see all addresses.</p>
                  </>
                )}
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

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="bg-green-950/95 border-green-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-green-300">Generate Burn Address #{currentCount}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure the parameters for your new burn address. The reveal amount will be equal to the burn amount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="burnAmount" className="text-white">
                Burn Amount (ETH) *
              </Label>
              <Input
                id="burnAmount"
                type="number"
                placeholder="0.0"
                value={newBurnAmount}
                onChange={(e) => setNewBurnAmount(e.target.value)}
                min="0"
                step="0.001"
                className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">This will also be the reveal amount</p>
            </div>

            <div>
              <Label htmlFor="broadcasterFee" className="text-white">
                Broadcaster Fee (ETH)
              </Label>
              <Input
                id="broadcasterFee"
                type="number"
                placeholder="0.0"
                value={newBroadcasterFee}
                onChange={(e) => setNewBroadcasterFee(e.target.value)}
                min="0"
                step="0.001"
                className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
              />
            </div>

            <div>
              <Label htmlFor="proverFee" className="text-white">
                Prover Fee (ETH)
              </Label>
              <Input
                id="proverFee"
                type="number"
                placeholder="0.0"
                value={newProverFee}
                onChange={(e) => setNewProverFee(e.target.value)}
                min="0"
                step="0.001"
                className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
              />
            </div>

            {error && (
              <Alert className="bg-red-900/30 border-red-700">
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!newBurnAmount || Number.parseFloat(newBurnAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
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
                    </>
                  )}
                  {mintStage.stage === "generate" && (progressMessage || "Generating cryptographic proof...")}
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
              <Alert className="bg-yellow-900/30 border-yellow-600">
                <AlertDescription className="text-yellow-200">
                  <strong>Privacy Notice:</strong> If you want to use the privacy aspects of this protocol, it's
                  mandatory to broadcast the proof submission transaction through a different wallet. If you just want
                  to get BETH for WORM mining, using the same wallet is okay.
                </AlertDescription>
              </Alert>

              {mintError && (
                <Alert className="bg-red-900/30 border-red-700">
                  <AlertDescription className="text-red-300">{mintError}</AlertDescription>
                </Alert>
              )}

              {mintStage.stage === "generate" && progressMessage && (
                <div
                  className={`p-4 border-2 rounded-lg shadow-lg ${
                    mintError
                      ? "bg-gradient-to-r from-red-900/40 to-red-800/40 border-red-500/50"
                      : "bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-500/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {mintError ? (
                        <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-1 ${mintError ? "text-red-200" : "text-blue-200"}`}>
                        {mintError ? "Proof Generation Error" : "Proof Generation Status"}
                      </p>
                      <p className="text-white font-semibold">{progressMessage}</p>
                    </div>
                  </div>
                </div>
              )}

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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="endpoint" className="text-white">
                      Proving Endpoint
                    </Label>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="useCustomEndpoint"
                        checked={useCustomEndpoint}
                        onChange={(e) => setUseCustomEndpoint(e.target.checked)}
                        className="rounded border-green-700 bg-green-950/60 text-green-600 focus:ring-green-600"
                      />
                      <Label htmlFor="useCustomEndpoint" className="text-white text-sm">
                        Use custom endpoint
                      </Label>
                    </div>

                    {useCustomEndpoint ? (
                      <Input
                        type="url"
                        placeholder="https://your-custom-endpoint.com/prove"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                        className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400"
                      />
                    ) : (
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
                    )}
                  </div>
                </div>
              )}

              {mintStage.stage === "submit" && (
                <div className="p-3 bg-green-950/40 border border-green-800 rounded text-xs">
                  <strong className="text-white">Proof Generated!</strong>
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
                {mintStage.stage === "submitting" && (
                  <Button disabled className="flex-1 bg-gray-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting proof...
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
                  value={burnAmount}
                  readOnly
                  className="bg-green-950/60 border-green-700 text-white placeholder:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">This is the predetermined burn amount for this address</p>
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
                  disabled={!burnAmount || Number.parseFloat(burnAmount) <= 0 || isBurning}
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
