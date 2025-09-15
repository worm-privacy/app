import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WORM - A Scarce Cryptoasset Rooted in Private ETH Destruction",
  description:
    "WORM transforms irreversible ETH burns into an economically meaningful, scarce asset using zk-SNARKs and Private Proof-of-Burn.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
