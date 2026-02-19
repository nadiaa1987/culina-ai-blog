import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', async () => {
    const detailContainer = document.getElementById('recipe-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        detailContainer.innerHTML = '<p class="error">No recipe slug provided.</p>';
        return;
    }

    try {
        console.log("CulinaAI: Fetching recipe by slug:", slug);
        const q = query(collection(db, "recipes"), where("slug", "==", slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            detailContainer.innerHTML = '<p class="error">Recipe not found.</p>';
            return;
        }

        const data = querySnapshot.docs[0].data();
        renderRecipeDetail(data);
        updateSEO(data);
        injectJsonLd(data);

    } catch (err) {
        console.error("CulinaAI: Error fetching recipe details:", err);
        detailContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    }

    function updateSEO(data) {
        document.title = `${data.title} - CulinaAI Expert Guides`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', `Master the art of ${data.title}. Exclusive 1500-word guide with professional techniques, history, and secret tips.`);

        // Update OG Tags for 2026 Social Algorithms
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', data.title);
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) ogImg.setAttribute('content', data.image);
    }

    function injectJsonLd(data) {
        const schema = {
            "@context": "https://schema.org/",
            "@type": "Recipe",
            "name": data.title,
            "image": [data.image],
            "author": {
                "@type": "Organization",
                "name": "CulinaAI Expert Systems"
            },
            "datePublished": data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
            "description": `Comprehensive 1500-word gourmet guide on ${data.title}.`,
            "recipeCategory": "Gourmet",
            "keywords": `${data.title}, AI Recipe, Gourmet Food`,
            "articleBody": data.content.substring(0, 500) + "..."
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
        console.log("CulinaAI: SEO JSON-LD Injected.");
    }

    function renderRecipeDetail(data) {
        detailContainer.innerHTML = `
            <div class="result-card">
                <div class="result-header">
                    <h1 style="color: white; font-family: var(--font-heading);">${data.title}</h1>
                </div>
                <div class="image-wrapper" style="margin-bottom: 2rem;">
                    <img src="${data.image}" alt="${data.title}">
                </div>
                <div class="result-content">
                    ${formatMarkdown(data.content)}
                </div>
            </div>
        `;
    }

    function formatMarkdown(text) {
        if (!text) return "";
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
