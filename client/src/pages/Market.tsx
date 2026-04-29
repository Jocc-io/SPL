import { useSales } from "@/hooks/use-solana-program"
import { SaleCard } from "@/components/SaleCard"
import { Loader2, Rocket, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { Input } from "@/components/ui/input"

export default function Market() {
  const { data: sales, isLoading } = useSales()
  const [searchQuery, setSearchQuery] = useState("")

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading sales...</p>
      </div>
    )
  }

  const now = Date.now() / 1000

  const filteredSales = sales?.filter((s) => 
    s.account.mint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.mintInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.mintInfo?.symbol?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  const liveSales = filteredSales.filter((s) => s.account.startTime <= now && s.account.endTime > now)
  const upcomingSales = filteredSales.filter((s) => s.account.startTime > now)
  const endedSales = filteredSales.filter((s) => s.account.endTime <= now)

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1 ">
        <span className="text-transparent text-3xl md:text-5xl font-bold font-display tracking-tight bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
          Token Market
        </span>
         <p className="text-muted-foreground text-xs">
          View all live and upcoming sales, Check your old Purchased tokens.
        </p>
      </div>

      <div className="max-w-2xl mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by token address, name or symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 bg-card/50 border-white/10 rounded-2xl"
        />
      </div>

      <Tabs defaultValue="live" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-5xl grid-cols-3">
            <TabsTrigger value="live">Live ({liveSales.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingSales.length})</TabsTrigger>
            <TabsTrigger value="ended">Ended ({endedSales.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="live" className="space-y-6">
          {liveSales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {liveSales.map((sale) => (
                <SaleCard key={sale.publicKey.toString()} sale={sale} />
              ))}
            </div>
          ) : (
            <EmptyState message={searchQuery ? "No live sales matching your search." : "No live sales at the moment."} />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          {upcomingSales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {upcomingSales.map((sale) => (
                <SaleCard key={sale.publicKey.toString()} sale={sale} />
              ))}
            </div>
          ) : (
            <EmptyState message={searchQuery ? "No upcoming sales matching your search." : "No upcoming sales scheduled."} />
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-6">
          {endedSales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {endedSales.map((sale) => (
                <SaleCard key={sale.publicKey.toString()} sale={sale} />
              ))}
            </div>
          ) : (
            <EmptyState message={searchQuery ? "No ended sales matching your search." : "No ended sales found."} />
          )}
        </TabsContent>
      </Tabs>

      {(!filteredSales || filteredSales.length === 0) && !searchQuery && <EmptyState message="No sales found. Be the first to launch!" />}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 rounded-3xl bg-card/30 border border-white/5">
      <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
      <h3 className="text-xl font-bold text-white mb-2">No Sales Found</h3>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
