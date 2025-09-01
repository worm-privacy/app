"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, TrendingUp, Clock, Activity, Coins } from "lucide-react"

interface EpochData {
  epoch: number
  total: string
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
}

export function BurnActivity() {
  const [epochData, setEpochData] = useState<EpochData[]>([])
  const [currentEpoch, setCurrentEpoch] = useState<number>(0)
  const [totalSupply, setTotalSupply] = useState<string>("0.0000")
  const [totalWormMinted, setTotalWormMinted] = useState<string>("0.0000")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const WORM_CONTRACT_ADDRESS = "0x78eFE1D19d5F5e9AED2C1219401b00f74166A1d9"
  const BETH_CONTRACT_ADDRESS = "0x1b218670EcaDA5B15e2cE1879074e5D903b55334"
  const SEPOLIA_RPC = "https://sepolia.drpc.org"

  // ABI for the functions we need
  const WORM_CONTRACT_ABI = [
    {
      inputs: [],
      name: "currentEpoch",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "epochTotal",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ]

  const BETH_CONTRACT_ABI = [
    {
      inputs: [],
      name: "totalSupply",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ]

  // Simple ABI encoder for function calls
  const encodeFunctionCall = (abi: any[], functionName: string, params: any[] = []) => {
    const func = abi.find((f) => f.name === functionName && f.type === "function")
    if (!func) throw new Error(`Function ${functionName} not found in ABI`)

    // Simple function selector calculation (first 4 bytes of keccak256 hash)
    const signature = `${functionName}(${func.inputs.map((input: any) => input.type).join(",")})`
    const selector = keccak256(signature).slice(0, 10) // 0x + 8 hex chars

    // Encode parameters
    let encodedParams = ""
    if (params.length > 0) {
      // For uint256 parameters, pad to 32 bytes
      encodedParams = params
        .map((param) => {
          if (typeof param === "number" || typeof param === "bigint") {
            return param.toString(16).padStart(64, "0")
          }
          return param.toString().padStart(64, "0")
        })
        .join("")
    }

    return selector + encodedParams
  }

  // Simple keccak256 implementation (for function selectors)
  const keccak256 = (input: string) => {
    // This is a simplified version - in production, use a proper crypto library
    // For now, we'll use the known function selectors
    const knownSelectors: { [key: string]: string } = {
      "currentEpoch()": "0x76671808",
      "epochTotal(uint256)": "0x1e0e8489",
      "totalSupply()": "0x18160ddd",
    }
    return knownSelectors[input] || "0x00000000"
  }

  const fetchContractData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Create a JSON-RPC call using ABI
      const callContract = async (contractAddress: string, abi: any[], functionName: string, params: any[] = []) => {
        const data = encodeFunctionCall(abi, functionName, params)

        const response = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: contractAddress,
                data: data,
              },
              "latest",
            ],
            id: 1,
          }),
        })

        const result = await response.json()
        if (result.error) {
          throw new Error(result.error.message)
        }
        return result.result
      }

      // Get total supply from BETH contract
      const totalSupplyData = await callContract(BETH_CONTRACT_ADDRESS, BETH_CONTRACT_ABI, "totalSupply")
      const supply = Number.parseInt(totalSupplyData, 16)
      setTotalSupply((supply / 1e18).toFixed(4)) // Convert from wei to ETH

      // Get total WORM minted from WORM contract
      const wormSupplyData = await callContract(WORM_CONTRACT_ADDRESS, WORM_CONTRACT_ABI, "totalSupply")
      const wormSupply = Number.parseInt(wormSupplyData, 16)
      setTotalWormMinted((wormSupply / 1e18).toFixed(4)) // Convert from wei to WORM

      // Get current epoch from WORM contract
      const currentEpochData = await callContract(WORM_CONTRACT_ADDRESS, WORM_CONTRACT_ABI, "currentEpoch")
      const current = Number.parseInt(currentEpochData, 16)
      setCurrentEpoch(current)

      // Fetch data for 5 past, current, and 5 future epochs from WORM contract
      const epochs: EpochData[] = []

      for (let i = -5; i <= 5; i++) {
        const epoch = current + i
        if (epoch >= 0) {
          try {
            const totalData = await callContract(WORM_CONTRACT_ADDRESS, WORM_CONTRACT_ABI, "epochTotal", [epoch])
            const total = Number.parseInt(totalData, 16)

            epochs.push({
              epoch,
              total: (total / 1e18).toFixed(4), // Convert from wei to ETH
              isCurrent: i === 0,
              isPast: i < 0,
              isFuture: i > 0,
            })
          } catch (err) {
            // If epoch doesn't exist yet, show 0
            epochs.push({
              epoch,
              total: "0.0000",
              isCurrent: i === 0,
              isPast: i < 0,
              isFuture: i > 0,
            })
          }
        }
      }

      setEpochData(epochs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContractData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchContractData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-20 bg-green-950/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Live Burn Activity</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Real-time ETH burn data from Sepolia testnet showing past, current, and projected future epochs
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Current Epoch</CardTitle>
              <Clock className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300 font-mono">{loading ? "..." : currentEpoch}</div>
              <p className="text-xs text-gray-400 mt-1">Active burn period</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Total ETH Burned</CardTitle>
              <Flame className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300 font-mono">{loading ? "..." : totalSupply}</div>
              <p className="text-xs text-gray-400 mt-1">BETH total supply</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Total WORM Minted</CardTitle>
              <Coins className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300 font-mono">{loading ? "..." : totalWormMinted}</div>
              <p className="text-xs text-gray-400 mt-1">WORM total supply</p>
            </CardContent>
          </Card>

          <Card className="bg-green-950/40 border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Network</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300 font-mono">Sepolia</div>
              <p className="text-xs text-gray-400 mt-1">Ethereum testnet</p>
            </CardContent>
          </Card>
        </div>

        {/* Epoch Timeline */}
        <Card className="bg-green-950/40 border-green-800">
          <CardHeader>
            <CardTitle className="text-xl text-green-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Epoch Burn Timeline
            </CardTitle>
            <p className="text-sm text-gray-400">ETH consumption across past, current, and future epochs</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <span className="ml-3 text-gray-400">Loading burn data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error loading data: {error}</p>
                <button
                  onClick={fetchContractData}
                  className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline Header */}
                <div className="grid grid-cols-11 gap-2 text-xs text-gray-400 font-mono">
                  <div className="col-span-5 text-center">Past Epochs</div>
                  <div className="text-center">Current</div>
                  <div className="col-span-5 text-center">Future Epochs</div>
                </div>

                {/* Timeline Bars */}
                <div className="grid grid-cols-11 gap-2">
                  {epochData.map((epoch, index) => {
                    const maxTotal = Math.max(...epochData.map((e) => Number.parseFloat(e.total)))
                    const height = maxTotal > 0 ? (Number.parseFloat(epoch.total) / maxTotal) * 100 : 0

                    return (
                      <div key={epoch.epoch} className="flex flex-col items-center">
                        <div className="w-full h-32 bg-gray-800 rounded relative overflow-hidden">
                          <div
                            className={`absolute bottom-0 w-full transition-all duration-500 ${
                              epoch.isCurrent
                                ? "bg-gradient-to-t from-yellow-500 to-yellow-300"
                                : epoch.isPast
                                  ? "bg-gradient-to-t from-green-600 to-green-400"
                                  : "bg-gradient-to-t from-gray-600 to-gray-500"
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          {epoch.isCurrent && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />}
                        </div>

                        <div className="mt-2 text-center">
                          <div className={`text-xs font-mono ${epoch.isCurrent ? "text-yellow-300" : "text-gray-400"}`}>
                            {epoch.epoch}
                          </div>
                          <div
                            className={`text-xs font-mono ${epoch.isCurrent ? "text-yellow-300" : "text-green-300"}`}
                          >
                            {epoch.total}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 pt-4 border-t border-green-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-green-600 to-green-400 rounded"></div>
                    <span className="text-xs text-gray-400">Past Epochs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded"></div>
                    <span className="text-xs text-gray-400">Current Epoch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-gray-600 to-gray-500 rounded"></div>
                    <span className="text-xs text-gray-400">Future Epochs</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Info */}
        <div className="mt-8 text-center space-y-2">
          <div className="m-4 inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-sm">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">WORM Contract:</span>
            <a
              href={`https://sepolia.etherscan.io/address/${WORM_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-300 font-mono text-xs hover:text-green-200 hover:underline transition-colors cursor-pointer"
            >
              {WORM_CONTRACT_ADDRESS}
            </a>
          </div>
          <div className="m-4 inline-flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-sm">
            <Flame className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300">BETH Contract:</span>
            <a
              href={`https://sepolia.etherscan.io/address/${BETH_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 font-mono text-xs hover:text-yellow-200 hover:underline transition-colors cursor-pointer"
            >
              {BETH_CONTRACT_ADDRESS}
            </a>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Updates every 30 seconds • Click addresses to view on Etherscan
          </div>
        </div>
      </div>
    </section>
  )
}
