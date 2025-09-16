import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (!amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > 1) {
      return NextResponse.json({ error: "Invalid amount. Must be between 0 and 1 ETH." }, { status: 400 })
    }

    // Mock burn address generation
    // In a real implementation, this would:
    // 1. Generate a unique burn address
    // 2. Store the mapping between amount and address
    // 3. Set up monitoring for the burn transaction
    const mockBurnAddress = `0x${Math.random().toString(16).slice(2, 42).padStart(40, "0")}`

    console.log("[v0] Generated burn address for amount:", amount, "->", mockBurnAddress)

    return NextResponse.json({
      burnAddress: mockBurnAddress,
      amount: amount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error generating burn address:", error)
    return NextResponse.json({ error: "Failed to generate burn address" }, { status: 500 })
  }
}
