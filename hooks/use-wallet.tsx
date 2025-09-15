"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import { useNetwork } from "@/hooks/use-network"

interface WalletContextType {
  isConnected: boolean
  address: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  error: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { networkConfig, isNetworkSupported, getNetworkByChainId } = useNetwork()

  const connectWallet = async () => {
    try {
      setError(null)

      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.")
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" })

      // Create provider and signer
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const walletSigner = await browserProvider.getSigner()
      const walletAddress = await walletSigner.getAddress()

      // Check if we're on the correct network
      const network = await browserProvider.getNetwork()
      const chainIdHex = `0x${network.chainId.toString(16)}`

      if (chainIdHex !== networkConfig.chainId) {
        try {
          // Try to switch to the selected network
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: networkConfig.chainId }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Chain not added, add it (only for non-local networks)
            if (networkConfig.chainName !== "Anvil Local") {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: networkConfig.chainId,
                    chainName: networkConfig.chainName,
                    nativeCurrency: networkConfig.nativeCurrency,
                    rpcUrls: networkConfig.rpcUrls,
                    blockExplorerUrls: networkConfig.blockExplorerUrls,
                  },
                ],
              })
            } else {
              throw new Error("Please start your local Anvil node and add the network manually")
            }
          } else {
            throw switchError
          }
        }
      }

      setProvider(browserProvider)
      setSigner(walletSigner)
      setAddress(walletAddress)
      setIsConnected(true)

      console.log("[v0] Wallet connected:", walletAddress)
    } catch (err: any) {
      console.error("[v0] Wallet connection error:", err)
      setError(err.message || "Failed to connect wallet")
      setIsConnected(false)
      setAddress(null)
      setProvider(null)
      setSigner(null)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress(null)
    setProvider(null)
    setSigner(null)
    setError(null)
    console.log("[v0] Wallet disconnected")
  }

  const updateProvider = async () => {
    if (typeof window.ethereum !== "undefined" && isConnected) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum)
        const walletSigner = await browserProvider.getSigner()
        setProvider(browserProvider)
        setSigner(walletSigner)
        console.log("[v0] Provider updated for network change")
      } catch (err) {
        console.error("[v0] Error updating provider:", err)
      }
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== address) {
          // Account changed, reconnect
          connectWallet()
        }
      }

      const handleChainChanged = async (chainId: string) => {
        console.log("[v0] Network changed to:", chainId)
        const detectedNetwork = getNetworkByChainId(chainId)
        if (detectedNetwork) {
          // Update provider instead of reloading
          await updateProvider()
        } else {
          setError("Unsupported network. Please switch to Sepolia or Anvil.")
          disconnectWallet()
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [address, getNetworkByChainId, isConnected])

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            await connectWallet()
          }
        } catch (err) {
          console.error("[v0] Error checking wallet connection:", err)
        }
      }
    }

    checkConnection()
  }, [networkConfig]) // Reconnect when network config changes

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
