"use client"

import { useState, useEffect } from "react"
import { useNetwork } from "./use-network"

export function useCurrentEpoch() {
  const [currentEpoch, setCurrentEpoch] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { networkConfig } = useNetwork()

  const fetchCurrentEpoch = async () => {
    try {
      setLoading(true)
      setError(null)

      const rpcUrl = networkConfig.rpcUrls[0]
      console.log("[v0] Fetching current epoch from:", rpcUrl)
      console.log("[v0] Using WORM contract:", networkConfig.contracts.worm)

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: networkConfig.contracts.worm,
              data: "0x76671808", // currentEpoch() function selector
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

      const epoch = Number.parseInt(result.result, 16)
      setCurrentEpoch(epoch)
      console.log("[v0] Current epoch:", epoch)
    } catch (err) {
      console.error("[v0] Error fetching current epoch:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch current epoch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentEpoch()

    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentEpoch, 30000)
    return () => clearInterval(interval)
  }, [networkConfig])

  return { currentEpoch, loading, error, refetch: fetchCurrentEpoch }
}
