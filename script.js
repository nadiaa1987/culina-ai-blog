import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prompt-form');
    const input = document.getElementById('prompt-input');
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    const loader = document.getElementById('loader');
    const statusMsg = document.getElementById('status-msg');

    const sidebarLeft = document.getElementById('sidebar-left');
    const sidebarRight = document.getElementById('sidebar-right');

    const API_KEY = 'sk_UOsZKtGMSYNskyHUmwbWTQEdYPKv2UxR';
    const TEXT_API_BASE = 'https://gen.pollinations.ai/text/';
    const TEXT_PARAMS = `?model=gemini-fast&seed=42&key=${API_KEY}`;
    const IMAGE_API_BASE = 'https://gen.pollinations.ai/image/';
    const IMAGE_PARAMS = `?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;

    fetchRecipes();

    function setStatus(msg, type = '') {
        if (!statusMsg) return;
        statusMsg.textContent = msg;
        statusMsg.className = 'status-msg ' + type;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userPrompt = input.value.trim();
        if (!userPrompt) return;

        setStatus('Initiating SEO-Optimized Generation...');
        resultSection.classList.add('hidden');
        loader.classList.remove('hidden');
        input.blur();

        try {
            const specializedPrompt = `You are a world-class food blogger and culinary historian, an authority on Google's EEAT standards. Generate an extremely detailed, comprehensive long-form article (minimum 1500 words) about ${userPrompt} optimized for SEO 2026 and AI Search Generative Experience (SGE).
            
            Key Semantic Guidelines:
            - Use LSI keywords related to culinary science and regional history.
            - Focus on entities (ingredients, specific locations, historical figures).
            
            The structure MUST be:
            1. SEO Title: Catchy, contains current year 2026.
            2. Introduction (500 words): Cultural significance and history.
            3. [IMAGE1] Placeholder.
            4. Deep Dive (500 words): Ingredients and regional variations.
            5. [IMAGE2] Placeholder.
            6. Pairing & Presentation (300 words).
            7. [IMAGE3] Placeholder.
            8. Chef Tips (200 words).
            9. [IMAGE4] Placeholder.
            10. THE ULTIMATE RECIPE: 
                # [Recipe Title]
                ## Ingredients
                ## Step-by-Step Instructions
            11. FAQ Section (Semantic rich snippets): 3-5 common questions. Use this EXACT format:
                Q: [Question aqui?]
                A: [Answer aqui.]`;

            const textUrl = `${TEXT_API_BASE}${encodeURIComponent(specializedPrompt)}${TEXT_PARAMS}`;
            const textResponse = await fetch(textUrl);
            const text = await textResponse.text();

            if (!text || text.length < 100) throw new Error("AI returned a short response.");

            const titleMatch = text.match(/# (.*)/) || text.match(/Title: (.*)/);
            const recipeTitle = titleMatch ? titleMatch[1].trim() : userPrompt;

            const imagePrompts = [
                `Gourmet close-up shot of ${recipeTitle}, elite plating`,
                `Fresh culinary ingredients for ${recipeTitle} on dark marble`,
                `Professional kitchen action shot preparing ${recipeTitle}`,
                `Final served ${recipeTitle} meal in luxury ambient lighting`
            ];

            const imageUrls = imagePrompts.map(p => `${IMAGE_API_BASE}${encodeURIComponent(p)}${IMAGE_PARAMS}`);

            let richContent = formatMarkdown(text);
            let imagesUsed = [false, false, false, false];

            imageUrls.forEach((url, index) => {
                const placeholderRegex = new RegExp(`\\[IMAGE\\s*${index + 1}\\]`, 'gi');
                const imgHtml = `
                    <div class="article-image">
                        <img src="${url}" alt="${recipeTitle} - Visual Guide ${index + 1}">
                        <div class="image-caption">Expert Insight: ${imagePrompts[index]}</div>
                    </div>`;

                if (placeholderRegex.test(richContent)) {
                    richContent = richContent.replace(placeholderRegex, imgHtml);
                    imagesUsed[index] = true;
                }
            });

            let unusedImagesHtml = '';
            imageUrls.forEach((url, index) => {
                if (!imagesUsed[index]) {
                    unusedImagesHtml += `
                        <div class="article-image">
                            <img src="${url}" alt="${recipeTitle} gallery image">
                            <div class="image-caption">Additional View: ${imagePrompts[index]}</div>
                        </div>`;
                }
            });

            if (unusedImagesHtml) {
                richContent += `<div class="additional-images-gallery"><h4 style="margin-top:4rem; color:var(--accent-color);">Culinary Gallery</h4>${unusedImagesHtml}</div>`;
            }

            resultContent.innerHTML = richContent;
            loader.classList.add('hidden');
            resultSection.classList.remove('hidden');

            setStatus('Indexing on Cloud...');
            await saveToFirebase(recipeTitle, richContent, imageUrls[0]);
            setStatus('Article Optimized & Saved!', 'success');

            fetchRecipes();

        } catch (error) {
            console.error("CulinaAI Error:", error);
            setStatus('Error: ' + error.message, 'error');
            loader.classList.add('hidden');
        }
    });

    async function fetchRecipes() {
        if (!sidebarLeft || !sidebarRight) return;
        try {
            const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"), limit(12));
            const querySnapshot = await getDocs(q);
            sidebarLeft.innerHTML = '<h4 class="sidebar-title">Expert Picks</h4>';
            sidebarRight.innerHTML = '<h4 class="sidebar-title">Trending Now</h4>';

            let i = 0;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = 'sidebar-card';
                card.innerHTML = `<img src="${data.image}"><h5>${data.title}</h5>`;
                card.onclick = () => {
                    input.value = data.title;
                    form.dispatchEvent(new Event('submit'));
                };
                (i % 2 === 0 ? sidebarLeft : sidebarRight).appendChild(card);
                i++;
            });
        } catch (err) {
            console.warn("CulinaAI Sidebar:", err);
        }
    }

    function slugify(text) {
        return text.toString().toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    }

    async function saveToFirebase(title, content, image) {
        const slug = slugify(title);
        try {
            await addDoc(collection(db, "recipes"), {
                title: title,
                slug: slug,
                content: content,
                image: image,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Firebase Save:", e);
            throw e;
        }
    }

    function formatMarkdown(text) {
        if (!text) return "";
        return text
            // FAQ Accordion: Q: ... A: ... -> <details>
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
