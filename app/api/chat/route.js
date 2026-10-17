import db from "../../../lib/db.js";
import { products as staticProducts } from "../../../lib/products.js";

// Popular recipes & item mappings for smart AI recommendations
const RECIPES = {
  "dal tadka": ["Toor Dal", "Ghee", "Turmeric", "Cumin Seeds", "Mustard Seeds", "Red Chili Powder"],
  "veg biryani": ["Rice", "Ghee", "Cumin Seeds", "Cardamom", "Cloves", "Cinnamon", "Bay Leaves", "Star Anise"],
  "biryani": ["Rice", "Ghee", "Cumin Seeds", "Cardamom", "Cloves", "Cinnamon", "Bay Leaves", "Star Anise"],
  "dal": ["Toor Dal", "Moong Dal", "Masoor Dal", "Ghee", "Turmeric", "Cumin Seeds"],
  "tadka": ["Toor Dal", "Ghee", "Turmeric", "Cumin Seeds", "Mustard Seeds"],
  "rice": ["Rice", "Brown Rice", "Poha", "Ghee"],
  "tea": ["Tea Powder", "Milk", "Sugar"],
  "chai": ["Tea Powder", "Milk", "Sugar"],
  "coffee": ["Coffee Powder", "Milk", "Sugar"],
  "poha": ["Poha", "Mustard Seeds", "Peanuts", "Turmeric"],
  "paneer": ["Paneer", "Ghee", "Butter", "Turmeric", "Red Chili Powder", "Cumin Seeds"],
  "breakfast": ["Oats", "Milk", "Poha", "Bread", "Butter", "Eggs", "Tea Powder"],
  "healthy": ["Brown Rice", "Oats", "Olive Oil", "Green Tea", "Almonds"],
  "snack": ["Potato Chips", "Mixture", "Sev", "Namkeen", "Popcorn", "Biscuits"],
  "cleaning": ["Detergent Powder", "Dishwash Bar", "Floor Cleaner", "Toilet Cleaner", "Soap"]
};

