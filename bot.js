import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fetch from "node-fetch";

// Config (Nafss l-config dyal l-site)
const firebaseConfig = {
    apiKey: "AIzaSyAAaydmg9hwlFQxUsvx0qGtquCNCG7JwWw",
    authDomain: "sediklaa-4b573.firebaseapp.com",
    projectId: "sediklaa-4b573",
    storageBucket: "sediklaa-4b573.firebasestorage.app",
    messagingSenderId: "78806755804",
    appId: "1:78806755804:web:35dc0391f7663e2838c719"
};

const FEEDS = [
    "https://www.loveandlemons.com/feed/",
    "https://betterhomebase.com/feed",
    "https://www.thecookingduo.com/feed/",
    "https://littlesunnykitchen.com/feed/",
    "https://www.chelseasmessyapron.com/feed/"
];

const API_KEY = 'sk_UOsZKtGMSYNskyHUmwbWTQEdYPKv2UxR';

// PINTEREST CONFIG (Ghadi t-ziydhoum f GitHub Secrets mn ba3d)
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_TOKEN || 'YOUR_PINTEREST_TOKEN';
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID || 'YOUR_BOARD_ID';
const SITE_URL = 'https://nadiaa1987.github.io/culina-ai-blog'; // Link d l-site dyalk

async function pinToPinterest(title, imageUrl, slug) {
    console.log(`📌 Pinning to Pinterest: ${title}`);
    try {
        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "title": title,
                "description": `Master the art of ${title}. Exclusive 1500-word gourmet guide on CulinaAI. #food #recipe #cooking`,
                "link": `${SITE_URL}/recipe.html?slug=${slug}`,
                "media_source": {
                    "source_type": "image_url",
                    "url": imageUrl
                },
                "board_id": PINTEREST_BOARD_ID
            })
        });
        const data = await response.json();
        if (data.id) {
            console.log(`✅ Pinterest Success: Pin Created (ID: ${data.id})`);
        } else {
            console.error(`❌ Pinterest Error:`, data);
        }
    } catch (err) {
        console.error(`❌ Pinterest API Failed:`, err.message);
    }
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function formatMarkdown(text) {
    return text
        .replace(/Q:\s*(.*)\n\s*A:\s*(.*)/gi, '<details><summary>$1</summary><div class="faq-answer">$2</div></details>')
        .replace(/^# (.*)/gm, '<h3>$1</h3>')
        .replace(/^## (.*)/gm, '<h4>$1</h4>')
        .replace(/\n\n/g, '<br>')
        .replace(/\n/g, '<br>');
}

async function runBot() {
    console.log("🚀 CulinaAI Bot: Starting automated run...");

    for (const feedUrl of FEEDS) {
        try {
            console.log(`📡 Fetching Feed: ${feedUrl}`);
            const rssResponse = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
            const data = await rssResponse.json();

            if (data.status !== 'ok') continue;

            // Take the latest article
            const item = data.items[0];
            console.log(`📝 Processing: ${item.title}`);

            const prompt = `Rewrite this recipe as a 1500-word gourmet masterpiece for SEO 2026: "${item.title}".
            Structure: Title, History(500w), [IMAGE1], Science(500w), [IMAGE2], Pairing(300w), [IMAGE3], Tips(200w), [IMAGE4], Full Recipe, FAQ (Q/A format).`;

            const aiUrl = `https://gen.pollinations.ai/text/${encodeURIComponent(prompt)}?model=gemini-fast&key=${API_KEY}`;
            const aiRes = await fetch(aiUrl);
            const text = await aiRes.text();

            if (text.length < 500) continue;

            const imagePrompts = [
                `Gourmet ${item.title} plating`,
                `Ingredients for ${item.title} on marble surface`,
                `Chef cooking ${item.title} action shot`,
                `Final meal ${item.title} luxury lighting`
            ];

            const imageUrls = imagePrompts.map(p => `https://gen.pollinations.ai/image/${encodeURIComponent(p)}?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`);

            let richContent = await formatMarkdown(text);
            imageUrls.forEach((url, idx) => {
                richContent = richContent.replace(`[IMAGE${idx + 1}]`, `<div class="article-image"><img src="${url}"></div>`);
            });

            const slug = item.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

            await addDoc(collection(db, "recipes"), {
                title: item.title,
                slug: slug,
                content: richContent,
                image: imageUrls[0],
                source: data.feed.title,
                createdAt: serverTimestamp()
            });

            console.log(`✅ Published: ${item.title}`);

            // 🔥 Automatical Pin to Pinterest
            await pinToPinterest(item.title, imageUrls[0], slug);
            // Wait 5s to avoid rate limits
            await new Promise(r => setTimeout(r, 5000));

        } catch (err) {
            console.error(`❌ Error on feed ${feedUrl}:`, err.message);
        }
    }
    console.log("🏁 Bot finished.");
    process.exit(0);
}

runBot();
