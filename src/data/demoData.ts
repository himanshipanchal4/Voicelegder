import { Transaction, InventoryItem, ShopSettings } from "../types";

export const initialSettings: ShopSettings = {
  shopName: "Sharma General Store",
  ownerName: "Rakesh Sharma",
  preferredLanguage: "en",
  currency: "INR (₹)",
  lowStockAlertsEnabled: true,
};

// Date helpers to ensure timestamps look real today and yesterday
const now = new Date();
const todayDate = now.toISOString().split("T")[0];

const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const yesterdayDate = yesterday.toISOString().split("T")[0];

const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);
const twoDaysAgoDate = twoDaysAgo.toISOString().split("T")[0];

export const sampleDemoTransactions: Transaction[] = [
  {
    id: "txn-1",
    customer_name: "Sharma",
    items: [{ name: "Grocery items & pulses", quantity: 1, unit_price: 200 }],
    total_amount: 200,
    payment_status: "credit",
    transaction_type: "sale",
    date: todayDate,
    time: "10:42 AM",
    notes: "Sharma ne 200 rupees ka saaman liya, udhaar.",
    confidence: 94,
    source: "voice",
  },
  {
    id: "txn-2",
    customer_name: "Priya",
    items: [
      { name: "Grocery & Milk", quantity: 2, unit_price: 250 },
    ],
    total_amount: 500,
    payment_status: "paid",
    transaction_type: "sale",
    date: todayDate,
    time: "09:15 AM",
    notes: "Priya ne 500 rupaye ka grocery liya aur payment kar diya.",
    confidence: 96,
    source: "voice",
  },
  {
    id: "txn-3",
    customer_name: "Ramesh",
    items: [
      { name: "Rice (Chawal)", quantity: 3, unit_price: 60 },
      { name: "Cooking Oil (Tel)", quantity: 2, unit_price: 335 },
    ],
    total_amount: 850,
    payment_status: "credit",
    transaction_type: "sale",
    date: todayDate,
    time: "08:50 AM",
    notes: "Ramesh ne 300 rupaye ka maal liya, abhi payment nahi kiya (total udhaar recorded 850).",
    confidence: 92,
    source: "voice",
  },
  {
    id: "txn-4",
    customer_name: "Sharma",
    items: [{ name: "Bulk Atta & Sugar 25kg", quantity: 1, unit_price: 1050 }],
    total_amount: 1050,
    payment_status: "credit",
    transaction_type: "sale",
    date: yesterdayDate,
    time: "05:20 PM",
    notes: "Sharma ji store order - baki kal denge.",
    confidence: 95,
    source: "manual",
  },
  {
    id: "txn-5",
    customer_name: "Amit",
    items: [
      { name: "Spices & Dry Fruits", quantity: 2, unit_price: 310 },
    ],
    total_amount: 620,
    payment_status: "credit",
    transaction_type: "sale",
    date: todayDate,
    time: "11:15 AM",
    notes: "Amit ne masala liya 620 ka, udhaar likh lo.",
    confidence: 91,
    source: "voice",
  },
  {
    id: "txn-6",
    customer_name: "Neha",
    items: [
      { name: "Biscuits & Snacks", quantity: 4, unit_price: 85 },
    ],
    total_amount: 340,
    payment_status: "paid",
    transaction_type: "sale",
    date: todayDate,
    time: "11:45 AM",
    notes: "Neha ne cash de diya 340 rs.",
    confidence: 98,
    source: "voice",
  },
  {
    id: "txn-7",
    customer_name: "Rajesh",
    items: [
      { name: "Sugar (Cheeni) 25 kg", quantity: 1, unit_price: 1100 },
    ],
    total_amount: 1100,
    payment_status: "paid",
    transaction_type: "sale",
    date: todayDate,
    time: "12:10 PM",
    notes: "Rajesh ne GPay se 1100 rupaye turant bhej diye.",
    confidence: 97,
    source: "voice",
  },
  {
    id: "txn-8",
    customer_name: "Wholesale Mandi Supplier",
    items: [
      { name: "Grain Sacks (Wheat & Rice)", quantity: 5, unit_price: 400 },
    ],
    total_amount: 2000,
    payment_status: "paid",
    transaction_type: "purchase",
    date: yesterdayDate,
    time: "06:30 PM",
    notes: "Wholesale supplier se anaaj ki boriyan kharidi cash dekar.",
    confidence: 93,
    source: "voice",
  },
  {
    id: "txn-9",
    customer_name: "Suresh",
    items: [
      { name: "Toor Dal & Cooking Oil", quantity: 1, unit_price: 450 },
    ],
    total_amount: 450,
    payment_status: "paid",
    transaction_type: "sale",
    date: todayDate,
    time: "01:25 PM",
    notes: "Suresh ne 450 ka maal liya cash payment.",
    confidence: 95,
    source: "voice",
  },
  {
    id: "txn-10",
    customer_name: "Pooja",
    items: [
      { name: "Soap & Detergent Powder", quantity: 2, unit_price: 90 },
    ],
    total_amount: 180,
    payment_status: "paid",
    transaction_type: "sale",
    date: twoDaysAgoDate,
    time: "04:10 PM",
    notes: "Sabun aur surf liya.",
    confidence: 90,
    source: "manual",
  },
  {
    id: "txn-11",
    customer_name: "Kulkarni",
    items: [
      { name: "Tea powder & Jaggery (Gud)", quantity: 3, unit_price: 130 },
    ],
    total_amount: 390,
    payment_status: "credit",
    transaction_type: "sale",
    date: yesterdayDate,
    time: "07:15 PM",
    notes: "Kulkarni kaka kadun 390 rupaye yene baki ahe.",
    confidence: 89,
    source: "voice",
  },
  {
    id: "txn-12",
    customer_name: "Deepak",
    items: [
      { name: "Dairy & Bread", quantity: 1, unit_price: 140 },
    ],
    total_amount: 140,
    payment_status: "paid",
    transaction_type: "sale",
    date: todayDate,
    time: "02:05 PM",
    notes: "Doodh aur bread liya cash.",
    confidence: 96,
    source: "voice",
  },
];

