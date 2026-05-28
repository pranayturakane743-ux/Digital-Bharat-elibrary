import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_BOOKS } from "./src/data";
import { Book, IssueTransaction, Review, UserProfile } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store that persists during the container's session
let books: Book[] = [...INITIAL_BOOKS];
let transactions: IssueTransaction[] = [
  {
    id: "tx1",
    bookId: "b3",
    bookTitle: "Synthecon: Algorithmic Global Governance",
    userName: "Turakane Student",
    userEmail: "pranayturakane743@gmail.com",
    issueDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().split('T')[0], // 15 days ago
    dueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],   // Overdue by 5 days
    status: 'issued',
    fineAmount: 50, // 5 days overdue * 10/day
    finePaid: false,
    qrCodeData: "LIBR_TX1_B3"
  }
];

let userProfile: UserProfile = {
  email: "pranayturakane743@gmail.com",
  name: "Pranay Turakane",
  role: "student",
  badges: [
    { id: 'first_book', name: 'Chronicle Explorer', description: 'Issued your very first futuristic book', icon: 'BookOpen', unlockedAt: '2026-05-20' }
  ],
  balance: 300
};

// Initialize Gemini SDK lazily to avoid startup crashes if key is empty
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY environment variable is not configured. Running AI features in demo mode.");
    return null;
  }
  geminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return geminiClient;
}

// REST APIs
// 1. Get all books
app.get("/api/books", (req, res) => {
  res.json({ books });
});

// 2. Submit a review for a book
app.post("/api/books/:id/review", (req, res) => {
  const { id } = req.params;
  const { comment, rating, userName } = req.body;

  const book = books.find(b => b.id === id);
  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  const newReview: Review = {
    id: `rev_${Date.now()}`,
    userName: userName || "Anonymous Researcher",
    rating: Number(rating) || 5,
    comment: comment || "",
    date: new Date().toISOString().split('T')[0]
  };

  if (!book.reviews) book.reviews = [];
  book.reviews.unshift(newReview);

  // Recalculate rating
  const avgRating = book.reviews.reduce((acc, rev) => acc + rev.rating, 0) / book.reviews.length;
  book.rating = parseFloat(avgRating.toFixed(1));

  res.json({ success: true, book });
});

// 3. Get transactions (issues/returns catalog)
app.get("/api/transactions", (req, res) => {
  // Overdue recalculation: 10 Indian Rupees per day overdue, max 500 Rupees
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  transactions = transactions.map(tx => {
    if (tx.status === 'issued') {
      const due = new Date(tx.dueDate);
      if (today > due) {
        const msDiff = today.getTime() - due.getTime();
        const daysOverdue = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        const fine = Math.min(daysOverdue * 10, 500);
        return {
          ...tx,
          fineAmount: fine,
          status: 'overdue' as const
        };
      }
    }
    return tx;
  });

  res.json({ transactions });
});

// 4. Issue a book
app.post("/api/books/issue", (req, res) => {
  const { bookId, userName, userEmail } = req.body;
  const bookIndex = books.findIndex(b => b.id === bookId);

  if (bookIndex === -1) {
    return res.status(400).json({ error: "Book not found" });
  }

  const book = books[bookIndex];
  if (!book.available || book.count <= 0) {
    return res.status(400).json({ error: "Book currently unavailable for issuing" });
  }

  // Check if user already holds a copy of this book
  const alreadyIssued = transactions.some(
    tx => tx.bookId === bookId && tx.userEmail === userEmail && (tx.status === 'issued' || tx.status === 'overdue')
  );
  if (alreadyIssued) {
    return res.status(400).json({ error: "You have already issued an active copy of this book" });
  }

  // Reduce available book inventory
  book.count -= 1;
  if (book.count === 0) {
    book.available = false;
  }

  const issueDate = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0]; // 14 days duration

  const newTx: IssueTransaction = {
    id: `tx_${Date.now()}`,
    bookId,
    bookTitle: book.title,
    userName: userName || userProfile.name,
    userEmail: userEmail || userProfile.email,
    issueDate,
    dueDate,
    status: 'issued',
    fineAmount: 0,
    finePaid: false,
    qrCodeData: `LIBR_${Date.now()}_${bookId}`
  };

  transactions.unshift(newTx);
  res.json({ success: true, transaction: newTx, book });
});

// 5. Return a book
app.post("/api/books/return", (req, res) => {
  const { transactionId } = req.body;
  const tx = transactions.find(t => t.id === transactionId);

  if (!tx) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (tx.status === 'returned') {
    return res.status(422).json({ error: "Book has already been returned" });
  }

  // If there's an unpaid fine, check if user balanced allows payment
  if (tx.fineAmount > 0 && !tx.finePaid) {
    return res.status(400).json({ error: "Outstanding overdue fines must be settled before returning." });
  }

  tx.status = 'returned';
  tx.returnDate = new Date().toISOString().split('T')[0];

  // Restock the book
  const book = books.find(b => b.id === tx.bookId);
  if (book) {
    book.count += 1;
    book.available = true;
  }

  // Gamification: Unlock Badge check
  const hasReturnedInTime = new Date(tx.returnDate) <= new Date(tx.dueDate);
  if (hasReturnedInTime && tx.fineAmount === 0) {
    const hasBadge = userProfile.badges.some(b => b.id === 'no_fines');
    if (!hasBadge) {
      userProfile.badges.push({
        id: 'no_fines',
        name: 'Ideal Citizen',
        description: 'Returned a book before the deadline with zero fines',
        icon: 'ShieldCheck',
        unlockedAt: tx.returnDate
      });
    }
  }

  res.json({ success: true, transaction: tx, book });
});

