interface CloverItem {
  id: string
  name: string
  price?: number
  description?: string
  categories?: {
    elements: Array<{
      name: string
    }>
  }
  hidden?: boolean
  tax?: any
}

// Map all items to a consistent format
const formattedItems = itemsData.elements
  .filter((item: CloverItem) => item.price !== undefined && item.price !== null) // Only include items with prices
  .map((item: CloverItem) => ({
    id: item.id,
    name: item.name,
    price: item.price || 0,
    description: item.description || '',
    categories: (item.categories?.elements || []).map((cat) => cat.name),
    hidden: item.hidden || false,
    available: !item.hidden,
    taxRates: item.tax ? [item.tax] : []
  }))
  .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name 