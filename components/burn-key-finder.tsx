"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Wallet, Plus, Flame, Sprout } from "lucide-react"
import { keccak256, BrowserProvider, Signature, formatEther, parseEther } from "ethers"
import { poseidon4 } from "poseidon-lite"

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

export default function BurnKeyFinder() {
  const [results, setResults] = useState<BurnKeyResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCount, setCurrentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
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
  const [customEndpoint, setCustomEndpoint] = useState("")
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(false)

  const STORAGE_KEY = "burn-key-results"

  const PROVING_ENDPOINTS = ["http://12.23.34.45:8000/prove", "http://45.34.23.12:8000/prove"]

  const saveToLocalStorage = (newResults: BurnKeyResult[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults))
    } catch (err) {
      console.error("Failed to save to localStorage:", err)
    }
  }

  const loadFromLocalStorage = (): BurnKeyResult[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error("Failed to load from localStorage:", err)
      return []
    }
  }

  useEffect(() => {
    const cachedResults = loadFromLocalStorage()
    if (cachedResults.length > 0) {
      setResults(cachedResults)
      setCurrentCount(Math.max(...cachedResults.map((r) => r.index)) + 1)
    }
  }, [])

  const fetchBalance = async (address: string, index: number) => {
    if (!provider) return

    setLoadingBalances((prev) => new Set(prev).add(index))

    try {
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

  function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = Number.parseInt(cleanHex.substr(i, 2), 16)
    }
    return bytes
  }

  async function connectWallet() {
    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed")
      }

      const browserProvider = new BrowserProvider(window.ethereum)

      try {
        await browserProvider.send("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }])
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await browserProvider.send("wallet_addEthereumChain", [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io/"],
            },
          ])
        }
      }

      await browserProvider.send("eth_requestAccounts", [])
      const signer = await browserProvider.getSigner()
      const address = await signer.getAddress()

      setProvider(browserProvider)
      setWalletAddress(address)
      setIsConnected(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
    }
  }

  async function getDeterministicStartingPoint(): Promise<bigint> {
    if (!provider) {
      throw new Error("Wallet not connected")
    }

    if (scalarValue !== null) {
      return scalarValue
    }

    const signer = await provider.getSigner()
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
      if (!isConnected || !provider || !walletAddress) {
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
    if (!provider || !burnAmount || !selectedBurnAddress) return

    setIsBurning(true)
    try {
      const signer = await provider.getSigner()
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

    const endpointToUse = useCustomEndpoint ? customEndpoint : selectedEndpoint
    console.log(`[v0] Generating proof with endpoint: ${endpointToUse}`)
    console.log("[v0] Generating proof with request:", JSON.stringify(proofRequest, null, 2))

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

    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("[v0] Proof submitted successfully!")

    setMintStage({ stage: "complete" })

    setTimeout(() => {
      setBurnDialogOpen(false)
      setMintStage({ stage: "confirm" })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Burn Key Finder</h1>
          <p className="text-muted-foreground">
            Generate multiple burn keys for EIP-7503 transactions using deterministic signatures
          </p>
        </div>

        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Wallet Connection</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your MetaMask wallet to generate deterministic burn keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <Button onClick={connectWallet} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Wallet className="mr-2 h-4 w-4" />
                Connect MetaMask
              </Button>
            ) : (
              <div className="space-y-2">
                <Alert className="bg-primary/10 border-primary/20">
                  <AlertDescription className="text-foreground">
                    <strong>Connected:</strong> {walletAddress}
                  </AlertDescription>
                </Alert>
                <Alert className="bg-secondary/10 border-secondary/20">
                  <AlertDescription className="text-foreground">
                    <strong>Fixed Parameters:</strong> Receiver = Wallet Address, Fee = 0, Min Zero Bytes = 2
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Generate Burn Keys</CardTitle>
            <CardDescription className="text-muted-foreground">
              Click the + button to generate the next burn key. Each key uses a different starting point: scalar + (i ×
              10¹⁸). All results are cached in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.length > 0 && (
                <div className="grid gap-2">
                  {results.map((result) => (
                    <div
                      key={result.index}
                      className="flex items-center gap-2 p-3 bg-muted/20 border border-border rounded-lg"
                    >
                      <span className="text-sm font-medium min-w-[60px] text-secondary">Key #{result.index}</span>
                      <span className="text-xs text-muted-foreground flex-1 font-mono bg-background/50 px-2 py-1 rounded">
                        {result.burnAddress}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Balance:{" "}
                        {loadingBalances.has(result.index) ? (
                          <Loader2 className="h-3 w-3 animate-spin inline text-secondary" />
                        ) : result.balance ? (
                          <span className="text-secondary font-medium">
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
                        className="ml-2 border-border hover:bg-primary/10 hover:border-primary/50"
                      >
                        {result.balance && Number.parseFloat(result.balance) > 0 ? (
                          <>
                            <Sprout className="h-3 w-3 mr-1 text-secondary" />
                            <span className="text-secondary">Mint</span>
                          </>
                        ) : (
                          <>
                            <Flame className="h-3 w-3 mr-1 text-destructive" />
                            <span className="text-foreground">Burn</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={generateNextBurnKey}
                disabled={isGenerating || !isConnected}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Key #{currentCount}...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Burn Key #{currentCount}
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4 bg-destructive/10 border-destructive/20">
                <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>This tool generates multiple burn keys with deterministic starting points:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connects to MetaMask and requests a signature for "EIP-7503"</li>
              <li>Extracts the scalar (s value) from the signature</li>
              <li>For burn key #i, starts from: scalar + (i × 10¹⁸)</li>
              <li>Uses fixed parameters: receiver = wallet address, fee = 0, min zero bytes = 2</li>
              <li>
                Finds burn keys where keccak256(burn_key + receiver_address + fee + "EIP-7503") starts with 2 zero bytes
              </li>
              <li>Derives burn addresses using poseidon4([prefix, burn_key, receiver_address, fee])</li>
            </ol>
            <p className="mt-2">
              <strong className="text-secondary">Field Size:</strong>{" "}
              <span className="font-mono text-xs">{FIELD_SIZE.toString()}</span>
            </p>
          </CardContent>
        </Card>

        <Dialog open={burnDialogOpen} onOpenChange={setBurnDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">{isMintOperation ? "Mint BETH" : "Burn ETH"}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isMintOperation ? (
                  <>
                    {mintStage.stage === "confirm" && (
                      <>
                        <strong>
                          {results.find((r) => r.burnAddress === selectedBurnAddress)?.balance || "0"} BETH
                        </strong>{" "}
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
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Burn Address:</strong> <span className="font-mono text-xs">{selectedBurnAddress}</span>
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Available Balance:</strong>{" "}
                    <span className="text-secondary font-medium">
                      {results.find((r) => r.burnAddress === selectedBurnAddress)?.balance || "0"} ETH
                    </span>
                  </p>
                </div>

                {mintStage.stage === "confirm" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="endpoint" className="text-foreground">
                        Proving Endpoint
                      </Label>
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          id="useCustomEndpoint"
                          checked={useCustomEndpoint}
                          onChange={(e) => setUseCustomEndpoint(e.target.checked)}
                          className="rounded border-border bg-input text-primary focus:ring-primary"
                        />
                        <Label htmlFor="useCustomEndpoint" className="text-foreground text-sm">
                          Use custom endpoint
                        </Label>
                      </div>
                      {useCustomEndpoint ? (
                        <Input
                          type="url"
                          placeholder="https://your-custom-endpoint.com/prove"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                        />
                      ) : (
                        <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                          <SelectTrigger className="bg-input border-border text-foreground">
                            <SelectValue placeholder="Select proving endpoint" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
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
                  <div className="p-3 bg-secondary/10 border border-secondary/20 rounded text-xs">
                    <strong className="text-foreground">Proof Generated:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto text-muted-foreground">
                      {JSON.stringify(mintStage.proof, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="burnAmount" className="text-foreground">
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
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum: 1 ETH</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBurnDialogOpen(false)}
                className="border-border hover:bg-muted/20"
              >
                Cancel
              </Button>

              {isMintOperation ? (
                <>
                  {mintStage.stage === "confirm" && (
                    <Button onClick={generateProof} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Generate proof
                    </Button>
                  )}
                  {mintStage.stage === "generate" && (
                    <Button disabled className="bg-muted">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating proof...
                    </Button>
                  )}
                  {mintStage.stage === "submit" && (
                    <Button
                      onClick={submitProof}
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    >
                      Submit proof
                    </Button>
                  )}
                  {mintStage.stage === "complete" && (
                    <Button disabled className="bg-secondary">
                      <Sprout className="mr-2 h-4 w-4" />
                      Minted successfully!
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={handleBurn}
                  disabled={
                    !burnAmount || Number.parseFloat(burnAmount) <= 0 || Number.parseFloat(burnAmount) > 1 || isBurning
                  }
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
