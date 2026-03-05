import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, AlertTriangle, TrendingDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { inventoryAPI } from "@/lib/api";
import { toast } from "sonner";

interface InventoryItem {
  _id?: string;
  id?: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  last_restocked_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

const categoryColors: Record<string, string> = {
  Tailam: "bg-accent/20 text-accent border-accent/30",
  Churna: "bg-primary/20 text-primary border-primary/30",
  Kashayam: "bg-highlight/20 text-highlight border-highlight/30",
  Gulika: "bg-earth/20 text-earth border-earth/30",
  Arishtam: "bg-muted text-muted-foreground border-border",
};

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { data: inventoryItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        return await inventoryAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load inventory");
        throw error;
      }
    },
  });

  const categories = ["All", ...new Set(inventoryItems.map((item: InventoryItem) => item.category))];

  const filteredItems = inventoryItems.filter((item: InventoryItem) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventoryItems.filter((item: InventoryItem) => item.quantity < item.min_stock_level);
  const totalItems = inventoryItems.length;
  const healthyStock = inventoryItems.filter((item: InventoryItem) => item.quantity >= 50).length;
  const criticalItems = inventoryItems.filter((item: InventoryItem) => item.quantity < 10).length;

  const getStockColor = (stock: number, minStock: number) => {
    if (stock < 10 || stock < minStock * 0.5) return "bg-destructive";
    if (stock < 25 || stock < minStock) return "bg-highlight";
    if (stock < 50) return "bg-accent";
    return "bg-primary";
  };

  const getStockLabel = (stock: number, minStock: number) => {
    if (stock < 10 || stock < minStock * 0.5) return "Critical";
    if (stock < 25 || stock < minStock) return "Low";
    if (stock < 50) return "Moderate";
    return "Good";
  };

  const getStockPercentage = (quantity: number, minStock: number) => {
    // Calculate percentage based on a reasonable max (minStock * 10 or 100, whichever is higher)
    const maxStock = Math.max(minStock * 10, 100);
    return Math.min((quantity / maxStock) * 100, 100);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading inventory...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="font-semibold text-destructive mb-2">Failed to load inventory</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage Ayurvedic medicines and supplies
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{healthyStock}</p>
                <p className="text-xs text-muted-foreground">Healthy Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-highlight/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-highlight" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{lowStockItems.length}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{criticalItems}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-destructive/5 rounded-2xl border border-destructive/20 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-destructive">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lowStockItems.map((item: InventoryItem) => (
                <div
                  key={item._id || item.id}
                  className="bg-background rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 rounded-xl"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Inventory Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">
                {searchQuery || selectedCategory !== "All" ? "No items found" : "No inventory items"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search or filter"
                  : "Start by adding inventory items to track your supplies"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-4 font-semibold text-sm">Item Name</th>
                    <th className="text-left p-4 font-semibold text-sm">Category</th>
                    <th className="text-left p-4 font-semibold text-sm">Stock Level</th>
                    <th className="text-left p-4 font-semibold text-sm">Status</th>
                    <th className="text-left p-4 font-semibold text-sm">Last Restocked</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item: InventoryItem, index: number) => {
                    const stockPercentage = getStockPercentage(item.quantity, item.min_stock_level);
                    return (
                      <motion.tr
                        key={item._id || item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.03 }}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{item.item_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              categoryColors[item.category] || categoryColors["Tailam"]
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 w-48">
                          <div className="space-y-1">
                            <Progress
                              value={stockPercentage}
                              className={`h-2 [&>div]:${getStockColor(item.quantity, item.min_stock_level)}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} (Min: {item.min_stock_level})
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              item.quantity < 10 || item.quantity < item.min_stock_level * 0.5
                                ? "bg-destructive/20 text-destructive"
                                : item.quantity < 25 || item.quantity < item.min_stock_level
                                ? "bg-highlight/20 text-highlight"
                                : item.quantity < 50
                                ? "bg-accent/20 text-accent"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {getStockLabel(item.quantity, item.min_stock_level)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {item.last_restocked_at
                            ? new Date(item.last_restocked_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : "Never"}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
