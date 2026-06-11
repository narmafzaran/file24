export interface Category {
  id: string;
  label: string;
  slug: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  purchaseCount: number;
  createdAt: string;
  imageUrl?: string;
  category?: string;
  slug?: string;
}

export interface DownloadLog {
  id: string;
  productId: string;
  productTitle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  pricePaid: number;
  downloadedAt: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  userName: string;
  userPhone: string;
  userEmail: string;
  status: 'completed' | 'pending' | 'failed';
  downloadToken: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  transactionId?: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMetrics {
  totalProducts: number;
  totalDownloads: number;
  totalSales: number;
  totalRevenue: number;
  pendingTicketsCount?: number;
  recentDownloads: DownloadLog[];
  recentTransactions: Transaction[];
}
