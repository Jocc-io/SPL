"use client"

import { Link } from "wouter"
import type { ParsedSale } from "@/hooks/use-solana-program"
import { isFuture, isPast } from "date-fns"
import { Clock, Tag } from "lucide-react"
import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

export function SaleCard({ sale }: { sale: ParsedSale }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  const start = new Date(sale.account.startTime * 1000)
  const end = new Date(sale.account.endTime * 1000)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const target = isFuture(start) ? start : end
      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        if (isPast(end)) setTimeLeft("Ended")
        else setTimeLeft("Started")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(timer)
  }, [start, end])

  const isLive = isPast(start) && isFuture(end)
  const isUpcoming = isFuture(start)
  const isEnded = isPast(end)

  const priceSol = Number(sale.account.price) / 1e9
  const decimals = sale.mintInfo?.decimals || 0

  const totalAmount = Number(sale.account.amount) / 10 ** decimals
  const tokensSold = Number(sale.account.totalSold) / 10 ** decimals
  const availableTokens = isEnded ? 0 : totalAmount - tokensSold
  const progress = totalAmount > 0 ? (tokensSold / totalAmount) * 100 : 0

  const shortMint = `${sale.account.mint.slice(0, 8)}...${sale.account.mint.slice(-8)}`
  const shortAuthority = `${sale.account.authority.slice(0, 8)}...${sale.account.authority.slice(-8)}`

  return (
    <Link href={`/${sale.publicKey.toString()}`}>
      <div className="group relative overflow-hidden rounded-2xl bg-card border border-white/5 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer">
        <div className="absolute top-4 right-4">
          {isLive && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse">
              LIVE NOW
            </span>
          )}
          {isUpcoming && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-400">
              UPCOMING
            </span>
          )}
          {isEnded && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
              ENDED
            </span>
          )}
        </div>

        <div className="mb-2">
          <span className="text-transparent text-xl md:text-2xl font-bold font-display tracking-tight bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
            {sale.mintInfo?.name || "Token Sale"}
          </span>
          <p className="text-[11px] mt-2 text-muted-foreground/60 font-mono flex items-center justify-start gap-1">
            <Tag className="w-3 h-3" />
            Mint: {shortMint}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-white/5">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-sm font-semibold text-white/60">{priceSol} SOL</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-white/5">
            <span className="text-sm text-muted-foreground">Available</span>
            <span className="text-sm font-semibold text-white/60">
              {availableTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} Tokens
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold text-white/60">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between mt-4 p-3 gap-2 rounded-2xl bg-background/30 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground ">
              <Clock className="w-4 h-4" />
              {isLive ? "Time Left:" : isUpcoming ? "Starts In:" : "Status:"}
            </div>
            <div className="text-xs font-mono text-green-500">{timeLeft}</div>
          </div>
          <p className="text-[11px] items-center justify-center text-muted-foreground/60 font-mono flex items-center justify-start gap-1">
            Creator: {shortAuthority}
          </p>
        </div>
      </div>
    </Link>
  )
}
