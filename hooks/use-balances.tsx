"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "./use-wallet"
import { useNetwork } from "./use-network"

interface BalanceData {
  bethBalance: string
  wormBalance: string
  loading: boolean
  error: string | null
}

export function useBalances(): BalanceData {
  const { isConnected, address, provider } = useWallet()
  const { networkConfig } = useNetwork()
  const [bethBalance, setBethBalance] = useState<string>("0.0000")
  const [wormBalance, setWormBalance] = useState<string>("0.0000")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const ERC20_ABI = [
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "approve",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "owner", type: "address" },
        { internalType: "address", name: "spender", type: "address" },
      ],
      name: "allowance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
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

  const fetchBalances = async () => {
    if (!isConnected || !address || !provider) {
      setBethBalance("0.0000")
      setWormBalance("0.0000")
      return
    }

    if (abortController) {
      abortController.abort()
    }

    const newAbortController = new AbortController()
    setAbortController(newAbortController)

    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Fetching balances for address:", address)
      console.log("[v0] Using BETH contract:", networkConfig.contracts.beth)
      console.log("[v0] Using WORM contract:", networkConfig.contracts.worm)

      const bethContract = new ethers.Contract(networkConfig.contracts.beth, ERC20_ABI, provider)
      const wormContract = new ethers.Contract(networkConfig.contracts.worm, ERC20_ABI, provider)

      // Check if contracts exist by checking if they have code
      const [bethCode, wormCode] = await Promise.all([
        provider.getCode(networkConfig.contracts.beth),
        provider.getCode(networkConfig.contracts.worm),
      ])

      if (bethCode === "0x") {
        console.warn("[v0] BETH contract not found at address:", networkConfig.contracts.beth)
        setBethBalance("0.0000")
      }

      if (wormCode === "0x") {
        console.warn("[v0] WORM contract not found at address:", networkConfig.contracts.worm)
        setWormBalance("0.0000")
      }

      // Only fetch balances for contracts that exist
      const balancePromises: Promise<bigint>[] = []
      const contractTypes: string[] = []

      if (bethCode !== "0x") {
        balancePromises.push(bethContract.balanceOf(address))
        contractTypes.push("beth")
      }

      if (wormCode !== "0x") {
        balancePromises.push(wormContract.balanceOf(address))
        contractTypes.push("worm")
      }

      if (balancePromises.length === 0) {
        console.warn("[v0] No valid contracts found on this network")
        setBethBalance("0.0000")
        setWormBalance("0.0000")
        return
      }

      const fetchPromise = Promise.all(balancePromises)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      })

      const abortPromise = new Promise((_, reject) => {
        newAbortController.signal.addEventListener("abort", () => {
          reject(new Error("Request cancelled"))
        })
      })

      const balanceResults = (await Promise.race([fetchPromise, timeoutPromise, abortPromise])) as bigint[]

      if (newAbortController.signal.aborted) {
        return
      }

      // Map results back to the correct balances
      let bethBalanceRaw = BigInt(0)
      let wormBalanceRaw = BigInt(0)

      let resultIndex = 0
      if (contractTypes.includes("beth")) {
        bethBalanceRaw = balanceResults[resultIndex]
        resultIndex++
      }
      if (contractTypes.includes("worm")) {
        wormBalanceRaw = balanceResults[resultIndex]
      }

      const bethBalanceFormatted = ethers.formatEther(bethBalanceRaw)
      const wormBalanceFormatted = ethers.formatEther(wormBalanceRaw)

      setBethBalance(Number.parseFloat(bethBalanceFormatted).toFixed(4))
      setWormBalance(Number.parseFloat(wormBalanceFormatted).toFixed(4))

      console.log("[v0] Balances fetched - BETH:", bethBalanceFormatted, "WORM:", wormBalanceFormatted)
    } catch (err: any) {
      if (err.message?.includes("network changed") || err.code === "NETWORK_ERROR") {
        console.log("[v0] Network change detected during balance fetch, will retry")
        setBethBalance("0.0000")
        setWormBalance("0.0000")
      } else if (err.message === "Request cancelled" || err.message === "Request timeout") {
        console.log("[v0] Balance fetch cancelled or timed out")
      } else if (err.code === "BAD_DATA" || err.message?.includes("could not decode result data")) {
        console.warn("[v0] Contract call failed - contracts may not exist on this network:", err.message)
        setBethBalance("0.0000")
        setWormBalance("0.0000")
      } else {
        console.error("[v0] Error fetching balances:", err)
        setError(err.message || "Failed to fetch balances")
        setBethBalance("0.0000")
        setWormBalance("0.0000")
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [isConnected, address, provider, networkConfig])

  useEffect(() => {
    if (isConnected && address) {
      const interval = setInterval(fetchBalances, 30000)
      return () => clearInterval(interval)
    }
  }, [isConnected, address])

  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [])

  return {
    bethBalance,
    wormBalance,
    loading,
    error,
  }
}
