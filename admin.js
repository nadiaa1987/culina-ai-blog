import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAAaydmg9hwlFQxUsvx0qGtquCNCG7JwWw",
    authDomain: "sediklaa-4b573.firebaseapp.com",
    projectId: "sediklaa-4b573",
    storageBucket: "sediklaa-4b573.firebasestorage.app",
    messagingSenderId: "78806755804",
    appId: "1:78806755804:web:35dc0391f7663e2838c719",
    measurementId: "G-FRFCVEZ2Y8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FEEDS = [
    "https://www.loveandlemons.com/feed/",
    "https://betterhomebase.com/feed",
    "https://www.thecookingduo.com/feed/",
    "https://littlesunnykitchen.com/feed/",
    "https://www.chelseasmessyapron.com/feed/"
];

const API_KEY = 'sk_UOsZKtGMSYNskyHUmwbWTQEdYPKv2UxR';
const TEXT_API_BASE = 'https://gen.pollinations.ai/text/';
const TEXT_PARAMS = `?model=gemini-fast&seed=42&key=${API_KEY}`;
const IMAGE_API_BASE = 'https://gen.pollinations.ai/image/';
const IMAGE_PARAMS = `?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;

document.addEventListener('DOMContentLoaded', () => {
    const feedList = document.getElementById('feed-list');
    const logContainer = document.getElementById('log-container');
    const fetchBtn = document.getElementById('fetch-btn');
    const processBtn = document.getElementById('process-btn');
    const autoBtn = document.getElementById('auto-btn');
    const autoStatus = document.getElementById('auto-status');
    const countdown = document.getElementById('countdown');
    const queueContainer = document.getElementById('processing-queue');
    const queueItems = document.getElementById('queue-items');
    const queueCount = document.getElementById('queue-count');

    let pendingArticles = [];
    const RUN_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

    function log(msg, type = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // Render Source Feeds
    FEEDS.forEach(url => {
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.innerHTML = `<span>${url}</span><span class="pending-count" style="background:rgba(255,255,255,0.1)">Active</span>`;
        feedList.appendChild(div);
    });

    // --- AUTO MODE LOGIC ---
    function updateCountdown() {
        const lastRun = parseInt(localStorage.getItem('culina_last_run') || '0');
        const nextRun = lastRun + RUN_INTERVAL;
        const now = Date.now();
        const diff = nextRun - now;

        if (diff <= 0) {
            if (localStorage.getItem('culina_auto_mode') === 'true' && !fetchBtn.disabled) {
                countdown.textContent = "Processing now...";
                runFullSequence();
            } else {
                countdown.textContent = "Ready.";
            }
        } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            countdown.textContent = `${hours}h ${mins}m ${secs}s`;
        }
    }

    autoBtn.onclick = () => {
        const isActive = localStorage.getItem('culina_auto_mode') === 'true';
        if (isActive) {
            localStorage.setItem('culina_auto_mode', 'false');
            autoBtn.textContent = "Enable Auto-Mode (24h)";
            autoStatus.style.display = 'none';
        } else {
            localStorage.setItem('culina_auto_mode', 'true');
            if (!localStorage.getItem('culina_last_run')) {
                localStorage.setItem('culina_last_run', (Date.now() - RUN_INTERVAL + 10000).toString()); // Start in 10s
            }
            autoBtn.textContent = "Disable Auto-Mode";
            autoStatus.style.display = 'block';
            log("Auto-Mode Enabled. Site will check feeds every 24h.", "info");
        }
    };

    if (localStorage.getItem('culina_auto_mode') === 'true') {
        autoBtn.textContent = "Disable Auto-Mode";
        autoStatus.style.display = 'block';
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    async function runFullSequence() {
        log("AUTO-RUN: Starting scheduled sequence...", "info");
        // Update last run immediately to avoid multiple triggers
        localStorage.setItem('culina_last_run', Date.now().toString());
        await fetchAllFeeds();
        if (pendingArticles.length > 0) {
            await startProcessing();
        }
        log("AUTO-RUN: Sequence finished.", "info");
    }

    // --- BUTTON HANDLERS ---
    fetchBtn.onclick = fetchAllFeeds;
    processBtn.onclick = startProcessing;

    async function fetchAllFeeds() {
        log("Starting RSS Fetch sequence...", "info");
        pendingArticles = [];
        fetchBtn.disabled = true;

        for (const url of FEEDS) {
            try {
                log(`Fetching: ${url}`);
                const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.status === 'ok') {
                    data.items.slice(0, 2).forEach(item => {
                        pendingArticles.push({
                            title: item.title,
                            originalUrl: item.link,
                            source: data.feed.title
                        });
                    });
                    log(`Success: Found items from ${data.feed.title}`);
                }
            } catch (err) {
                log(`Error fetching ${url}: ${err.message}`, "error");
            }
        }

        if (pendingArticles.length > 0) {
            log(`Total articles queued: ${pendingArticles.length}`, "info");
            renderQueue();
            processBtn.style.display = 'block';
            queueContainer.style.display = 'block';
        }
        fetchBtn.disabled = false;
    }

    function renderQueue() {
        queueItems.innerHTML = '';
        queueCount.textContent = pendingArticles.length;
        pendingArticles.forEach((art, i) => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            div.style.background = 'rgba(99, 102, 241, 0.1)';
            div.innerHTML = `<span><strong>${art.source}</strong>: ${art.title}</span><span id="status-${i}" style="font-size:0.8rem; opacity:0.7;">Pending</span>`;
            queueItems.appendChild(div);
        });
    }

    async function startProcessing() {
        processBtn.disabled = true;
        log("Starting Mega AI Rewrite Session...", "info");

        for (let i = 0; i < pendingArticles.length; i++) {
            const art = pendingArticles[i];
            const statusLabel = document.getElementById(`status-${i}`);
            if (!statusLabel) continue;

            statusLabel.textContent = "Writing...";
            log(`Processing Article ${i + 1}/${pendingArticles.length}: ${art.title}`);

            try {
                await generateAndSave(art);
                statusLabel.textContent = "Completed ✅";
                statusLabel.style.color = "#10b981";
            } catch (err) {
                log(`Failed ${art.title}: ${err.message}`, "error");
                statusLabel.textContent = "Failed ❌";
                statusLabel.style.color = "#ef4444";
            }
            // Wait between articles
            await new Promise(r => setTimeout(r, 3000));
        }

        log("ALL PROCESSES FINISHED.", "info");
        processBtn.disabled = false;
    }

    async function generateAndSave(art) {
        const prompt = `You are a world-class food blogger, authority on Google EEAT standards. Generate an extremely detailed, high-quality long-form article (minimum 1500 words) based on the recipe idea: "${art.title}". 
        
        The structure MUST be:
        1. SEO Title with "2026"
        2. Introduction (500 words): History and origins.
        3. [IMAGE1]
        4. Deep Dive (500 words): Flavor chemistry and ingredients.
        5. [IMAGE2]
        6. Pairing & Presentation (300 words).
        7. [IMAGE3]
        8. Chef secret techniques (200 words).
        9. [IMAGE4]
        10. THE RECIPE: # [Title] ## Ingredients ## Instructions
        11. FAQ Section (Q: ... A: ...)
        
        Write in a verbose, upscale, and mouth-watering tone.`;

        const textUrl = `${TEXT_API_BASE}${encodeURIComponent(prompt)}${TEXT_PARAMS}`;
        const response = await fetch(textUrl);
        const text = await response.text();

        if (!text || text.length < 500) throw new Error("AI output too short.");

        const imagePrompts = [
            `Gourmet close-up of ${art.title}, professional plating`,
            `Fresh ingredients for ${art.title} on marble table`,
            `Chef's hands preparing ${art.title}, cinematic action`,
            `Final served ${art.title} meal, warm ambient lighting`
        ];
        const imageUrls = imagePrompts.map(p => `${IMAGE_API_BASE}${encodeURIComponent(p)}${IMAGE_PARAMS}`);

        let richContent = formatMarkdown(text);
        imageUrls.forEach((url, idx) => {
            const placeholder = `[IMAGE${idx + 1}]`;
            const imgHtml = `<div class="article-image"><img src="${url}"><div class="image-caption">Visual: ${imagePrompts[idx]}</div></div>`;
            richContent = richContent.replace(new RegExp(`\\[IMAGE\\s*${idx + 1}\\]`, 'gi'), imgHtml);
        });

        const slug = art.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').substring(0, 50);
        await addDoc(collection(db, "recipes"), {
            title: art.title,
            slug: slug,
            content: richContent,
            image: imageUrls[0],
            source: art.source,
            originalUrl: art.originalUrl,
            createdAt: serverTimestamp()
        });

        log(`Saved to Firebase: ${art.title}`, "info");
    }

    function formatMarkdown(text) {
        return text
            .replace(/Q:\s*(.*)\n\s*A:\s*(.*)/gi, '<details><summary>$1</summary><div class="faq-answer">$2</div></details>')
            .replace(/^# (.*)/gm, '<h3>$1</h3>')
            .replace(/^## (.*)/gm, '<h4>$1</h4>')
            .replace(/^\*\* (.*)/gm, '<strong>$1</strong>')
            .replace(/^- (.*)/gm, '<li>$1</li>')
            .replace(/^\d\. (.*)/gm, '<li>$1</li>')
            .replace(/\n\n/g, '<br>')
            .replace(/\n/g, '<br>');
    }
});