export const initialTransactions: Transaction[] = [];

export const initialInventory: InventoryItem[] = [
  {
    id: "inv-1",
    name: "Rice (Chawal / Kolam)",
    currentQuantity: 8,
    unit: "kg",
    lowStockThreshold: 15,
    lastUpdated: todayDate,
  },
  {
    id: "inv-2",
    name: "Sugar (Cheeni / Sakhar)",
    currentQuantity: 25,
    unit: "kg",
    lowStockThreshold: 10,
    lastUpdated: todayDate,
  },
  {
    id: "inv-3",
    name: "Cooking Oil (Tel)",
    currentQuantity: 4,
    unit: "bottles",
    lowStockThreshold: 8,
    lastUpdated: todayDate,
  },
  {
    id: "inv-4",
    name: "Wheat Flour (Atta)",
    currentQuantity: 40,
    unit: "kg",
    lowStockThreshold: 20,
    lastUpdated: todayDate,
  },
  {
    id: "inv-5",
    name: "Toor Dal",
    currentQuantity: 6,
    unit: "kg",
    lowStockThreshold: 10,
    lastUpdated: todayDate,
  },
  {
    id: "inv-6",
    name: "Tea Powder (Chai)",
    currentQuantity: 14,
    unit: "packets",
    lowStockThreshold: 5,
    lastUpdated: todayDate,
  },
];

export const sampleVoicePhrases = [
  {
    label: "Sharma - Udhaar",
    text: "Sharma ne 200 rupaye ka saaman liya, udhaar.",
    language: "Hinglish",
  },
  {
    label: "Priya - Paid Cash",
    text: "Priya ne 500 rupaye ka grocery liya aur payment kar diya.",
    language: "Hindi",
  },
  {
    label: "Ramesh - Rice & Udhaar",
    text: "Ramesh ne 3 kilo rice liya for ₹180, abhi payment nahi kiya.",
    language: "Hinglish",
  },
  {
    label: "Pawar - Marathi Udhar",
    text: "Pawar kadun 450 rupaye cha tel aani tandul ghetla, baki ahe.",
    language: "Marathi",
  },
  {
    label: "Wholesale Supplier - Purchase",
    text: "Wholesale supplier se 2500 ka maal kharida, cash diya.",
    language: "Hindi",
  },
  {
    label: "Amit - Quick Payment",
    text: "Amit bought 2 packets of tea for 260 rupees, paid via UPI.",
    language: "English",
  },
];
