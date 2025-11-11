/**
 * Extracts the revert reason from a contract error
 * @param error The error object from a failed transaction
 * @returns A clean error message with just the revert reason
 */
export function getRevertReason(error: any): string {
    // Try to extract revert reason from various error formats
    if (typeof error === "string") {
      return error
    }
  
    // Check for revert reason in error message
    if (error?.message) {
      const message = error.message
  
      // Pattern 1: "execution reverted: Reason"
      const revertMatch = message.match(/execution reverted:?\s*(.+?)(?:\n|$)/)
      if (revertMatch) {
        return revertMatch[1].trim()
      }
  
      // Pattern 2: "reverted with reason string 'Reason'"
      const reasonMatch = message.match(/reverted with reason string ['"](.+?)['"]/)
      if (reasonMatch) {
        return reasonMatch[1].trim()
      }
  
      // Pattern 3: "Error: Reason" (simple format)
      const errorMatch = message.match(/^Error:\s*(.+)/)
      if (errorMatch) {
        return errorMatch[1].trim()
      }
  
      // Pattern 4: Just take first line if it's descriptive
      const firstLine = message.split("\n")[0].trim()
      if (firstLine && firstLine.length < 200) {
        return firstLine
      }
    }
  
    // Check for shortMessage in viem errors
    if (error?.shortMessage) {
      return error.shortMessage
    }
  
    // Check for reason field
    if (error?.reason) {
      return error.reason
    }
  
    // Fallback
    return "Transaction failed"
  }
  