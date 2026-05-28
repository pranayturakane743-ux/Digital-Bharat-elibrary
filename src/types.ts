export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  rating: number;
  available: boolean;
  count: number;
  description: string;
  coverGradient: string; // Tailwind gradient, e.g., "from-cyan-500 to-blue-600"
  coverImage?: string; // Optional path for AI-generated cover images
  accentColor: string; // Hex or theme color for glowing outlines
  year: number;
  pages: number;
  reviews?: Review[];
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  iconName: string; // Lucide icon name string
  glowGradient: string;
}

export interface IssueTransaction {
  id: string;
  bookId: string;
  bookTitle: string;
  userName: string;
  userId: string;
  userEmail: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue';
  fineAmount: number;
  finePaid: boolean;
  qrCodeData?: string;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'student' | 'librarian' | 'admin';
  badges: UserBadge[];
  balance: number;
}

export interface AIChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface AISuggestion {
  reasons: string[];
  recommendedBookIds: string[];
}
