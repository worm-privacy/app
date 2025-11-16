"use client"

import type React from "react"
import { useEffect } from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Twitter, MessageCircle, Github } from 'lucide-react'
import { ethers } from "ethers"
import { getRevertReason } from "@/lib/error-utils"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface ParticipateKOLDialogProps {
  children: React.ReactNode
  parentCodeFromUrl?: string | null
}

export function ParticipateKOLDialog({ children, parentCodeFromUrl }: ParticipateKOLDialogProps) {
  const [open, setOpen] = useState(false)
  const [parentCode, setParentCode] = useState("")
  const [userCode, setUserCode] = useState("")
  const [tweetLink, setTweetLink] = useState("")
  const [githubHandle, setGithubHandle] = useState("")
  const [twitterHandle, setTwitterHandle] = useState("")
  const [discordHandle, setDiscordHandle] = useState("")

  const [followedTwitter, setFollowedTwitter] = useState(false)
  const [joinedDiscord, setJoinedDiscord] = useState(false)
  const [postedTweet, setPostedTweet] = useState(false)
  const [starredGithub, setStarredGithub] = useState(false)
  const [transferredWorm, setTransferredWorm] = useState(false)

  const [isCheckingCode, setIsCheckingCode] = useState(false)
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [successfulInviteCode, setSuccessfulInviteCode] = useState<string>("")

  const { signer, address } = useWallet()
  const { networkConfig } = useNetwork()
  const { toast } = useToast()

  useEffect(() => {
    if (open && parentCodeFromUrl) {
      setParentCode(parentCodeFromUrl)
    }
  }, [open, parentCodeFromUrl])

  const checkCodeAvailability = async () => {
    if (!signer || !userCode || userCode.trim().length === 0) {
      setCodeAvailable(null)
      return
    }

    setIsCheckingCode(true)
    try {
      const kolContract = new ethers.Contract(networkConfig.contracts.kol, KOL_NETWORK_ABI, signer)
      const ownerAddress = await kolContract.codeToKOL(userCode.trim())

      setCodeAvailable(ownerAddress === ethers.ZeroAddress)
    } catch (err) {
      console.error("Error checking code availability:", err)
      toast({
        title: "Error",
        description: getRevertReason(err),
        variant: "destructive",
      })
      setCodeAvailable(null)
    } finally {
      setIsCheckingCode(false)
    }
  }

  const handleApprove = async () => {
    if (!signer) {
      setError("Wallet not connected")
      return
    }

    setIsApproving(true)
    setError(null)

    try {
      const kolContractAddress = networkConfig.contracts.kol
      const wormContract = new ethers.Contract(networkConfig.contracts.worm, ERC20_ABI, signer)

      const approveAmount = ethers.parseUnits("0.1", 18)
      const approveTx = await wormContract.approve(kolContractAddress, approveAmount)

      await approveTx.wait()
      setError(null)
    } catch (err: any) {
      console.error("Error approving WORM:", err)
      setError(getRevertReason(err))
    } finally {
      setIsApproving(false)
    }
  }

  const handleParticipate = async () => {
    if (!signer || !address) {
      setError("Wallet not connected")
      return
    }

    if (!parentCode || parentCode.trim().length === 0) {
      setError("Please enter the parent invite code")
      return
    }

    if (!userCode || userCode.trim().length === 0) {
      setError("Please enter your unique invite code")
      return
    }

    if (codeAvailable === false) {
      setError("This invite code is already taken. Please choose another one.")
      return
    }

    if (!followedTwitter || !joinedDiscord || !postedTweet || !tweetLink || !twitterHandle || !discordHandle) {
      setError("Please complete all required tasks and provide your social handles")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const kolContractAddress = networkConfig.contracts.kol
      const kolContract = new ethers.Contract(kolContractAddress, KOL_NETWORK_ABI, signer)

      if (transferredWorm) {
        const wormContract = new ethers.Contract(networkConfig.contracts.worm, ERC20_ABI, signer)
        const allowance = await wormContract.allowance(address, kolContractAddress)
        const requiredAmount = ethers.parseUnits("0.1", 18)

        if (allowance < requiredAmount) {
          setError("Insufficient WORM token allowance. Please approve first.")
          setIsProcessing(false)
          return
        }
      }

      const metadata = JSON.stringify({
        twitter: twitterHandle,
        discord: discordHandle,
        tweet: tweetLink,
        github: githubHandle || "",
        githubStarred: starredGithub,
        transferred: transferredWorm,
      })

      const tx = await kolContract.participate(parentCode.trim(), userCode.trim(), metadata, transferredWorm)
      setTxHash(tx.hash)

      await tx.wait()

      setSuccessfulInviteCode(userCode.trim())
      setSuccess(true)
    } catch (err: any) {
      console.error("Error participating:", err)
      setError(getRevertReason(err))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setParentCode("")
      setUserCode("")
      setTweetLink("")
      setGithubHandle("")
      setTwitterHandle("")
      setDiscordHandle("")
      setFollowedTwitter(false)
      setJoinedDiscord(false)
      setPostedTweet(false)
      setStarredGithub(false)
      setTransferredWorm(false)
      setCodeAvailable(null)
      setSuccess(false)
      setError(null)
      setTxHash(null)
      setSuccessfulInviteCode("")
    }, 200)
  }

  const getShareableLink = () => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin
      return `${baseUrl}/app/kol#${successfulInviteCode}`
    }
    return ""
  }

  const KOL_NETWORK_ABI = [
    "function participate(string calldata parentCode, string calldata userCode, string calldata metadata, bool transferWorm) external",
    "function kols(address) external view returns (address parent, bool isKOL, uint256 childCount, string inviteCode, string metadata)",
    "function codeToKOL(string) external view returns (address)",
    "function wormToken() external view returns (address)",
    "function SIGNUP_COST() external view returns (uint256)",
  ]

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
  ]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-gray-900 border-green-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-300">Join KOL Network</DialogTitle>
          <DialogDescription className="text-gray-400">
            Complete the tasks below to participate in the network (costs 0.1 WORM)
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentCode" className="text-green-300">
                Parent Invite Code *
              </Label>
              <Input
                id="parentCode"
                placeholder="Enter parent's invite code..."
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value)}
                readOnly={!!parentCodeFromUrl}
                className={`bg-black border-green-800 text-white font-mono ${parentCodeFromUrl ? "opacity-75 cursor-not-allowed" : ""}`}
              />
              {parentCodeFromUrl && (
                <p className="text-xs text-blue-400">Invite code set from referral link</p>
              )}
              <p className="text-xs text-gray-400">The invite code from the KOL who invited you</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userCode" className="text-green-300">
                Your Invite Code *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="userCode"
                  placeholder="Choose your unique invite code..."
                  value={userCode}
                  onChange={(e) => {
                    setUserCode(e.target.value)
                    setCodeAvailable(null)
                  }}
                  className="bg-black border-green-800 text-white font-mono flex-1"
                />
                <Button
                  onClick={checkCodeAvailability}
                  disabled={!userCode || isCheckingCode}
                  variant="outline"
                  className="border-blue-600 text-blue-300 hover:bg-blue-900/50 bg-transparent"
                >
                  {isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
                </Button>
              </div>
              {codeAvailable === true && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  This code is available!
                </p>
              )}
              {codeAvailable === false && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This code is already taken
                </p>
              )}
              <p className="text-xs text-gray-400">Your unique code that others will use to join under you</p>
            </div>

            <div className="border-t border-green-800/50 pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-green-300">Complete These Tasks</h4>

              <div className="flex items-start gap-3 p-3 bg-black/50 border border-green-800/50 rounded">
                <Checkbox
                  id="twitter"
                  checked={followedTwitter}
                  onCheckedChange={(checked) => setFollowedTwitter(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="twitter" className="text-white cursor-pointer flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-blue-400" />
                    Follow WORM on X *
                  </Label>
                  <a
                    href="https://x.com/EIP7503"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    https://x.com/EIP7503
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {followedTwitter && (
                    <Input
                      placeholder="Your X handle (e.g., @username)"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                      className="bg-black border-green-800 text-white text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-black/50 border border-green-800/50 rounded">
                <Checkbox
                  id="discord"
                  checked={joinedDiscord}
                  onCheckedChange={(checked) => setJoinedDiscord(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="discord" className="text-white cursor-pointer flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    Join WORM's Discord Server *
                  </Label>
                  <a
                    href="https://discord.gg/EIP7503"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    https://discord.gg/EIP7503
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {joinedDiscord && (
                    <Input
                      placeholder="Your Discord handle (e.g., username#1234)"
                      value={discordHandle}
                      onChange={(e) => setDiscordHandle(e.target.value)}
                      className="bg-black border-green-800 text-white text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-black/50 border border-green-800/50 rounded">
                <Checkbox
                  id="tweet"
                  checked={postedTweet}
                  onCheckedChange={(checked) => setPostedTweet(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="tweet" className="text-white cursor-pointer flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-blue-400" />
                    Post About Campaign & Tag @EIP7503 *
                  </Label>
                  <p className="text-xs text-gray-400">
                    Post about the campaign, tag @EIP7503, and onboard new users. Submit the link to your post below.
                  </p>
                  <Input
                    placeholder="https://twitter.com/..."
                    value={tweetLink}
                    onChange={(e) => setTweetLink(e.target.value)}
                    className="bg-black border-green-800 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-black/50 border border-green-800/30 rounded opacity-90">
                <Checkbox
                  id="github"
                  checked={starredGithub}
                  onCheckedChange={(checked) => setStarredGithub(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="github" className="text-white cursor-pointer flex items-center gap-2">
                    <Github className="w-4 h-4 text-gray-400" />
                    Star GitHub Repo (Optional)
                  </Label>
                  <p className="text-xs text-gray-400">Earn extra score by starring the repo</p>
                  <a
                    href="https://github.com/worm-privacy/proof-of-burn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    worm-privacy/proof-of-burn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Input
                    placeholder="Your GitHub username (optional)"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    className="bg-black border-green-800 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-black/50 border border-green-800/30 rounded opacity-90">
                <Checkbox
                  id="transfer"
                  checked={transferredWorm}
                  onCheckedChange={(checked) => setTransferredWorm(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="transfer" className="text-white cursor-pointer">
                    Transfer 0.1 WORM (Optional)
                  </Label>
                  <p className="text-xs text-gray-400">
                    Prove you have participated in our testnet and earn extra score
                  </p>
                </div>
              </div>
            </div>

            {transferredWorm && (
              <div className="bg-yellow-950/30 border border-yellow-800 rounded p-3 text-sm text-yellow-300 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Transfer WORM selected:</p>
                  <p className="text-xs">
                    You must approve the contract to spend 0.1 WORM token. Click "Approve WORM" first if you haven't
                    already.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              {transferredWorm && (
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isProcessing}
                  variant="outline"
                  className="flex-1 border-yellow-600 text-yellow-300 hover:bg-yellow-900/50 bg-transparent"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve WORM"
                  )}
                </Button>
              )}

              <Button
                onClick={handleParticipate}
                disabled={
                  isProcessing ||
                  isApproving ||
                  !parentCode ||
                  !userCode ||
                  codeAvailable === false ||
                  !followedTwitter ||
                  !joinedDiscord ||
                  !postedTweet ||
                  !tweetLink ||
                  !twitterHandle ||
                  !discordHandle
                }
                className={`${transferredWorm ? "flex-1" : "w-full"} bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Participating...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </div>

            {txHash && (
              <p className="text-xs text-gray-400 text-center font-mono">
                Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center text-green-400 mb-2">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-green-300">Successfully Joined!</h3>
              <p className="text-gray-400">You are now part of the KOL network</p>
              <p className="text-sm text-green-300 font-mono">Your invite code: {successfulInviteCode}</p>
              {txHash && (
                <p className="text-xs text-gray-400 font-mono">
                  Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              )}
            </div>

            <div className="bg-purple-950/30 border border-purple-800 rounded p-4 space-y-2">
              <p className="text-sm font-semibold text-purple-300">Share your referral link:</p>
              <div className="flex gap-2">
                <Input
                  value={getShareableLink()}
                  readOnly
                  className="bg-black border-purple-700 text-white font-mono text-sm flex-1"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareableLink())
                    toast({
                      title: "Copied!",
                      description: "Referral link copied to clipboard",
                    })
                  }}
                  variant="outline"
                  className="border-purple-600 text-purple-300 hover:bg-purple-900/50 bg-transparent"
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Share this link with others to invite them to join under your network
              </p>
            </div>

            <div className="bg-green-950/30 border border-green-800 rounded p-3 text-sm text-green-300">
              <p className="font-semibold mb-1">What's next:</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-gray-300">
                <li>Share your invite code with others to grow your network</li>
                <li>Promote WORM Privacy on social media</li>
                <li>Help grow the community and earn rewards</li>
              </ul>
            </div>

            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full border-green-600 text-green-300 bg-transparent"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
