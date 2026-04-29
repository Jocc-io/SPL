import { pgTable, text, serial } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

// We are not using a real DB for the core features as per request,
// but we keep the structure for compatibility.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
})

export const insertUserSchema = createInsertSchema(users)
export type User = typeof users.$inferSelect
export type InsertUser = z.infer<typeof insertUserSchema>

// Solana specific schemas for frontend forms
export const createSaleSchema = z
  .object({
    tokenMint: z.string().min(32, "Invalid Mint Address"),
    price: z.number().min(0, "Price must be positive"), // Price in SOL
    amount: z.number().min(0, "Amount must be positive"), // Amount of tokens
    startTime: z.string().min(1, "Start time is required"), // ISO string from date picker
    endTime: z.string().min(1, "End time is required"), // ISO string from date picker
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
    discord: z.string().url("Invalid URL").optional().or(z.literal("")),
    liquidity: z
      .enum(["manual"], {
        errorMap: () => ({ message: "Liquidity mode is required" }),
      })
      .default("manual"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime()
      const end = new Date(data.endTime).getTime()
      return end > start
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  )

export type CreateSaleInput = z.infer<typeof createSaleSchema>

// Helper type for Sale account data fetched from chain
export interface SaleAccount {
  publicKey: string
  account: {
    authority: string
    mint: string
    price: string // BN to string
    amount: string // BN to string
    startTime: string // BN to string
    endTime: string // BN to string
    vault: string
    bump: number
    website?: string
    twitter?: string
    discord?: string
  }
}
