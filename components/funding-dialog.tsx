"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DollarSign, ExternalLink, MessageCircle, Calendar, Heart } from "lucide-react"

interface FundingDialogProps {
  children: React.ReactNode
}

export function FundingDialog({ children }: FundingDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-green-950/95 border-green-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-green-300 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400" />
            Thank You for Your Interest!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 font-semibold">Campaign Status</span>
            </div>
            <p className="text-gray-300 mb-2">
              Our Juicebox funding campaign has successfully concluded on{" "}
              <span className="text-green-300 font-semibold">September 7, 2025</span>.
            </p>
            <p className="text-gray-300">
              We want to extend our heartfelt gratitude to everyone who contributed and supported the WORM project!
            </p>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-semibold">Large Donations Welcome</span>
            </div>
            <p className="text-gray-300 mb-3">
              We still accept larger donations (above 1 ETH) for continued development and ecosystem growth.
            </p>
            <div className="flex items-center gap-2 text-gray-300">
              <MessageCircle className="w-4 h-4 text-green-400" />
              <span>Contact: </span>
              <a
                href="https://t.me/keyvankambakhsh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-200 font-semibold underline"
              >
                @keyvankambakhsh
              </a>
              <span className="text-blue-300">on Telegram</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="https://juicebox.money/v4/eth:165?tabid=about"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-300 hover:bg-green-900/50 bg-transparent"
              >
                View Campaign Details
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>

            <Button
              onClick={() => setIsOpen(false)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-black font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
