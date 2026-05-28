import * as admin from 'firebase-admin';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase Admin SDK using the projectId from the config
initializeApp({
    projectId: firebaseConfig.projectId
});
const db = getFirestore(undefined, firebaseConfig.firestoreDatabaseId);

const csvBooks = [
    ["Five Point Someone", "Chetan Bhagat", "978-81-291-0459-5", "2004", "Contemporary Fiction", "https://covers.openlibrary.org/b/isbn/9788129104595-L.jpg"],
    ["The God of Small Things", "Arundhati Roy", "978-0679457312", "1997", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780679457312-L.jpg"],
    ["A Fine Balance", "Rohinton Mistry", "978-0571190843", "1995", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780571190843-L.jpg"],
    ["The White Tiger", "Aravind Adiga", "978-1416562597", "2008", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9781416562597-L.jpg"],
    ["A Suitable Boy", "Vikram Seth", "978-0060786526", "1993", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780060786526-L.jpg"],
    ["The Inheritance of Loss", "Kiran Desai", "978-0802142818", "2006", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9780802142818-L.jpg"],
    ["Midnight's Children", "Salman Rushdie", "978-0099582076", "1981", "Magical Realism", "https://covers.openlibrary.org/b/isbn/9780099582076-L.jpg"],
    ["Indian Mythology", "Devdutt Pattanaik", "978-0892818709", "2003", "Mythology", "https://covers.openlibrary.org/b/isbn/9780892818709-L.jpg"],
    ["The Pathless Path", "Preeti Shenoy", "978-9353337196", "2020", "Self-Help", "https://covers.openlibrary.org/b/isbn/9789353337196-L.jpg"],
    ["Awake and Dreaming", "Chetan Bhagat", "978-8129132543", "2008", "Poetry", "https://covers.openlibrary.org/b/isbn/9788129132543-L.jpg"],
    ["The Palace of Illusions", "Chitra Banerjee Divakaruni", "978-0385519732", "2008", "Mythological Fiction", "https://covers.openlibrary.org/b/isbn/9780385519732-L.jpg"],
    ["Matru Devi Se Sanjay Tak", "Sudha Murty", "978-0143451624", "2020", "Contemporary", "https://covers.openlibrary.org/b/isbn/9780143451624-L.jpg"],
    ["The Elephant, the Tiger, and the Cellphone", "Shashi Tharoor", "978-0802142801", "2007", "Non-Fiction", "https://covers.openlibrary.org/b/isbn/9780802142801-L.jpg"],
    ["Mother Mary Comes to Me", "Arundhati Roy", "978-0593596716", "2025", "Memoir", "https://covers.openlibrary.org/b/isbn/9780593596716-L.jpg"],
    ["The Far Field", "Madhuri Vijay", "978-1984820038", "2019", "Literary Fiction", "https://covers.openlibrary.org/b/isbn/9781984820038-L.jpg"]
];

async function importBooks() {
    const booksRef = db.collection('books');
    
    for (const bookRow of csvBooks) {
        const [title, author, isbn, year, category, coverImage] = bookRow;
        
        const existingBook = await booksRef.where('isbn', '==', isbn).get();
        if (!existingBook.empty) {
            console.log(`Skipping duplicate: ${title} (ISBN: ${isbn})`);
            continue;
        }

        const newBook = {
            title,
            author,
            isbn,
            category,
            year: parseInt(year),
            coverImage,
            rating: 5,
            available: true,
            count: 1,
            description: 'Imported book',
            coverGradient: 'from-stone-900 to-stone-950',
            accentColor: 'blue',
            pages: 200
        };

        await booksRef.add(newBook);
        console.log(`Added: ${title}`);
    }
}

importBooks().catch(console.error);
