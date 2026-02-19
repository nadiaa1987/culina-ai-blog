import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    console.log("CulinaAI Blog: Initializing...");
    const blogGrid = document.getElementById('blog-grid');
    const blogLoader = document.getElementById('blog-loader');
    const modal = document.getElementById('recipe-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.close-modal');

    async function loadRecipes() {
        try {
            console.log("CulinaAI Blog: Fetching all recipes...");

            let q;
            try {
                // Try ordering by date first
                q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                renderRecipes(querySnapshot);
            } catch (orderError) {
                console.warn("CulinaAI Blog: Order by failed (maybe index missing). Falling back.", orderError);
                q = query(collection(db, "recipes"));
                const querySnapshot = await getDocs(q);
                renderRecipes(querySnapshot);
            }

        } catch (err) {
            console.error("CulinaAI Blog: Error loading recipes:", err);
            blogLoader.classList.add('hidden');
            blogGrid.innerHTML = `<div class="no-recipes">
                <p class="error">Mouchkil f t7mil l-wasafat: ${err.message}</p>
                <a href="index.html" class="view-recipe-btn" style="display:inline-block; margin-top:1rem; width:auto;">Go Home</a>
            </div>`;
        }
    }

    function renderRecipes(querySnapshot) {
        blogLoader.classList.add('hidden');
        blogGrid.innerHTML = '';

        if (querySnapshot.empty) {
            blogGrid.innerHTML = `
                <div class="no-recipes">
                    <p>Makayan hta wasafa hna mazal.</p>
                    <a href="index.html" class="view-recipe-btn" style="display:inline-block; margin-top:1.5rem; width:auto;">Sér l-Home o generer chi we7da</a>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = createCard(data);
            blogGrid.appendChild(card);
        });
    }

    function createCard(data) {
        const slug = data.slug || "";
        const article = document.createElement('article');
        article.className = 'blog-card';
        article.innerHTML = `
            <a href="recipe.html?slug=${slug}" style="text-decoration: none; color: inherit;">
                <div class="blog-card-image">
                    <img src="${data.image}" alt="${data.title}">
                </div>
                <div class="blog-card-content">
                    <h3 style="margin-bottom: 1rem;">${data.title}</h3>
                    <span class="view-recipe-btn">View Recipe Details</span>
                </div>
            </a>
        `;
        return article;
    }

    function showModal(data) {
        modalBody.innerHTML = `
            <div class="modal-recipe-header">
                <h2>${data.title}</h2>
                <img src="${data.image}" class="modal-img">
            </div>
            <div class="modal-recipe-content">
                ${formatMarkdown(data.content)}
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
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

    closeModal.onclick = () => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    };

    window.onclick = (e) => { if (e.target == modal) closeModal.onclick(); };

    loadRecipes();
});
