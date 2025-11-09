"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type NetworkType = "sepolia" | "anvil"

interface NetworkConfig {
  chainId: string
  chainName: string
  rpcUrls: string[]
  blockExplorerUrls: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  contracts: {
    beth: string
    worm: string
  }
}

const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  sepolia: {
    chainId: "0xaa36a7", // 11155111 in hex
    chainName: "Sepolia Testnet",
    rpcUrls: ["https://sepolia.drpc.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    contracts: {
      beth: "0xEc71903c94fe79634164c0ad1ba67be41f37e804",
      worm: "0xF25453f75ff520f9cE922E689B1cCE65DE3dC646",
    },
  },
  anvil: {
    chainId: "0x7a69", // 31337 in hex (Anvil default)
    chainName: "Anvil Local",
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: [],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    contracts: {
      beth: "0xCfEB869F69431e42cdB54A4F4f105C19C080A601",
      worm: "0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B",
    },
  },
}

interface NetworkContextType {
  selectedNetwork: NetworkType
  networkConfig: NetworkConfig
  switchNetwork: (network: NetworkType) => Promise<void>
  isNetworkSupported: (chainId: string) => boolean
  getNetworkByChainId: (chainId: string) => NetworkType | null
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("sepolia")
  const [isInitialized, setIsInitialized] = useState(false)

  const networkConfig = NETWORK_CONFIGS[selectedNetwork]

  const switchNetwork = async (network: NetworkType) => {
    try {
      const config = NETWORK_CONFIGS[network]

      if (typeof window.ethereum !== "undefined") {
        try {
          // Try to switch to the network
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: config.chainId }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, add it (only for non-local networks)
            if (network !== "anvil") {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: config.chainId,
                    chainName: config.chainName,
                    nativeCurrency: config.nativeCurrency,
                    rpcUrls: config.rpcUrls,
                    blockExplorerUrls: config.blockExplorerUrls,
                  },
                ],
              })
            } else {
              throw new Error("Please add Anvil network manually or start your local Anvil node")
            }
          } else {
            throw switchError
          }
        }
      }

      setSelectedNetwork(network)
      console.log(`[v0] Switched to ${network} network`)
    } catch (error: any) {
      console.error(`[v0] Failed to switch to ${network}:`, error)
      throw error
    }
  }

  const isNetworkSupported = (chainId: string): boolean => {
    return Object.values(NETWORK_CONFIGS).some((config) => config.chainId === chainId)
  }

  const getNetworkByChainId = (chainId: string): NetworkType | null => {
    for (const [network, config] of Object.entries(NETWORK_CONFIGS)) {
      if (config.chainId === chainId) {
        return network as NetworkType
      }
    }
    return null
  }

  useEffect(() => {
    const detectNetwork = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          console.log("[v0] Detected wallet network:", chainId)
          const detectedNetwork = getNetworkByChainId(chainId)
          if (detectedNetwork) {
            console.log("[v0] Setting network to detected:", detectedNetwork)
            setSelectedNetwork(detectedNetwork)
          } else {
            console.log("[v0] Unknown network detected, keeping default:", selectedNetwork)
          }
        } catch (error) {
          console.error("[v0] Error detecting network:", error)
        }
      } else {
        console.log("[v0] No wallet detected, using default network:", selectedNetwork)
      }
      setIsInitialized(true)
    }

    detectNetwork()
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
          <span className="text-gray-400">Initializing network...</span>
        </div>
      </div>
    )
  }

  return (
    <NetworkContext.Provider
      value={{
        selectedNetwork,
        networkConfig,
        switchNetwork,
        isNetworkSupported,
        getNetworkByChainId,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider")
  }
  return context
}