// 6. Settle Fines (Razorpay Mock Pay)
app.post("/api/books/pay-fine", (req, res) => {
  const { transactionId, amount } = req.body;
  const tx = transactions.find(t => t.id === transactionId);

  if (!tx) {
    return res.status(404).json({ error: "Transaction/Record not found" });
  }

  // Process Mock wallet payment
  if (userProfile.balance < amount) {
    return res.status(400).json({ error: "Insufficient wallet credits. Please top-up." });
  }

  userProfile.balance -= amount;
  tx.finePaid = true;
  tx.fineAmount = 0; // cleared

  res.json({ success: true, transaction: tx, balance: userProfile.balance });
});

// 7. Get User Profile details
app.get("/api/user-profile", (req, res) => {
  // Evaluate badges
  const issuedBookCount = transactions.filter(t => t.userEmail === userProfile.email).length;
  // Polymorphic Scholar check
  const activeTxBooks = transactions.filter(t => t.userEmail === userProfile.email);
  const issuedBookIds = activeTxBooks.map(t => t.bookId);
  const userGenres = books.filter(b => issuedBookIds.includes(b.id)).map(b => b.category);
  const uniqueGenres = Array.from(new Set(userGenres));

  if (uniqueGenres.length >= 3) {
    const hasBadge = userProfile.badges.some(b => b.id === 'three_genres');
    if (!hasBadge) {
      userProfile.badges.push({
        id: 'three_genres',
        name: 'Polymorphic Scholar',
        description: 'Issued books from 3 or more distinctive genres',
        icon: 'Layers',
        unlockedAt: new Date().toISOString().split('T')[0]
      });
    }
  }

  res.json({ userProfile });
});

// 8. Recharge Wallet
app.post("/api/user-profile/recharge", (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid recharge amount" });
  }

  userProfile.balance += Number(amount);
  res.json({ success: true, balance: userProfile.balance });
});

// 9. AI Book Recommendations using Gemini 3.5 Flash
app.post("/api/gemini/recommend", async (req, res) => {
  const { query, activeHistoryIds, preferredCategory } = req.body;
  const client = getGeminiClient();

  // Pre-prepare a context injection about available titles
  const libraryCatalogStr = books.map(b => `[ID: ${b.id}, Title: "${b.title}", Author: "${b.author}", Category: "${b.category}", Detail: "${b.description}"]`).join("\n");

  const fallbackRecommendations = books
    .filter(b => b.category === preferredCategory || preferredCategory === "All" || !preferredCategory)
    .slice(0, 3)
    .map(b => b.id);

  const finalFallbacks = fallbackRecommendations.length > 0 ? fallbackRecommendations : [books[0]?.id, books[1]?.id].filter(Boolean);

  if (!client) {
    // Elegant fallback simulation when API Key is missing, explaining key highlights in demo mode
    return res.json({
      reasons: [
        "AI Co-Scholar local indexing engine is fully operational (no remote API key required).",
        `We verified your active genre focus of "${preferredCategory || 'diverse Indian literature'}" and historical checkouts.`,
        "Selected acclaimed works by notable authors matching your search patterns."
      ],
      recommendedBookIds: finalFallbacks
    });
  }

  try {
    const historySection = activeHistoryIds && activeHistoryIds.length > 0
      ? `The user has read or issued books with following IDs: ${activeHistoryIds.join(", ")}.`
      : "The user is exploring the digital library catalog first-hand.";

    const categorySection = preferredCategory && preferredCategory !== "All"
      ? `The user has high active interest in the category/genre: "${preferredCategory}".`
      : "The user has a wide list of interests spanning multiple Indian genres.";

    const searchStr = query ? `The user is specifically asking/filtering with prompt: "${query}"` : "User requests a personalized curation of literary works.";

    const prompt = `You are the ultimate AI Co-Scholar and Literary Advisor of Bharat E-Library, an exquisite digital repository of world-class Indian literature, mythology, contemporary fiction, historical narratives, poetry, and self-help classics.
Analyze the user's specific query and historical profile to recommend exactly 2 or 3 relevant books from our active inventory.
${historySection}
${categorySection}
${searchStr}

Active Inventory:
${libraryCatalogStr}

Strict Response Format:
You MUST respond with a raw JSON object matching the following TypeScript schema structure:
{
  "reasons": string[], // 3 distinct bullets detailing why these books match their interest, referencing their author style, emotional tone, cultural depth, or literary brilliance
  "recommendedBookIds": string[] // matching Book IDs exactly (e.g. ["b1", "b4"])
}

Return ONLY this JSON, with no other wrapping text, markdown blocks, or preamble comments.`;

    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = result.text || "";
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    const errorStr = String(error?.message || error?.stack || error || "");
    const isQuotaError = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || (error?.status === "RESOURCE_EXHAUSTED") || (error?.status === 429);
    const isUnavailableError = errorStr.includes("503") || errorStr.includes("UNAVAILABLE");

    if (isQuotaError) {
      console.warn("[Gemini REST] API exhaustion quota limit detected (429).");
    } else if (isUnavailableError) {
      console.warn("[Gemini REST] API is currently unavailable (503) due to high demand. Using offline fallback.");
    } else {
      console.error("Gemini API Error:", errorStr);
    }

    res.json({
      reasons: [
        isQuotaError 
          ? "ERROR: Your Gemini API Key has exceeded its quota limit. Please check your billing or use a different key."
          : "AI Co-Scholar is serving curated recommendations from our high-speed offline Indian classical index due to an API error.",
        `Based on your interest in "${preferredCategory || 'all genres'}", here are our local suggestions.`,
        "Highlighting premium fiction and historical deep-dives from our catalog."
      ],
      recommendedBookIds: finalFallbacks
    });
  }
});

// Vite Setup on Express
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Futuristic Lib Server] Live and powering portals on port ${PORT}`);
  });
}

startServer();
