"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Globe, Zap } from "lucide-react"
import { useNetwork, type NetworkType } from "@/hooks/use-network"

const NETWORK_LABELS: Record<NetworkType, { name: string; icon: React.ReactNode; color: string }> = {
  sepolia: {
    name: "Sepolia",
    icon: <Globe className="w-4 h-4" />,
    color: "text-blue-400",
  },
  anvil: {
    name: "Anvil",
    icon: <Zap className="w-4 h-4" />,
    color: "text-orange-400",
  },
}

export function NetworkSwitcher() {
  const { selectedNetwork, switchNetwork } = useNetwork()
  const [isLoading, setIsLoading] = useState<NetworkType | null>(null)

  const handleNetworkSwitch = async (network: NetworkType) => {
    if (network === selectedNetwork) return

    setIsLoading(network)
    try {
      await switchNetwork(network)
    } catch (error) {
      console.error("Failed to switch network:", error)
    } finally {
      setIsLoading(null)
    }
  }

  const currentNetwork = NETWORK_LABELS[selectedNetwork]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gray-900/50 border-gray-700 text-gray-300 hover:bg-gray-800/50"
        >
          <div className="flex items-center gap-2">
            <span className={currentNetwork.color}>{currentNetwork.icon}</span>
            <span className="hidden sm:inline">{currentNetwork.name}</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
        {Object.entries(NETWORK_LABELS).map(([network, config]) => (
          <DropdownMenuItem
            key={network}
            onClick={() => handleNetworkSwitch(network as NetworkType)}
            disabled={isLoading === network}
            className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <span className={config.color}>{config.icon}</span>
              <span>{config.name}</span>
              {selectedNetwork === network && <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" />}
              {isLoading === network && (
                <div className="ml-auto w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