// Response templates per language for common intent matches (English, Hindi, Kannada, Malayalam, Tamil, Telugu)
const INTENT_RESPONSES = {
  en: {
    recipe: (name) => `Here are the essential ingredients available in SmartGrocer for making **${name}**:`,
    budget: (amt) => `Here are popular products available for under **₹${amt}**:`,
    category: (cat) => `Here are our top products in **${cat}**:`,
    general: "Here are matching products from our store catalog:",
    noMatch: "I couldn't find exact items matching your query in our inventory, but here are some popular everyday essentials you might like:"
  },
  hi: {
    recipe: (name) => `SmartGrocer पर **${name}** बनाने के लिए आवश्यक सामग्री यहाँ उपलब्ध है:`,
    budget: (amt) => `**₹${amt}** से कम कीमत में उपलब्ध प्रमुख उत्पाद:`,
    category: (cat) => `**${cat}** श्रेणी के लोकप्रिय उत्पाद:`,
    general: "हमारी दुकान की सूची से आपके लिए उत्पाद:",
    noMatch: "मुझे आपकी खोज से मेल खाते सटीक उत्पाद नहीं मिले, लेकिन यहाँ कुछ लोकप्रिय दैनिक उपयोग की सामग्री है:"
  },
  kn: {
    recipe: (name) => `SmartGrocer ನಲ್ಲಿ **${name}** ಮಾಡಲು ಬೇಕಾಗುವ ಮುಖ್ಯ ಪದಾರ್ಥಗಳು:`,
    budget: (amt) => `**₹${amt}** ಕ್ಕಿಂತ ಕಡಿಮೆ ಬೆಲೆಯಲ್ಲಿ ಲಭ್ಯವಿರುವ ಜನಪ್ರಿಯ ಉತ್ಪನ್ನಗಳು:`,
    category: (cat) => `**${cat}** ವಿಭಾಗದ ಪ್ರಮುಖ ಉತ್ಪನ್ನಗಳು:`,
    general: "ನಮ್ಮ ಅಂಗಡಿಯ ಲಭ್ಯವಿರುವ ಉತ್ಪನ್ನಗಳು:",
    noMatch: "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ನಿಖರ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ, ಆದರೆ ಕೆಲವು ಜನಪ್ರಿಯ ವಸ್ತುಗಳು ಇಲ್ಲಿವೆ:"
  },
  ml: {
    recipe: (name) => `SmartGrocer-ൽ **${name}** ഉണ്ടാക്കാൻ ആവശ്യമായ പ്രധാന സാധനങ്ങൾ:`,
    budget: (amt) => `**₹${amt}**-ൽ താഴെ വിലയുള്ള ജനപ്രിയ ഉൽപ്പന്നങ്ങൾ:`,
    category: (cat) => `**${cat}** വിഭാഗത്തിലെ മികച്ച ഉൽപ്പന്നങ്ങൾ:`,
    general: "ഞങ്ങളുടെ സ്റ്റോറിൽ ലഭ്യമായ ഉൽപ്പന്നങ്ങൾ:",
    noMatch: "നിങ്ങൾ തിരഞ്ഞ ഉൽപ്പന്നങ്ങൾ കണ്ടുകിട്ടിയില്ല, എങ്കിലും ചില ജനപ്രിയ സാധനങ്ങൾ ഇതാ:"
  },
  ta: {
    recipe: (name) => `SmartGrocer இல் **${name}** செய்ய தேவையான பொருட்கள்:`,
    budget: (amt) => `**₹${amt}** க்கும் குறைவான விலையில் உள்ள பொருட்கள்:`,
    category: (cat) => `**${cat}** பிரிவில் உள்ள சிறந்த பொருட்கள்:`,
    general: "எங்கள் கடையில் உள்ள பொருட்கள்:",
    noMatch: "உங்கள் தேடலுக்கு ஏற்ற பொருட்கள் கிடைக்கவில்லை, ஆனால் சில பிரபலமான பொருட்கள் இதோ:"
  },
  te: {
    recipe: (name) => `SmartGrocer లో **${name}** తయారు చేయడానికి కావలసిన పదార్థాలు:`,
    budget: (amt) => `**₹${amt}** కంటే తక్కువ ధరలోని ప్రసిద్ధ ఉత్పత్తులు:`,
    category: (cat) => `**${cat}** కేటగిరీలో లభించే ఉత్పత్తులు:`,
    general: "మా స్టోర్ క్యాటలాగ్ నుండి ఉత్పత్తులు:",
    noMatch: "ఖచ్చితమైన ఉత్పత్తులు దొరకలేదు, కానీ ఇక్కడ కొన్ని ప్రముఖ సరుకులు ఉన్నాయి:"
  }
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, lang = "en", storeName } = body;

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const targetStore = storeName || "SmartGrocer Central";
    let products = await db
      .prepare("SELECT * FROM products WHERE (store_name = ? OR store_name IS NULL) AND (visible IS NULL OR visible = 1)")
      .all(targetStore);

    if (!products || products.length === 0) {
      products = staticProducts;
    }

    const query = message.toLowerCase().trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini API if key is configured
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const catalogSummary = products.map(p => `${p.name} (₹${p.price}/${p.unit}, ${p.category})`).join(", ");
        const systemPrompt = `You are SmartGrocer AI Assistant, an expert friendly grocery shopping bot for a local store.
Store Inventory: ${catalogSummary}.
Deliveries: Home delivery (+₹30) and free Store Pickup.
Current User Language: ${lang}.
Instructions: Answer succinctly and helpfully in language code '${lang}'. Recommend specific items available in our store inventory.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              { role: "user", parts: [{ text: message }] }
            ]
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText) {
            const matchedProds = products.filter(p => 
              query.includes(p.name.toLowerCase()) || 
              aiText.toLowerCase().includes(p.name.toLowerCase())
            ).slice(0, 6);
            return Response.json({ text: aiText, products: matchedProds.length > 0 ? matchedProds : products.slice(0, 4) });
          }
        }
      } catch (err) {
        console.warn("Gemini API skipped or timed out, falling back to local engine:", err?.message || err);
      }
    }

    // Local Catalog Search & Intelligence Engine
    const langDict = INTENT_RESPONSES[lang] || INTENT_RESPONSES.en;
    let replyText = "";
    let matchedProds = [];

    // 1. Check budget queries
    const budgetMatch = query.match(/(?:under|below|less than|कम|नीचे|ಕಡಿಮೆ|താഴെ|కంటే తక్కువ|குறைவான|₹|\$)?\s*(\d+)/i);
    if (query.includes("under") || query.includes("below") || query.includes("less") || query.includes("कम") || query.includes("ಕಡಿಮೆ") || query.includes("താഴെ") || query.includes("తక్కువ") || query.includes("குறைவான")) {
      const maxPrice = budgetMatch ? parseInt(budgetMatch[1], 10) : 100;
      matchedProds = products.filter(p => p.price <= maxPrice).slice(0, 6);
      replyText = langDict.budget(maxPrice);
    }
    // 2. Check recipe matches (sorted by key length descending so longer matches like "dal tadka" match first)
    else {
      let matchedRecipeKey = null;
      const recipeKeys = Object.keys(RECIPES).sort((a, b) => b.length - a.length);
      for (const recipeKey of recipeKeys) {
        if (query.includes(recipeKey)) {
          matchedRecipeKey = recipeKey;
          break;
        }
      }

      if (matchedRecipeKey) {
        const itemNames = RECIPES[matchedRecipeKey];
        matchedProds = products.filter(p => 
          itemNames.some(name => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase()))
        ).slice(0, 6);
        replyText = langDict.recipe(matchedRecipeKey.toUpperCase());
      } else {
        // 3. Keyword / Category search in products
        matchedProds = products.filter(p => 
          query.includes(p.name.toLowerCase()) || 
          query.includes(p.category.toLowerCase()) ||
          p.name.toLowerCase().split(" ").some(word => word.length > 2 && query.includes(word))
        ).slice(0, 6);

        if (matchedProds.length > 0) {
          replyText = langDict.general;
        } else {
          matchedProds = products.slice(0, 4);
          replyText = langDict.noMatch;
        }
      }
    }

    return Response.json({
      text: replyText,
      products: matchedProds
    });

  } catch (error) {
    console.error("Chatbot API error:", error);
    return Response.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}

