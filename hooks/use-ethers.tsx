"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"

export function useEthers() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const handleAccountsChanged = useCallback(
    async (accounts: string[]) => {
      if (accounts.length > 0) {
        if (provider) {
          try {
            const signer = await provider.getSigner()
            setSigner(signer)
            setAddress(accounts[0])
            setIsConnected(true)
          } catch (error) {
            console.error("Failed to get signer:", error)
          }
        }
      } else {
        setAddress(null)
        setSigner(null)
        setIsConnected(false)
      }
    },
    [provider],
  )

  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        setProvider(provider)

        try {
          const accounts = await provider.listAccounts()
          if (accounts.length > 0) {
            const signer = await provider.getSigner()
            setSigner(signer)
            setAddress(await signer.getAddress())
            setIsConnected(true)
          }
        } catch (error) {
          console.error("Failed to get accounts:", error)
        }
      }
    }

    initProvider()
  }, []) // Keep empty dependency array for initialization

  useEffect(() => {
    if (window.ethereum && handleAccountsChanged) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)

      return () => {
        window.ethereum.removeAllListeners("accountsChanged")
      }
    }
  }, [handleAccountsChanged])

  const connect = async () => {
    if (!provider) return

    try {
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      setSigner(signer)
      setAddress(await signer.getAddress())
      setIsConnected(true)
    } catch (error) {
      console.error("Failed to connect:", error)
    }
  }

  return {
    provider,
    signer,
    address,
    isConnected,
    connect,
  }
}

export function useContract(contractAddress: string, abi: any[]) {
  const { provider, signer } = useEthers()
  const [contract, setContract] = useState<ethers.Contract | null>(null)

  useEffect(() => {
    if (provider && contractAddress && abi) {
      const contract = new ethers.Contract(contractAddress, abi, signer || provider)
      setContract(contract)
    }
  }, [provider, signer, contractAddress]) // Removed abi from dependencies to prevent recreation

  const readContract = async (functionName: string, args: any[] = []) => {
    if (!contract) return null

    try {
      const result = await contract[functionName](...args)
      return result
    } catch (error: any) {
      if (error?.code === "NETWORK_ERROR" && error?.message?.includes("network changed")) {
        console.log(`[v0] Network changed during ${functionName} call, ignoring error`)
        return null
      }
      console.error(`Error calling ${functionName}:`, error)
      return null
    }
  }

  const writeContract = async (functionName: string, args: any[] = []) => {
    if (!contract || !signer) return null

    try {
      console.log(`[v0] Attempting ${functionName} with args:`, args)

      const network = await signer.provider.getNetwork()
      const isLocalNetwork = network.chainId === 31337n || network.chainId === 1337n

      let gasLimit: bigint
      try {
        const estimatedGas = await contract[functionName].estimateGas(...args)
        console.log(`[v0] Estimated gas for ${functionName}:`, estimatedGas.toString())

        if (isLocalNetwork) {
          // For local networks, add 50% buffer to handle Anvil quirks
          gasLimit = (estimatedGas * 150n) / 100n
        } else {
          // For live networks, add 20% buffer
          gasLimit = (estimatedGas * 120n) / 100n
        }
        console.log(`[v0] Using gas limit for ${functionName}:`, gasLimit.toString())
      } catch (gasEstimationError) {
        console.warn(`[v0] Gas estimation failed for ${functionName}:`, gasEstimationError)
        // Fallback to higher fixed limits if estimation fails
        gasLimit = isLocalNetwork ? 500000n : 300000n
        console.log(`[v0] Using fallback gas limit for ${functionName}:`, gasLimit.toString())
      }

      const tx = await contract[functionName](...args, {
        gasLimit,
      })
      console.log(`[v0] ${functionName} transaction sent:`, tx.hash)
      return tx
    } catch (error: any) {
      console.error(`[v0] Error calling ${functionName}:`, error)

      if (error?.code === -32603 || error?.message?.includes("Internal JSON-RPC error")) {
        console.log(`[v0] RPC error calling ${functionName}, trying alternative approach`)
        try {
          const tx = await contract[functionName](...args, {
            gasLimit: 800000n, // Very high gas limit for problematic transactions
            type: 0, // Legacy transaction type for better Anvil compatibility
          })
          console.log(`[v0] Alternative approach succeeded:`, tx.hash)
          return tx
        } catch (retryError) {
          console.error(`[v0] Alternative approach also failed for ${functionName}:`, retryError)

          try {
            console.log(`[v0] Trying ${functionName} with no gas options as final fallback`)
            const tx = await contract[functionName](...args)
            console.log(`[v0] No-gas-options approach succeeded:`, tx.hash)
            return tx
          } catch (finalError) {
            console.error(`[v0] All approaches failed for ${functionName}:`, finalError)
            throw finalError
          }
        }
      }
      throw error
    }
  }

  return {
    contract,
    readContract,
    writeContract,
  }
}
