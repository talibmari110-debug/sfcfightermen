// Extra page features are kept in one file so they are easy to find and edit.
const fandomCategories = [
    { id: "anime", name: "Anime" }, { id: "gaming", name: "Gaming" },
    { id: "movies", name: "Movies" }, { id: "tv-shows", name: "TV Shows" },
    { id: "kpop", name: "K-Pop" }, { id: "comics", name: "Comics" }, { id: "manga", name: "Manga" }
];

function safeText(value) {
    return String(value || "").replace(/[&<>"']/g, function (letter) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[letter];
    });
}

function getSavedList(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch (error) { return []; }
}

function getCategoryName(id) {
    const category = fandomCategories.find(function (item) { return item.id === id; });
    return category ? category.name : "Fandom";
}

function getCategoryImage(id) {
    const pictures = {
        anime: "images/ANIME-30.webp", gaming: "images/ps5-11.jpg",
        movies: "images/movie-1.jpg", "tv-shows": "images/movie-6.jpg",
        kpop: "images/ANIME-4.webp", comics: "images/comix-11.jpg",
        all: "images/logo.png",
        manga: "images/ANIME-9.webp"
    };
    return pictures[id] || "images/logo.png";
}

/* ==========================================================================
   User Authentication & Multi-User LocalStorage Management
   ========================================================================== */
function getUsers() {
    try {
        const users = JSON.parse(localStorage.getItem("fandom_users") || "[]");
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem("fandom_users", JSON.stringify(users));
}

function getCurrentUser() {
    try {
        const user = JSON.parse(localStorage.getItem("fandom_currentUser"));
        return (user && user.email) ? user : null;
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem("fandom_currentUser", JSON.stringify(user));
    updateAuthUI();
}

function initDefaultUsers() {
    const users = getUsers();
    if (!users.length) {
        const defaultUsers = [
            {
                id: "user_demo_1",
                name: "Alex Mercer",
                email: "alex@fandomverse.com",
                password: "Password123!",
                registeredAt: "2026-10-01T10:00:00.000Z"
            }
        ];
        saveUsers(defaultUsers);
    }
}

function updateAuthUI() {
    const user = getCurrentUser();
    const loginGroup = $("#loginGroup");
    if (!loginGroup.length) return;

    if (user && user.name) {
        loginGroup.html(`
            <div class="user-greeting">
                <i class="fa-solid fa-circle-user purple-text fs-5" aria-hidden="true"></i>
                <span class="text-white fw-bold">Hi, ${safeText(user.name)}</span>
                <button id="logoutBtn" type="button" class="logout-button ms-2">
                    <i class="fa-solid fa-arrow-right-from-bracket me-1" aria-hidden="true"></i>Logout
                </button>
            </div>
        `);
    } else {
        loginGroup.html(`
            <a href="?page=login" data-page="login" class="login-button">Login</a>
            <a href="?page=register" data-page="register" class="signup-button">Sign Up</a>
        `);
    }
}

$(document).on("click", "#logoutBtn", function () {
    localStorage.removeItem("fandom_currentUser");
    updateAuthUI();
    if (typeof FandomAlert !== "undefined") { FandomAlert.success("Logged Out", "You have been logged out successfully."); } else { showSiteAlert("Logged out successfully."); }
    const params = new URLSearchParams(window.location.search);
    if (params.get("page") === "cart") {
        loadCartPage();
    }
});

function addBookmark(id, title, kind) {
    const user = getCurrentUser();
    if (!user) {
        if (typeof FandomAlert !== "undefined" && FandomAlert.authRequired) {
            FandomAlert.authRequired("Login Required", "Please sign in or register to save bookmarks!");
        } else {
            window.location.href = "?page=login";
        }
        return false;
    }

    const saved = getSavedList("fandom_bookmarks");
    if (!saved.some(function (item) { return item.id === id; })) {
        saved.push({ id: id, title: title, kind: kind || "content" });
        localStorage.setItem("fandom_bookmarks", JSON.stringify(saved));
    }
    if (typeof FandomAlert !== "undefined") {
        FandomAlert.toast("Saved to your Bookmarks!", "success");
    } else {
        alert("Saved in your Bookmarks.");
    }
    return true;
}

function showDetail(title, description, image, extra) {
    $("#modalTitle").text(title);
    $("#modalBody").html('<div class="detail-view">' + (image ? '<img src="' + safeText(image) + '" alt="">' : '') + '<div><p>' + safeText(description) + '</p><p>' + safeText(extra) + '</p></div></div>');
    const modal = document.getElementById("detailModal");
    if (modal) new bootstrap.Modal(modal).show();
}

let categoryData = null;
let categoryItems = [];
let selectedCategory = "all";

function populateCategoryTags() {
    const tagSelect = $("#FilterTag");
    if (!tagSelect.length) return;
    const currentTag = tagSelect.val() || "all";

    const categoryTags = [];
    categoryItems.filter(function (item) {
        return selectedCategory === "all" || item.category === selectedCategory;
    }).forEach(function (item) {
        (item.tags || []).forEach(function (itemTag) {
            if (itemTag && !categoryTags.includes(itemTag)) categoryTags.push(itemTag);
        });
    });

    let optionsHtml = '<option value="all">All tags</option>';
    categoryTags.sort().forEach(function (itemTag) {
        optionsHtml += '<option value="' + safeText(itemTag) + '">' + safeText(itemTag) + '</option>';
    });
    tagSelect.html(optionsHtml);
    if (categoryTags.includes(currentTag)) {
        tagSelect.val(currentTag);
    } else {
        tagSelect.val("all");
    }
}

function loadCategoryData(urlParams) {
    const params = urlParams || new URLSearchParams(window.location.search);
    selectedCategory = params.get("type") || "all";
    const searchQuery = params.get("search") || "";

    const displayTitle = selectedCategory === "all" ? "All Fandoms" : getCategoryName(selectedCategory);
    $("#CategoryTitle").html(safeText(displayTitle) + ' <span class="text-purple">Hub</span>');
    $("#CategoryPills button").removeClass("active").filter('[data-cat="' + selectedCategory + '"]').addClass("active");
    $("#FilterSearch").val(searchQuery);
    if (searchQuery) {
        $("#globalSearchInput").val(searchQuery);
    }

    function buildAndRender() {
        categoryItems = [];
        (categoryData.contentCards || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.title,
                description: item.shortDescription || item.description,
                image: item.thumbnail,
                category: item.category,
                type: item.contentType || "article",
                tags: item.tags || [],
                date: item.date || "",
                popularity: item.popularity || 0,
                details: item.description || item.shortDescription,
                kind: "content"
            });
        });
        (categoryData.trailersAndMedia || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.title,
                description: item.description,
                image: item.thumbnail,
                category: item.category,
                type: item.contentType === "audio" || item.contentType === "podcast" ? "audio" : "video",
                tags: [item.contentType || "trailer", item.category],
                date: item.date || "",
                popularity: item.views || 0,
                details: item.description,
                kind: "media",
                link: item.embedUrl
            });
        });
        (categoryData.audioClips || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.title,
                description: item.description,
                image: item.image || "",
                category: item.category,
                type: "audio",
                tags: ["audio", "soundtrack", item.category],
                date: item.date || "",
                popularity: 50,
                details: item.description,
                kind: "audio",
                link: item.audioUrl
            });
        });
        (categoryData.imageGalleries || []).forEach(function (gallery) {
            (gallery.images || []).forEach(function (image, index) {
                categoryItems.push({
                    id: gallery.category + "-gallery-" + index,
                    title: image.title,
                    description: "Image from the " + getCategoryName(gallery.category) + " gallery.",
                    image: image.image,
                    category: gallery.category,
                    type: "gallery",
                    tags: ["gallery", "artwork", gallery.category],
                    date: "2026-09-25",
                    popularity: 60,
                    details: image.title,
                    kind: "gallery"
                });
            });
        });
        (categoryData.characterProfiles || []).forEach(function (person) {
            categoryItems.push({
                id: person.id,
                title: person.name,
                description: person.biography,
                image: person.image,
                category: person.category,
                type: "character",
                tags: (person.traits || []).concat([person.series, person.category]),
                date: "",
                popularity: 70,
                details: person.biography + " Series: " + person.series,
                kind: "character"
            });
        });
        (categoryData.eventHighlights || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.title,
                description: item.description,
                image: item.image || "",
                category: item.associatedCategory,
                type: "event",
                tags: [item.location, item.associatedCategory, "event"],
                date: item.date,
                popularity: 40,
                details: item.description + " Location: " + item.location,
                kind: "event"
            });
        });
        (categoryData.merchandiseShowcase || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.name,
                description: item.shortDescription,
                image: item.image,
                category: item.category || "anime",
                type: "merchandise",
                tags: [item.priceRange, item.category || "anime", "merch"],
                date: "",
                popularity: 80,
                details: item.shortDescription + " Price: " + item.priceRange,
                kind: "merch"
            });
        });
        (categoryData.upcomingReleases || []).forEach(function (item) {
            categoryItems.push({
                id: item.id,
                title: item.title,
                description: item.description,
                image: item.image || "",
                category: item.category,
                type: "release",
                tags: [item.category, "release"],
                date: item.date,
                popularity: 30,
                details: item.description + " Date: " + item.date,
                kind: "release"
            });
        });

        populateCategoryTags();
        renderCategoryItems();
        renderCategoryPeople();
        renderCategoryGallery();
    }

    if (categoryData) {
        buildAndRender();
    } else {
        $.getJSON("data.json", function (data) {
            categoryData = data;
            buildAndRender();
        }).fail(function () {
            $("#CategoryListingGrid").html('<p class="text-warning">Could not load the fandom data. Start this site with a local web server.</p>');
        });
    }

    // Category pills click handler
    $("#CategoryPills button").off("click").on("click", function () {
        selectedCategory = $(this).data("cat") || "all";
        $("#CategoryPills button").removeClass("active");
        $(this).addClass("active");
        const title = selectedCategory === "all" ? "All Fandoms" : getCategoryName(selectedCategory);
        $("#CategoryTitle").html(safeText(title) + ' <span class="text-purple">Hub</span>');
        populateCategoryTags();
        renderCategoryItems();
        renderCategoryPeople();
        renderCategoryGallery();
    });

    // Real-time search, type, tag and sort handlers
    $("#FilterSearch, #FilterType, #FilterTag, #SortBy").off("input change").on("input change", function () {
        renderCategoryItems();
        renderCategoryPeople();
        renderCategoryGallery();
    });

    // View toggle handler
    $("[data-view]").off("click").on("click", function () {
        const view = $(this).data("view");
        $("[data-view]").removeClass("active");
        $(this).addClass("active");
        $("#ContentSection, #CharacterSection, #GallerySection").hide();
        if (view === "characters") $("#CharacterSection").show();
        else if (view === "gallery") $("#GallerySection").show();
        else $("#ContentSection").show();
    });

    // Detail modal handler
    $(document).off("click", "[data-open-detail]").on("click", "[data-open-detail]", function () {
        const itemId = $(this).data("open-detail");
        const item = categoryItems.find(function (entry) { return entry.id === itemId; });
        if (item) {
            const related = categoryItems.filter(function (entry) { return entry.category === item.category && entry.id !== item.id; }).slice(0, 2).map(function (entry) { return entry.title; }).join(" · ");
            showDetail(item.title, item.details || item.description, item.image, (item.category ? getCategoryName(item.category) + " · " + item.type : item.type) + (related ? " · Related: " + related : ""));
        }
    });

    // Save item bookmark handler
    $(document).off("click", "[data-save-item]").on("click", "[data-save-item]", function () {
        const itemId = $(this).data("save-item");
        const item = categoryItems.find(function (entry) { return entry.id === itemId; });
        if (item) addBookmark(item.id, item.title, item.kind);
    });

    // Gallery image modal handler
    $(document).off("click", "[data-gallery-image]").on("click", "[data-gallery-image]", function () {
        $("#imageModalTitle").text($(this).data("title"));
        $("#largeGalleryImage").attr({ src: $(this).data("gallery-image"), alt: $(this).data("title") });
        new bootstrap.Modal(document.getElementById("imageModal")).show();
    });
}

function resetCategoryFilters() {
    $("#FilterSearch").val("");
    $("#FilterType").val("all");
    $("#FilterTag").val("all");
    $("#SortBy").val("newest");
    renderCategoryItems();
    renderCategoryPeople();
    renderCategoryGallery();
}
window.resetCategoryFilters = resetCategoryFilters;

function renderCategoryItems() {
    if (!categoryData) return;
    const word = String($("#FilterSearch").val() || "").toLowerCase().trim();
    const type = $("#FilterType").val() || "all";
    const tag = $("#FilterTag").val() || "all";

    let items = categoryItems.filter(function (item) {
        const rightCategory = (selectedCategory === "all" || item.category === selectedCategory);
        const rightType = (type === "all" || item.type === type);
        const rightTag = (tag === "all" || (item.tags && item.tags.includes(tag)));
        const searchable = (
            (item.title || "") + " " +
            (item.description || "") + " " +
            (item.category || "") + " " +
            (item.type || "") + " " +
            ((item.tags || []).join(" "))
        ).toLowerCase();
        const matchesWord = !word || searchable.includes(word);
        return rightCategory && rightType && rightTag && matchesWord;
    });

    const sort = $("#SortBy").val() || "newest";
    if (sort === "alphabetical") {
        items.sort(function (a, b) { return (a.title || "").localeCompare(b.title || ""); });
    } else if (sort === "popularity") {
        items.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); });
    } else if (sort === "newest") {
        items.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    }

    if (!items.length) {
        $("#CategoryListingGrid").html(`
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-magnifying-glass fa-3x text-muted mb-3"></i>
                <h4 class="text-white fw-bold">No matching content found</h4>
                <p class="text-muted">Try adjusting your search query, type filter, or tag.</p>
                <button type="button" class="btn btn-sm btn-outline-purple" onclick="resetCategoryFilters()">
                    Reset Filters
                </button>
            </div>
        `);
        return;
    }

    let html = "";
    items.forEach(function (item) {
        const fallbackImg = getCategoryImage(item.category);
        const itemImg = item.image || fallbackImg;
        const tagText = safeText(getCategoryName(item.category)) + " · " + safeText(item.type);

        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <article class="content-card h-100">
                    <img class="card-img-top" src="${safeText(itemImg)}" alt="${safeText(item.title)}" onerror="this.onerror=null;this.src='${safeText(fallbackImg)}'">
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <span class="content-tag">${tagText}</span>
                            <h3>${safeText(item.title)}</h3>
                            <p>${safeText(item.description)}</p>
                            ${item.type === "audio" && item.link ? `<audio class="audio-player mt-2" controls preload="none" src="${safeText(item.link)}">Your browser does not support audio.</audio>` : ""}
                        </div>
                        <div class="card-buttons mt-3">
                            ${item.type === "article"
                                ? `<a class="simple-button" href="?page=article&id=${encodeURIComponent(item.id)}" data-page="article">Open article</a>`
                                : `<button class="simple-button" data-open-detail="${safeText(item.id)}">Read more</button>`
                            }
                            ${item.kind === "merch"
                                ? `<button class="simple-button quiet-button" onclick="addToCart('${safeText(item.id)}')"><i class="fa-solid fa-cart-plus me-1"></i>Cart</button>`
                                : `<button class="simple-button quiet-button" data-save-item="${safeText(item.id)}"><i class="fa-regular fa-bookmark me-1"></i>Save</button>`
                            }
                        </div>
                    </div>
                </article>
            </div>
        `;
    });
    $("#CategoryListingGrid").html(html);
}

function renderCategoryPeople() {
    if (!categoryData) return;
    const word = String($("#FilterSearch").val() || "").toLowerCase().trim();
    let people = (categoryData.characterProfiles || []).filter(function (person) {
        const rightCategory = selectedCategory === "all" || person.category === selectedCategory;
        const matchesWord = !word || (
            person.name.toLowerCase().includes(word) ||
            person.series.toLowerCase().includes(word) ||
            person.biography.toLowerCase().includes(word) ||
            (person.traits || []).some(t => t.toLowerCase().includes(word))
        );
        return rightCategory && matchesWord;
    });

    if (!people.length) {
        $("#CharacterListingGrid").html('<div class="col-12 text-center py-4"><p class="text-muted">No characters match your search criteria.</p></div>');
        return;
    }

    let html = "";
    people.forEach(function (person) {
        const fallbackImg = getCategoryImage(person.category);
        const personImg = person.image || fallbackImg;
        html += `
            <div class="col-6 col-md-4 col-lg-3">
                <article class="person-card">
                    <img src="${safeText(personImg)}" alt="${safeText(person.name)}" onerror="this.onerror=null;this.src='${safeText(fallbackImg)}'">
                    <h4>${safeText(person.name)}</h4>
                    <p>${safeText(person.series)}</p>
                    <button class="simple-button" data-person-id="${safeText(person.id)}">Profile</button>
                    <button class="simple-button quiet-button" data-person-save="${safeText(person.id)}">Save</button>
                </article>
            </div>
        `;
    });
    $("#CharacterListingGrid").html(html);
    $(document).off("click", "[data-person-id]").on("click", "[data-person-id]", function () {
        const person = categoryData.characterProfiles.find(function (item) { return item.id === $(this).data("person-id"); }.bind(this));
        if (person) showDetail(person.name, person.biography, person.image, person.series + " · Traits: " + (person.traits || []).join(", "));
    });
    $(document).off("click", "[data-person-save]").on("click", "[data-person-save]", function () {
        const person = categoryData.characterProfiles.find(function (item) { return item.id === $(this).data("person-save"); }.bind(this));
        if (person) addBookmark(person.id, person.name, "character");
    });
}

function renderCategoryGallery() {
    if (!categoryData) return;
    const word = String($("#FilterSearch").val() || "").toLowerCase().trim();
    let galleries = (categoryData.imageGalleries || []).filter(function (item) {
        return selectedCategory === "all" || item.category === selectedCategory;
    });

    let html = "";
    galleries.forEach(function (gallery) {
        (gallery.images || []).forEach(function (image) {
            if (!word || image.title.toLowerCase().includes(word) || gallery.category.toLowerCase().includes(word)) {
                html += `
                    <div class="col-6 col-md-4">
                        <button class="gallery-tile" data-gallery-image="${safeText(image.image)}" data-title="${safeText(image.title)}">
                            <img src="${safeText(image.image)}" alt="${safeText(image.title)}">
                            <span>${safeText(image.title)}</span>
                        </button>
                    </div>
                `;
            }
        });
    });
    $("#GalleryGrid").html(html || '<div class="col-12 text-center py-4"><p class="text-muted">No gallery images found matching your search.</p></div>');
}

function fillCategorySelect(select, firstLabel) {
    $(select).append(fandomCategories.map(function (item) { return '<option value="' + item.id + '">' + safeText(item.name) + '</option>'; }).join(""));
}

function loadEventsPage() {
    fillCategorySelect("#eventCategory");
    function render() {
        const cat = $("#eventCategory").val() || "all";
        $.getJSON("data.json", function (data) {
            const list = (data.eventHighlights || []).filter(function (item) { return cat === "all" || item.associatedCategory === cat; });
            let html = "";
            list.forEach(function (item) {
                const eventKind = item.source ? "Official event" : "Proposed idea";
                const sourceLink = item.source ? '<a class="release-source" href="' + safeText(item.source) + '" target="_blank" rel="noopener noreferrer">Official details <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>' : '';
                html += '<div class="col-md-6 col-lg-4"><article class="event-card"><span class="content-tag">' + safeText(getCategoryName(item.associatedCategory)) + ' · ' + eventKind + '</span><h2>' + safeText(item.title) + '</h2><p class="event-date"><i class="fa-regular fa-calendar"></i> ' + safeText(item.date) + '</p><p>' + safeText(item.description) + '</p><p><i class="fa-solid fa-location-dot"></i> ' + safeText(item.location) + '</p>' + sourceLink + '<button class="simple-button" data-save-event="' + safeText(item.id) + '" data-title="' + safeText(item.title) + '">Save event</button></article></div>';
            });
            $("#EventsGrid").html(html || '<p>No events for this category.</p>');
        });
    }
    $("#eventCategory").off("change").on("change", render);
    $(document).off("click", "[data-save-event]").on("click", "[data-save-event]", function () { addBookmark($(this).data("save-event"), $(this).data("title"), "event"); });
        render();


}

function loadShopPage() {
    fillCategorySelect("#shopCategory");
    function render() {
        const cat = $("#shopCategory").val() || "all";
        const sortBy = $("#shopSort").val() || "default";
        $.getJSON("data.json", function (data) {
            let items = (data.merchandiseShowcase || []).filter(function (item) { return cat === "all" || item.category === cat; });
            if (sortBy === "price-low") {
                items.sort(function (a, b) { return Number(a.price) - Number(b.price); });
            } else if (sortBy === "price-high") {
                items.sort(function (a, b) { return Number(b.price) - Number(a.price); });
            } else if (sortBy === "name") {
                items.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
            }
            let html = "";
            items.forEach(function (item) {
                html += '<div class="col-6 col-md-4 col-lg-3"><article class="shop-card"><img src="' + safeText(item.image) + '" alt="' + safeText(item.name) + '"><div class="shop-copy"><span class="content-tag">' + safeText(getCategoryName(item.category)) + '</span><h2>' + safeText(item.name) + '</h2><p>' + safeText(item.shortDescription) + '</p><strong>' + '$' + Number(item.price).toFixed(2) + '</strong><button class="simple-button" data-add-cart="' + safeText(item.id) + '">Add to cart</button></div></article></div>';
            });
            $("#ShopGrid").html(html || '<div class="col-12 text-center py-4 text-muted"><p>No merchandise found for this selection.</p></div>');
            updateCartCount();
        });
    }
    $("#shopCategory").off("change").on("change", render);
    $("#shopSort").off("change").on("change", render);
    $(document).off("click", "[data-add-cart]").on("click", "[data-add-cart]", function () {
        addToCart($(this).data("add-cart"));
        updateCartCount();
    });
    render();
}

function getCart() {
    try {
        const raw = localStorage.getItem("fandom_cart");
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        const normalized = [];
        list.forEach(item => {
            if (typeof item === "string") {
                const existing = normalized.find(n => n.id === item);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    normalized.push({ id: item, quantity: 1 });
                }
            } else if (item && item.id) {
                const existing = normalized.find(n => n.id === item.id);
                if (existing) {
                    existing.quantity = (existing.quantity || 0) + (Number(item.quantity) || 1);
                } else {
                    normalized.push({ id: item.id, quantity: Math.max(1, Number(item.quantity) || 1) });
                }
            }
        });
        return normalized;
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("fandom_cart", JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    $("#cartCount").text(totalQty);
    $("#shopCartCount").text(totalQty);
}
window.updateCartCount = updateCartCount;

function addToCart(id, qty = 1) {
    // ISSUE 3: Add to cart runs ONLY when user is logged in
    const user = getCurrentUser();
    if (!user) {
        if (typeof FandomAlert !== "undefined" && FandomAlert.authRequired) {
            FandomAlert.authRequired("Login Required", "Please sign in or register to add items to your cart!");
        } else {
            window.location.href = "?page=login";
        }
        return false;
    }

    const cart = getCart();
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + (Number(qty) || 1);
    } else {
        cart.push({ id: id, quantity: Math.max(1, Number(qty) || 1) });
    }

    saveCart(cart);
    // ISSUE 5: Single alert message only - do not fire both toast and DOM banner
    if (typeof FandomAlert !== "undefined" && FandomAlert.toast) {
        FandomAlert.toast("Item added to your cart!", "success");
    } else {
        showSiteAlert("Item added to your cart!", "success");
    }
    return true;
}
window.addToCart = addToCart;

function changeCartQuantity(id, delta) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    const currentQty = Number(item.quantity) || 1;
    const targetQty = currentQty + delta;
    if (targetQty <= 0) {
        if (typeof FandomAlert !== "undefined") {
            FandomAlert.confirm("Remove Item?", "Do you want to remove this item from your cart?", "Yes, remove", "Keep item")
                .then(function (confirmed) {
                    if (confirmed) {
                        removeCartItem(id);
                    }
                });
        } else if (confirm("Remove this item from your cart?")) {
            removeCartItem(id);
        }
    } else {
        item.quantity = targetQty;
        saveCart(cart);
        loadCartPage();
    }
}
window.changeCartQuantity = changeCartQuantity;

function updateCartQuantity(id, val) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty <= 0) {
        removeCartItem(id);
    } else {
        item.quantity = qty;
        saveCart(cart);
        loadCartPage();
    }
}
window.updateCartQuantity = updateCartQuantity;

function removeCartItem(id) {
    let cart = getCart();
    cart = cart.filter(entry => entry.id !== id);
    saveCart(cart);
    loadCartPage();
    showSiteAlert("Item removed from cart.");
}
window.removeCartItem = removeCartItem;

function getOrders() {
    try {
        const orders = JSON.parse(localStorage.getItem("fandom_orders") || "[]");
        return Array.isArray(orders) ? orders : [];
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    localStorage.setItem("fandom_orders", JSON.stringify(orders));
}

function showSiteAlert(message, type = "success") {
    // ISSUE 5: Prevent double alert - return immediately once toast is shown
    if (typeof FandomAlert !== "undefined" && FandomAlert.toast) {
        FandomAlert.toast(message, type);
        return;
    }
    const notice = $("#siteAlert");
    if (!notice.length) return;
    window.clearTimeout(window.siteAlertTimer);
    notice.text(message).prop("hidden", false);
    window.requestAnimationFrame(function () { notice.addClass("show"); });
    window.siteAlertTimer = window.setTimeout(function () {
        notice.removeClass("show");
        window.setTimeout(function () { notice.prop("hidden", true); }, 250);
    }, 3000);
}

function loadCartPage() {
    $.getJSON("data.json", function (data) {
        const cart = getCart();
        const products = data.merchandiseShowcase || [];
        const cartList = $("#CartList");

        let subtotal = 0;
        let totalItems = 0;
        let html = "";

        if (!cart.length) {
            cartList.html(`
                <div class="p-5 text-center bg-dark text-white rounded border border-secondary my-3">
                    <i class="fa-solid fa-cart-shopping fa-3x purple-text mb-3"></i>
                    <h4 class="fw-bold">Your cart is currently empty</h4>
                    <p class="text-muted">Explore fan merchandise and add your favorites to cart.</p>
                    <a href="?page=shop" data-page="shop" class="btn purple-button rounded-pill px-4 mt-2">
                        <i class="fa-solid fa-bag-shopping me-2"></i>Explore Fan Shop
                    </a>
                </div>
            `);
            $("#CartItemsCount").text("0");
            $("#CartSubtotal").text("$0.00");
            $("#CartTotal").text("$0.00");
            $("#btnProceedCheckout").prop("disabled", true).addClass("opacity-50");
        } else {
            cart.forEach(function (cartItem) {
                const item = products.find(p => p.id === cartItem.id);
                if (!item) return;

                const price = Number(item.price) || 0;
                const qty = Number(cartItem.quantity) || 1;
                const itemTotal = price * qty;
                subtotal += itemTotal;
                totalItems += qty;

                html += `
                    <div class="cart-item-card">
                        <img src="${safeText(item.image)}" alt="${safeText(item.name)}" class="cart-item-thumb">
                        <div class="cart-item-info">
                            <span class="badge bg-secondary mb-1">${safeText(getCategoryName(item.category)).toUpperCase()}</span>
                            <h4>${safeText(item.name)}</h4>
                            <div class="cart-item-price">$${price.toFixed(2)} each</div>
                        </div>
                        <div class="cart-quantity-group">
                            <button type="button" class="cart-qty-btn" onclick="changeCartQuantity('${safeText(item.id)}', -1)" aria-label="Decrease quantity">−</button>
                            <input type="number" min="1" max="99" class="cart-qty-input" value="${qty}" onchange="updateCartQuantity('${safeText(item.id)}', this.value)" aria-label="Quantity">
                            <button type="button" class="cart-qty-btn" onclick="changeCartQuantity('${safeText(item.id)}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <div class="cart-item-subtotal">
                            $${itemTotal.toFixed(2)}
                        </div>
                        <button type="button" class="cart-item-remove" onclick="removeCartItem('${safeText(item.id)}')" title="Remove item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
            });

            cartList.html(html);
            $("#CartItemsCount").text(totalItems);
            $("#CartSubtotal").text("$" + subtotal.toFixed(2));
            $("#CartTotal").text("$" + subtotal.toFixed(2));
            $("#btnProceedCheckout").prop("disabled", false).removeClass("opacity-50");
        }

        // Checkout button click (Issue 1: Credit/Debit Card Fields & Amount)
        $("#btnProceedCheckout").off("click").on("click", function () {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.warning("Sign In Required", "Please sign in or register to complete your order!").then(function () {
                        window.location.href = "?page=login";
                    });
                } else {
                    alert("Please sign in or register to complete your order!");
                    window.location.href = "?page=login";
                }
                return;
            }

            const currentCart = getCart();
            if (!currentCart.length) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.info("Cart is Empty", "Add merchandise items before checking out.");
                } else {
                    alert("Your cart is empty! Add merchandise items before checking out.");
                }
                return;
            }

            // Fill modal fields
            $("#checkoutName").val(currentUser.name || "");
            $("#checkoutEmail").val(currentUser.email || "");
            $("#checkoutModalTotal").text("$" + subtotal.toFixed(2));
            $("#checkoutCardAmount").val(subtotal.toFixed(2));

            // Dynamic card payment fields visibility based on checked radio
            function updatePaymentFieldsVisibility() {
                const selectedMethod = $('input[name="checkoutPayment"]:checked').val();
                if (selectedMethod === "Credit/Debit Card") {
                    $("#cardPaymentFields").slideDown(200);
                    $("#checkoutCardNumber").prop("required", true);
                    $("#checkoutCardAmount").prop("required", true);
                    if (!$("#checkoutCardAmount").val() || parseFloat($("#checkoutCardAmount").val()) === 0) {
                        $("#checkoutCardAmount").val(subtotal.toFixed(2));
                    }
                } else {
                    $("#cardPaymentFields").slideUp(200);
                    $("#checkoutCardNumber").prop("required", false);
                    $("#checkoutCardAmount").prop("required", false);
                }
            }

            $('input[name="checkoutPayment"]').off("change").on("change", updatePaymentFieldsVisibility);
            updatePaymentFieldsVisibility();

            // Auto-format card number as 4-4-4-4
            $("#checkoutCardNumber").off("input").on("input", function () {
                let raw = $(this).val().replace(/\D/g, "").substring(0, 16);
                let parts = raw.match(/.{1,4}/g);
                $(this).val(parts ? parts.join(" ") : raw);
            });

            // Auto-format expiry as MM/YY
            $("#checkoutCardExpiry").off("input").on("input", function () {
                let raw = $(this).val().replace(/\D/g, "").substring(0, 4);
                if (raw.length >= 3) {
                    $(this).val(raw.substring(0, 2) + "/" + raw.substring(2));
                } else {
                    $(this).val(raw);
                }
            });

            const checkoutModalEl = document.getElementById("checkoutModal");
            if (checkoutModalEl) {
                const modal = new bootstrap.Modal(checkoutModalEl);
                modal.show();
            }
        });

        // Checkout form submission
        $("#checkoutForm").off("submit").on("submit", function (e) {
            e.preventDefault();

            const currentUser = getCurrentUser();
            if (!currentUser) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.warning("Login Required", "Please login first to complete your checkout.");
                } else {
                    alert("Please login first to complete your checkout.");
                }
                return;
            }

            const currentCart = getCart();
            if (!currentCart.length) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.info("Cart is Empty", "Your shopping cart is currently empty.");
                } else {
                    alert("Your cart is empty.");
                }
                return;
            }

            const name = $("#checkoutName").val().trim();
            const email = $("#checkoutEmail").val().trim();
            const phone = $("#checkoutPhone").val().trim();
            const city = $("#checkoutCity").val().trim();
            const address = $("#checkoutAddress").val().trim();
            const payment = $('input[name="checkoutPayment"]:checked').val() || "Cash on Delivery";

            if (!name || !email || !phone || !address) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.warning("Incomplete Information", "Please complete all shipping address fields.");
                } else {
                    alert("Please complete all shipping address fields.");
                }
                return;
            }

            const pakistaniPhoneRegex = /^(03[0-9]{9}|\+923[0-9]{9}|00923[0-9]{9})$/;
            const cleanPhone = phone.replace(/[\s-]/g, '');
            if (!pakistaniPhoneRegex.test(cleanPhone)) {
                if (typeof FandomAlert !== "undefined") {
                    FandomAlert.error("Invalid Phone Number", "Please enter a valid Pakistani phone number in format 03032259008.");
                } else {
                    alert("Please enter a valid Pakistani phone number in format 03032259008.");
                }
                $("#checkoutPhone").focus();
                return;
            }

            let cardNo = "";
            let cardAmount = 0;
            let maskedCard = "";

            if (payment === "Credit/Debit Card") {
                cardNo = ($("#checkoutCardNumber").val() || "").replace(/\s+/g, "");
                cardAmount = parseFloat($("#checkoutCardAmount").val()) || 0;

                if (!cardNo || cardNo.length < 13 || cardNo.length > 19) {
                    if (typeof FandomAlert !== "undefined") {
                        FandomAlert.error("Invalid Card Number", "Please enter a valid 16-digit Credit or Debit Card number.");
                    } else {
                        alert("Please enter a valid 16-digit Credit or Debit Card number.");
                    }
                    $("#checkoutCardNumber").focus();
                    return;
                }

                if (!cardAmount || cardAmount <= 0) {
                    if (typeof FandomAlert !== "undefined") {
                        FandomAlert.error("Invalid Amount", "Please enter a valid payment amount.");
                    } else {
                        alert("Please enter a valid payment amount.");
                    }
                    $("#checkoutCardAmount").focus();
                    return;
                }

                if (cardAmount < subtotal) {
                    if (typeof FandomAlert !== "undefined") {
                        FandomAlert.error("Insufficient Amount", "Card payment amount ($" + cardAmount.toFixed(2) + ") cannot be less than the order total ($" + subtotal.toFixed(2) + ").");
                    } else {
                        alert("Card payment amount cannot be less than the order total.");
                    }
                    $("#checkoutCardAmount").focus();
                    return;
                }

                maskedCard = "**** **** **** " + cardNo.slice(-4);
            }

            const orderItems = [];
            let orderTotal = 0;

            currentCart.forEach(cartItem => {
                const prod = products.find(p => p.id === cartItem.id);
                if (prod) {
                    const pr = Number(prod.price) || 0;
                    const q = Number(cartItem.quantity) || 1;
                    const st = pr * q;
                    orderTotal += st;
                    orderItems.push({
                        id: prod.id,
                        name: prod.name,
                        price: pr,
                        quantity: q,
                        subtotal: st,
                        image: prod.image,
                        category: prod.category
                    });
                }
            });

            const orderId = "FV-" + Math.floor(100000 + Math.random() * 900000);
            const orderDate = new Date().toLocaleString();

            const order = {
                orderId: orderId,
                userEmail: currentUser.email,
                userName: name,
                phone: phone,
                city: city,
                address: address,
                paymentMethod: payment,
                cardNumber: maskedCard,
                paidAmount: (payment === "Credit/Debit Card" ? cardAmount.toFixed(2) : orderTotal.toFixed(2)),
                items: orderItems,
                totalAmount: orderTotal.toFixed(2),
                orderDate: orderDate,
                timestamp: Date.now(),
                status: "Confirmed"
            };

            // Save order to LocalStorage
            const orders = getOrders();
            orders.unshift(order);
            saveOrders(orders);

            // Clear cart
            saveCart([]);

            // Hide checkout modal
            const checkoutModalEl = document.getElementById("checkoutModal");
            if (checkoutModalEl) {
                const inst = bootstrap.Modal.getInstance(checkoutModalEl);
                if (inst) inst.hide();
            }

            // Show success modal
            $("#successOrderId").text(orderId);
            $("#successOrderDate").text(orderDate);
            $("#successOrderPayment").text(payment === "Credit/Debit Card" ? "Credit/Debit Card (" + maskedCard + ")" : "Cash on Delivery");
            $("#successOrderTotal").text("$" + (payment === "Credit/Debit Card" ? cardAmount.toFixed(2) : orderTotal.toFixed(2)));

            const succModalEl = document.getElementById("orderSuccessModal");
            if (succModalEl) {
                const succModal = new bootstrap.Modal(succModalEl);
                succModal.show();
            }

            if (typeof FandomAlert !== "undefined" && FandomAlert.toast) {
                FandomAlert.toast("Order #" + orderId + " placed successfully!", "success");
            } else {
                showSiteAlert("Order #" + orderId + " placed successfully!");
            }
            loadCartPage();
        });
        // Clear cart button
        $("#clearCart").off("click").on("click", function () {
            if (typeof FandomAlert !== "undefined") {
                FandomAlert.confirm("Empty Shopping Cart?", "Are you sure you want to empty your entire shopping cart?", "Yes, clear cart", "Cancel")
                    .then(function (confirmed) {
                        if (confirmed) {
                            saveCart([]);
                            loadCartPage();
                            FandomAlert.toast("Cart cleared", "info");
                        }
                    });
            } else if (confirm("Are you sure you want to empty your shopping cart?")) {
                saveCart([]);
                loadCartPage();
                showSiteAlert("Cart cleared.");
            }
        });

        renderOrderHistory();
    });
}

function renderOrderHistory() {
    const user = getCurrentUser();
    const historySection = $("#OrderHistorySection");
    const historyList = $("#OrderHistoryList");
    if (!historySection.length || !historyList.length) return;

    if (!user) {
        historySection.html(`
            <div class="section-title mb-3">
                <span class="section-note">YOUR RECENT PURCHASES</span>
                <h3 class="fw-bold text-white"><i class="fa-solid fa-box-archive me-2 purple-icon"></i>Order <span class="purple-text">History</span></h3>
                <div class="title-line"></div>
            </div>
            <div class="p-4 bg-dark text-white rounded text-center border border-secondary">
                <p class="text-muted m-0">Please <a href="?page=login" data-page="login" class="purple-text fw-bold">sign in</a> to view your past orders.</p>
            </div>
        `).show();
        return;
    }

    const allOrders = getOrders();
    const userOrders = allOrders.filter(o => o.userEmail && o.userEmail.toLowerCase() === user.email.toLowerCase());

    if (!userOrders.length) {
        historyList.html(`
            <div class="col-12">
                <div class="p-4 bg-dark text-white rounded text-center border border-secondary">
                    <i class="fa-solid fa-box-open fa-2x text-muted mb-2"></i>
                    <p class="text-muted m-0">No past orders found for <strong>${safeText(user.email)}</strong>.</p>
                </div>
            </div>
        `);
        return;
    }

    let html = "";
    userOrders.forEach(order => {
        const itemsSummary = (order.items || []).map(i => `${safeText(i.name)} (x${i.quantity})`).join(", ");
        html += `
            <div class="col-12 col-md-6">
                <div class="order-card p-3 rounded text-white border border-secondary h-100">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong class="purple-text"><i class="fa-solid fa-receipt me-1"></i>${safeText(order.orderId)}</strong>
                        <span class="badge bg-success">${safeText(order.status || "Confirmed")}</span>
                    </div>
                    <small class="text-muted d-block mb-2"><i class="fa-regular fa-clock me-1"></i>${safeText(order.orderDate)}</small>
                    <p class="small text-light mb-1"><strong>Items:</strong> ${itemsSummary}</p>
                    <p class="small text-muted mb-2"><strong>Ship to:</strong> ${safeText(order.address)}, ${safeText(order.city || "")} (${safeText(order.phone)})</p>
                    <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary">
                        <small class="text-muted">${safeText(order.paymentMethod)}${order.cardNumber ? " <span class='purple-text fw-bold'>(" + safeText(order.cardNumber) + ")</span>" : ""}</small>
                        <strong class="text-white fs-5">$${safeText(order.totalAmount)}</strong>
                    </div>
                </div>
            </div>
        `;
    });
    historyList.html(html);
}

function loadBookmarksPage() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        $("#BookmarksGrid").html(`
            <div class="col-12 text-center py-5">
                <div class="empty-story p-5 rounded" style="background: rgba(18, 20, 36, 0.95); border: 1px solid rgba(161, 0, 255, 0.3);">
                    <i class="fa-regular fa-bookmark fs-1 text-purple mb-3 d-block"></i>
                    <h2 class="text-white fw-bold mb-2">Sign in to view your bookmarks</h2>
                    <p class="text-muted mb-4">Your saved articles, characters, trailers, and releases are saved to your fan account.</p>
                    <a class="simple-button" href="?page=login" data-page="login">
                        <i class="fa-solid fa-right-to-bracket me-2"></i>Sign in now
                    </a>
                </div>
            </div>
        `);
        return;
    }

    $.getJSON("data.json", function (data) {
        const galleryItems = [];
        (data.imageGalleries || []).forEach(function (gallery) {
            gallery.images.forEach(function (image, index) {
                galleryItems.push({
                    id: gallery.category + "-gallery-" + index,
                    title: image.title,
                    image: image.image,
                    category: gallery.category,
                    shortDescription: "Image from the " + getCategoryName(gallery.category) + " gallery."
                });
            });
        });

        const allItems = [].concat(
            data.contentCards || [],
            data.trailersAndMedia || [],
            data.audioClips || [],
            galleryItems,
            data.characterProfiles || [],
            data.eventHighlights || [],
            data.merchandiseShowcase || [],
            data.upcomingReleases || []
        );

        const saved = getSavedList("fandom_bookmarks");
        if (!saved.length) {
            $("#BookmarksGrid").html('<div class="col-12 text-center py-5"><p class="empty-message">Nothing saved yet. Browse any category, article, or trailer and click Save.</p></div>');
            return;
        }

        let html = "";
        saved.forEach(function (bookmark, index) {
            const item = allItems.find(function (entry) { return String(entry.id) === String(bookmark.id); });
            const title = bookmark.title || (item && (item.title || item.name || item.label)) || "Saved item";
            const note = sessionStorage.getItem("note-" + bookmark.id) || "";
            const desc = item ? (item.shortDescription || item.description || item.biography || "") : "Saved in your bookmarks.";
            const bKind = (bookmark.kind || "").toLowerCase();
            const bId = String(bookmark.id || "");

            let icon = "fa-solid fa-bookmark";
            let kindLabel = "Bookmark";
            if (bKind === "article" || bKind === "content" || bId.startsWith("c-")) {
                icon = "fa-regular fa-newspaper";
                kindLabel = "Article Story";
            } else if (bKind === "character" || bId.startsWith("char-")) {
                icon = "fa-solid fa-users";
                kindLabel = "Character Profile";
            } else if (bKind === "event" || bId.startsWith("evt-")) {
                icon = "fa-regular fa-calendar";
                kindLabel = "Event Highlight";
            } else if (bKind === "media" || bKind === "trailer" || bId.startsWith("media-")) {
                icon = "fa-solid fa-clapperboard";
                kindLabel = "Trailer / Video";
            } else if (bKind === "audio" || bId.startsWith("audio-")) {
                icon = "fa-solid fa-headphones";
                kindLabel = "Audio Clip";
            } else if (bKind === "merch" || bId.startsWith("merch-")) {
                icon = "fa-solid fa-bag-shopping";
                kindLabel = "Merchandise";
            } else if (bKind === "release" || bId.startsWith("release-")) {
                icon = "fa-regular fa-calendar-check";
                kindLabel = "Upcoming Release";
            }

            html += `
                <div class="col-md-6 col-lg-6 mb-3">
                    <article class="bookmark-card h-100 d-flex flex-column justify-content-between p-3 rounded border border-secondary" style="background: rgba(18, 20, 36, 0.85);">
                        <div>
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="content-tag"><i class="${icon} me-1"></i>${kindLabel}</span>
                                ${item && item.category ? '<span class="badge bg-dark border border-secondary text-purple">' + safeText(getCategoryName(item.category)) + '</span>' : ''}
                            </div>
                            <h3 class="text-white fs-5 fw-bold mb-2">${safeText(title)}</h3>
                            <p class="small text-muted mb-3" style="line-height: 1.5;">${safeText(desc)}</p>
                        </div>

                        <div>
                            <label for="note-${index}" class="small text-muted d-block mb-1">Session note</label>
                            <textarea id="note-${index}" class="form-control bg-dark text-white border-secondary mb-3" data-note-id="${safeText(bookmark.id)}" rows="2" placeholder="Temporary note for this session...">${safeText(note)}</textarea>
                            
                            <div class="bookmark-actions-row d-flex align-items-center justify-content-end">
                                <button class="simple-button quiet-button btn-sm" data-remove-bookmark="${index}" title="Remove bookmark">
                                    <i class="fa-regular fa-trash-can me-1"></i> Remove
                                </button>
                            </div>
                        </div>
                    </article>
                </div>`;
        });
        $("#BookmarksGrid").html(html);
    });

    $(document).off("input", "[data-note-id]").on("input", "[data-note-id]", function () {
        sessionStorage.setItem("note-" + $(this).data("note-id"), $(this).val());
    });

    $(document).off("click", "[data-remove-bookmark]").on("click", "[data-remove-bookmark]", function () {
        const saved = getSavedList("fandom_bookmarks");
        const removed = saved.splice(Number($(this).data("remove-bookmark")), 1)[0];
        if (removed) sessionStorage.removeItem("note-" + removed.id);
        localStorage.setItem("fandom_bookmarks", JSON.stringify(saved));
        loadBookmarksPage();
    });

    $("#clearBookmarks").off("click").on("click", function () {
        if (typeof FandomAlert !== "undefined" && FandomAlert.confirm) {
            FandomAlert.confirm("Clear All Bookmarks?", "Are you sure you want to remove all saved bookmarks?", "Yes, clear all", "Cancel")
                .then(function (confirmed) {
                    if (confirmed) {
                        localStorage.setItem("fandom_bookmarks", "[]");
                        loadBookmarksPage();
                    }
                });
        } else {
            localStorage.setItem("fandom_bookmarks", "[]");
            loadBookmarksPage();
        }
    });

    $("#exportBookmarks").off("click").on("click", function () {
        const saved = getSavedList("fandom_bookmarks");
        const text = saved.map(function (item) { return "• " + item.title + " (" + item.kind + ")"; }).join("\n") || "No bookmarks saved.";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob(["FandomVerse bookmarks\n\n" + text], { type: "text/plain" }));
        link.download = "fandomverse-bookmarks.txt";
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

function loadAboutPage() { $("#visitorTotal").text(localStorage.getItem("visitor_count") || "1"); }
function loadContactPage() {
    $("#contactForm").off("submit").on("submit", function (event) {
        event.preventDefault();
        if (typeof FandomAlert !== "undefined") { FandomAlert.success("Message Received", "Thank you for reaching out! We will contact you soon."); } else { alert("We will contact you soon."); }
        this.reset();
    });
    $("#findLocation").off("click").on("click", function () {
        if (!navigator.geolocation) { $("#locationReply").text("Location is not available in this browser."); return; }
        $("#locationReply").text("Asking your browser for permission...");
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude; const lon = position.coords.longitude;
            $("#communityMap").attr("src", "https://maps.google.com/maps?q=" + lat + "," + lon + "&output=embed");
            $("#locationReply").text("The map is centered on the location you allowed. It is not saved by this site.");
        }, function () { $("#locationReply").text("Location was not shared. You can still use the community map above."); });
    });
}
function loadAuthPage(page) {
    initDefaultUsers();
    updateAuthUI();

    const form = $("#loginForm, #registerForm, #demoForm").first();
    if (!form.length) return;

    const isRegister = (page === "register" || form.attr("id") === "registerForm");
    const alertBox = isRegister ? $("#registerAlertBox") : $("#loginAlertBox");

    form.off("submit").on("submit", function (event) {
        event.preventDefault();

        if (isRegister) {
            const name = $("#registerName").val().trim();
            const email = $("#registerEmail").val().trim().toLowerCase();
            const password = $("#registerPassword").val();

            if (!name || !email || !password) {
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text("Please fill in all required fields.").show();
                } else {
                    if (typeof FandomAlert !== "undefined") { FandomAlert.warning("Required Fields", "Please fill in all required fields."); } else { alert("Please fill in all required fields."); }
                }
                return;
            }

            if (password.length < 6) {
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text("Password must be at least 6 characters.").show();
                } else {
                    if (typeof FandomAlert !== "undefined") { FandomAlert.warning("Weak Password", "Password must be at least 6 characters."); } else { alert("Password must be at least 6 characters."); }
                }
                return;
            }

            const users = getUsers();
            const existing = users.find(u => u.email.toLowerCase() === email);
            if (existing) {
                const msg = "An account with this email (" + email + ") already exists. Please sign in.";
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text(msg).show();
                }
                if (typeof FandomAlert !== "undefined") { FandomAlert.error("Account Exists", msg); } else { alert(msg); }
                return;
            }

            const newUser = {
                id: "user_" + Date.now(),
                name: name,
                email: email,
                password: password,
                registeredAt: new Date().toISOString()
            };

            users.push(newUser);
            saveUsers(users);
            setCurrentUser(newUser);

            const welcomeMsg = "Registration successful! Welcome to FandomVerse, " + newUser.name + "!";
            if (alertBox.length) {
                alertBox.attr("class", "site-auth-alert alert-success").text(welcomeMsg).show();
            }
            if (typeof FandomAlert !== "undefined") { FandomAlert.success("Welcome!", welcomeMsg); } else { alert(welcomeMsg); }
            showSiteAlert("Welcome, " + newUser.name + "!");

            // Navigate to home page
            const homeLink = $('a[data-page="home"]').first();
            if (homeLink.length) {
                homeLink.trigger("click");
            } else {
                window.location.href = "?page=home";
            }
        } else {
            // Login
            const email = $("#loginEmail").val().trim().toLowerCase();
            const password = $("#loginPassword").val();

            if (!email || !password) {
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text("Please enter both email and password.").show();
                } else {
                    if (typeof FandomAlert !== "undefined") { FandomAlert.warning("Required Fields", "Please enter both email and password."); } else { alert("Please enter both email and password."); }
                }
                return;
            }

            const users = getUsers();
            const user = users.find(u => u.email.toLowerCase() === email);

            if (!user) {
                const noUserMsg = "No account found with this email (" + email + "). Please register first.";
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text(noUserMsg).show();
                }
                if (typeof FandomAlert !== "undefined") { FandomAlert.error("User Not Found", noUserMsg); } else { alert(noUserMsg); }
                return;
            }

            if (user.password !== password) {
                const wrongPassMsg = "Incorrect password. Please try again.";
                if (alertBox.length) {
                    alertBox.attr("class", "site-auth-alert alert-danger").text(wrongPassMsg).show();
                }
                if (typeof FandomAlert !== "undefined") { FandomAlert.error("Incorrect Password", wrongPassMsg); } else { alert(wrongPassMsg); }
                return;
            }

            setCurrentUser(user);
            const loginSuccessMsg = "Login successful! Welcome back, " + user.name + ".";
            if (alertBox.length) {
                alertBox.attr("class", "site-auth-alert alert-success").text(loginSuccessMsg).show();
            }
            if (typeof FandomAlert !== "undefined") { FandomAlert.success("Login Successful", loginSuccessMsg); } else { alert(loginSuccessMsg); }
            showSiteAlert("Welcome back, " + user.name + "!");

            // Navigate to home page
            const homeLink = $('a[data-page="home"]').first();
            if (homeLink.length) {
                homeLink.trigger("click");
            } else {
                window.location.href = "?page=home";
            }
        }
    });
}

function loadDemoForm(page) {
    loadAuthPage(page);
}

function addChatMessage(text, className) {
    $("#chatMessages").append('<p class="' + className + '">' + safeText(text) + '</p>');
    $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
}

function answerChat(question) {
    const rawQuestion = String(question || "").trim();
    if (!rawQuestion) return;
    const words = rawQuestion.toLowerCase();

    $.getJSON("data.json", function (data) {
        // 1. Greetings
        if (/^(hi|hello|hey|salam|assalam|greetings|good\s*(morning|afternoon|evening))\b/.test(words)) {
            addChatMessage("Hello! Welcome to FandomVerse AI Assistant. I can help answer FAQs about our 7 fandom worlds, guide you across the site, recommend content, or assist with shop merchandise and bookmarks. What would you like to explore?", "chat-answer");
            const suggestions = ["Explore Categories", "Shop Merch", "View Characters", "Upcoming Releases"];
            suggestions.forEach(function (reply) {
                $("#chatMessages").append('<button class="chat-reply" type="button" data-question="' + safeText(reply) + '">' + safeText(reply) + '</button>');
            });
            $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
            return;
        }

        // 2. Cart & Checkout Assistance
        if (words.includes("cart") || words.includes("checkout") || words.includes("order") || words.includes("buy")) {
            addChatMessage("You can review your fan merchandise in the shopping cart, adjust quantities, and complete checkout using Cash on Delivery or Credit/Debit Card options.", "chat-answer");
            $("#chatMessages").append('<a class="chat-link" href="?page=cart" data-page="cart"><i class="fa-solid fa-cart-shopping me-1"></i>Open Shopping Cart</a>');
            ["Payment Methods", "Go to Shop"].forEach(function (reply) {
                $("#chatMessages").append('<button class="chat-reply" type="button" data-question="' + safeText(reply) + '">' + safeText(reply) + '</button>');
            });
            $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
            return;
        }

        // 3. Payment Methods
        if (words.includes("payment") || words.includes("credit card") || words.includes("debit card") || words.includes("cod") || words.includes("cash on delivery")) {
            addChatMessage("We support Cash on Delivery and Credit/Debit Cards. When paying by card, simply input your 16-digit card number and payment amount in the checkout modal.", "chat-answer");
            $("#chatMessages").append('<a class="chat-link" href="?page=cart" data-page="cart"><i class="fa-solid fa-credit-card me-1"></i>Checkout Now</a>');
            $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
            return;
        }

        // 4. Recommendations
        const chosenCategory = fandomCategories.find(function (item) { return words.includes(item.id) || words.includes(item.name.toLowerCase()); });
        if (chosenCategory && (words.includes("recommend") || words.includes("suggest") || words.includes("like") || words.includes("interest") || words.includes("best"))) {
            const pick = (data.contentCards || []).find(function (item) { return item.category === chosenCategory.id; });
            const suggestion = pick ? pick.title + " — " + pick.shortDescription : "Browse the category hub to discover exciting stories and characters.";
            addChatMessage("For " + chosenCategory.name + ", check out: " + suggestion, "chat-answer");
            $("#chatMessages").append('<a class="chat-link" href="?page=category&type=' + encodeURIComponent(chosenCategory.id) + '" data-page="category"><i class="fa-solid fa-compass me-1"></i>Explore ' + safeText(chosenCategory.name) + ' Hub</a>');
            $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
            return;
        }

        // 5. Keyword Matching against chatbotDataset
        const rules = data.chatbotDataset || [];
        let matchedRule = rules.find(function (rule) {
            return (rule.keywords || []).some(function (k) {
                return words.includes(k.toLowerCase());
            });
        });

        if (!matchedRule) {
            if (words.includes("bookmark") || words.includes("save")) {
                matchedRule = {
                    response: "You can save articles, character profiles, trailers, and releases to your Bookmarks. Note that you must be logged in to view and save bookmarks!",
                    targetPage: "bookmarks",
                    suggestedQuickReplies: ["My Bookmarks", "Login / Sign In"]
                };
            } else if (words.includes("anime") || words.includes("game") || words.includes("movie") || words.includes("manga") || words.includes("comic") || words.includes("kpop")) {
                matchedRule = {
                    response: "Explore our Category Hubs to discover character profiles, video trailers, articles, and upcoming events across all 7 fan universes.",
                    targetPage: "category",
                    suggestedQuickReplies: ["Anime Hub", "Gaming Hub", "Watch Trailers"]
                };
            } else {
                matchedRule = {
                    response: "I'm here to help! Ask me about character profiles, upcoming releases, shop merchandise, event conventions, trailers, or how to bookmark items.",
                    targetPage: "category",
                    suggestedQuickReplies: ["View Characters", "Upcoming Releases", "Shop Merch", "View Events"]
                };
            }
        }

        addChatMessage(matchedRule.response, "chat-answer");

        if (matchedRule.targetPage) {
            const cleanTarget = String(matchedRule.targetPage).replace(/\.html$/, "");
            const pageLabels = {
                characters: "View Characters",
                shop: "Go to Fan Shop",
                cart: "Open Cart & Checkout",
                events: "Browse Events",
                home: "Upcoming Releases Calendar",
                trailers: "Watch Trailers",
                bookmarks: "View Bookmarks",
                login: "Sign In / Register",
                about: "About FandomVerse",
                contact: "Contact Us",
                category: "Explore Category Hubs"
            };
            const label = pageLabels[cleanTarget] || ("Open " + cleanTarget);
            $("#chatMessages").append('<a class="chat-link" href="?page=' + safeText(cleanTarget) + '" data-page="' + safeText(cleanTarget) + '"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>' + safeText(label) + '</a>');
        }

        (matchedRule.suggestedQuickReplies || []).slice(0, 3).forEach(function (reply) {
            $("#chatMessages").append('<button class="chat-reply" type="button" data-question="' + safeText(reply) + '">' + safeText(reply) + '</button>');
        });

        $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
    });
}

// Global Document Initialization & Event Listeners
$(function () {
    if (typeof initDefaultUsers === "function") initDefaultUsers();
    if (typeof updateAuthUI === "function") updateAuthUI();
    if (typeof updateCartCount === "function") updateCartCount();

    // Chatbot Open & Close
    $(document).off("click", "#chatOpen").on("click", "#chatOpen", function () {
        $("#chatBox").prop("hidden", false);
        $("#chatInput").trigger("focus");
    });
    $(document).off("click", "#chatClose").on("click", "#chatClose", function () {
        $("#chatBox").prop("hidden", true);
    });

    // Chatbot Form Submit & Quick Replies
    $(document).off("submit", "#chatForm").on("submit", "#chatForm", function (event) {
        event.preventDefault();
        const question = $("#chatInput").val().trim();
        if (!question) return;
        addChatMessage(question, "chat-question");
        $("#chatInput").val("");
        answerChat(question);
    });
    $(document).off("click", "[data-question]").on("click", "[data-question]", function () {
        const question = $(this).data("question");
        addChatMessage(question, "chat-question");
        answerChat(question);
    });

    // Landing Page Featured Highlights Bookmarks
    $(document).off("click", "[data-save-home]").on("click", "[data-save-home]", function (e) {
        e.preventDefault();
        const id = $(this).data("save-home");
        const title = $(this).data("title") || "Featured Story";
        addBookmark(id, title, "content");
    });

    // Trailers / Media Bookmarks
    $(document).off("click", "[data-save-media]").on("click", "[data-save-media]", function (e) {
        e.preventDefault();
        const id = $(this).data("save-media");
        const title = $(this).data("title") || "Trailer";
        addBookmark(id, title, "media");
    });

    // Modal Watchlist Bookmark
    $(document).off("click", "#btnModalWatchlist").on("click", "#btnModalWatchlist", function () {
        addBookmark("media-" + Date.now(), $(this).data("video-title") || "Featured video", "media");
    });

    // Newsletter Subscription Form
    $(document).off("submit", ".newsletter-form").on("submit", ".newsletter-form", function (event) {
        event.preventDefault();
        if (typeof FandomAlert !== "undefined") {
            FandomAlert.success("Subscribed!", "Thanks for joining the FandomVerse newsletter!");
        } else {
            alert("Thanks for joining the newsletter!");
        }
        this.reset();
    });

    // Global navigation active pills
    $(document).off("click", ".nav-link[data-page]").on("click", ".nav-link[data-page]", function () {
        $(".nav-link").removeClass("active");
        $(this).addClass("active");
    });
    $(document).off("click", "[data-page='home']").on("click", "[data-page='home']", function () {
        $(".nav-link").removeClass("active").filter("[data-page='home']").addClass("active");
    });
});

function loadArticlesPage() {
    $.getJSON("data.json", function (data) {
        const articles = (data.contentCards || []).filter(function (item) { return item.contentType === "article"; });
        function showArticles() {
            const search = String($("#articleSearch").val() || "").toLowerCase();
            const shown = articles.filter(function (item) {
                return (item.title + " " + item.category + " " + item.shortDescription).toLowerCase().includes(search);
            });
            let html = "";
            shown.forEach(function (item, index) {
                html += '<article class="article-card" style="--card-number:' + index + '"><a class="article-picture" href="?page=article&id=' + encodeURIComponent(item.id) + '"><img src="' + safeText(item.thumbnail || getCategoryImage(item.category)) + '" alt="' + safeText(item.title) + '"></a><div class="article-card-copy"><span class="content-tag">' + safeText(getCategoryName(item.category)) + ' · ' + safeText(item.date || "Fan guide") + '</span><h2><a href="?page=article&id=' + encodeURIComponent(item.id) + '">' + safeText(item.title) + '</a></h2><p>' + safeText(item.shortDescription) + '</p><a class="read-link" href="?page=article&id=' + encodeURIComponent(item.id) + '">Read this story <i class="fa-solid fa-arrow-right"></i></a></div></article>';
            });
            $("#ArticleGrid").html(html || '<p class="empty-message">No articles match this search.</p>');
        }
        $("#articleSearch").off("input").on("input", showArticles);
        showArticles();
    }).fail(function () { $("#ArticleGrid").html('<p class="empty-message">Articles could not be loaded. Please start the site with a local server.</p>'); });
}

function loadArticlePage(articleId) {
    $.getJSON("data.json", function (data) {
        const article = (data.contentCards || []).find(function (item) { return item.id === articleId && item.contentType === "article"; });
        if (!article) {
            $("#ArticleDetail").html('<div class="empty-story"><span class="eyebrow">STORY NOT FOUND</span><h1>Choose another article</h1><a class="simple-button" href="?page=articles">Browse all articles</a></div>');
            return;
        }
        const summary = article.description || article.shortDescription;
        const picture = article.thumbnail || getCategoryImage(article.category);
        const sections = article.articleSections || [{ heading: "About this story", text: summary }];
        const sectionHtml = sections.map(function (section) {
            return '<section><h2>' + safeText(section.heading) + '</h2><p>' + safeText(section.text) + '</p></section>';
        }).join("");
        const relatedArticles = (data.contentCards || []).filter(function (item) {
            return item.id !== article.id && item.contentType === "article";
        }).sort(function (first, second) {
            return Number(second.category === article.category) - Number(first.category === article.category);
        }).slice(0, 3);
        const relatedHtml = relatedArticles.map(function (item) {
            return '<a class="related-story" href="?page=article&id=' + encodeURIComponent(item.id) + '" data-page="article"><span>' + safeText(getCategoryName(item.category)) + '</span><strong>' + safeText(item.title) + '</strong><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>';
        }).join("");
        const relatedSection = relatedHtml ? '<aside class="related-stories"><h2>Related stories</h2>' + relatedHtml + '</aside>' : '';
        const html = '<article class="article-story"><div class="story-cover"><img src="' + safeText(picture) + '" alt="Artwork for ' + safeText(article.title) + '"><span class="story-stamp"><i class="fa-regular fa-newspaper"></i> FAN GUIDE</span></div><div class="story-copy"><a class="back-link" href="?page=articles" data-page="articles"><i class="fa-solid fa-arrow-left"></i> All articles</a><div class="story-meta"><span>' + safeText(getCategoryName(article.category)) + '</span><span>' + safeText(article.date || "FandomVerse guide") + '</span></div><h1>' + safeText(article.title) + '</h1><p class="article-lead">' + safeText(article.shortDescription) + '</p><div class="story-rule"></div>' + sectionHtml + '<a class="simple-button" href="?page=category&type=' + encodeURIComponent(article.category) + '" data-page="category">Explore ' + safeText(getCategoryName(article.category)) + '</a>' + relatedSection + '</div></article>';
        $("#ArticleDetail").html(html);
    }).fail(function () { $("#ArticleDetail").html('<p class="empty-message">This article could not be loaded.</p>'); });
}

function loadCharactersPage() {
    const select = $("#characterCategory");
    select.append(fandomCategories.map(function (item) { return '<option value="' + item.id + '">' + safeText(item.name) + '</option>'; }).join(""));
    $.getJSON("data.json", function (data) {
        const seriesSelect = $("#characterSeries");
        function showCharacters() {
            const category = select.val() || "all";
            const selectedSeries = seriesSelect.val() || "all";
            const communityPeople = (data.characterProfiles || []).filter(function (person) {
                return category === "all" || person.category === category;
            });
            const seriesNames = Array.from(new Set(communityPeople.map(function (person) { return person.series; }))).sort();
            seriesSelect.html('<option value="all">All series</option>' + seriesNames.map(function (series) {
                return '<option value="' + safeText(series) + '">' + safeText(series) + '</option>';
            }).join(""));
            if (seriesNames.includes(selectedSeries)) seriesSelect.val(selectedSeries);
            const people = communityPeople.filter(function (person) {
                return seriesSelect.val() === "all" || person.series === seriesSelect.val();
            });
            let html = "";
            people.forEach(function (person, index) {
                html += '<article class="character-card" style="--card-number:' + index + '"><div class="character-picture"><img src="' + safeText(person.image || getCategoryImage(person.category)) + '" alt="' + safeText(person.name) + '"></div><div class="character-copy"><span class="content-tag">' + safeText(getCategoryName(person.category)) + '</span><h2>' + safeText(person.name) + '</h2><p class="character-series">' + safeText(person.series) + '</p><p>' + safeText(person.biography) + '</p><div class="trait-list">' + (person.traits || []).slice(0, 3).map(function (trait) { return '<span>' + safeText(trait) + '</span>'; }).join("") + '</div><button class="simple-button" type="button" data-character-profile="' + safeText(person.id) + '">View profile</button> <button class="simple-button quiet-button" type="button" data-save-character="' + safeText(person.id) + '">Save</button></div></article>';
            });
            $("#CharactersGrid").html(html || '<p class="empty-message">No characters match these filters.</p>');
        }
        select.off("change").on("change", showCharacters);
        seriesSelect.off("change").on("change", showCharacters);
                showCharacters();


        $(document).off("click", "[data-character-profile]").on("click", "[data-character-profile]", function () {
            const person = (data.characterProfiles || []).find(function (item) { return item.id === $(this).data("character-profile"); }.bind(this));
            if (!person) return;
            $("#characterModalTitle").text(person.name);
            $("#characterModalBody").html(
                '<img class="profile-modal-picture mb-3" src="' + safeText(person.image || getCategoryImage(person.category)) + '" alt="' + safeText(person.name) + '">' +
                '<div class="mb-3 d-flex align-items-center flex-wrap gap-2">' +
                '  <span class="badge bg-purple-neon px-3 py-2 text-white">' + safeText(getCategoryName(person.category)) + '</span>' +
                '  <span class="text-white fw-semibold fs-6"><i class="fa-solid fa-tv me-1 text-purple"></i> ' + safeText(person.series) + '</span>' +
                '</div>' +
                '<div class="character-modal-bio mb-3">' +
                '  <h6 class="text-uppercase text-purple fw-bold mb-1" style="font-size: 0.75rem; letter-spacing: 1px;">Biography</h6>' +
                '  <p class="text-light mb-0" style="color: #e2d9f3 !important; font-size: 0.95rem; line-height: 1.6;">' + safeText(person.biography) + '</p>' +
                '</div>' +
                '<div class="character-modal-traits">' +
                '  <h6 class="text-uppercase text-purple fw-bold mb-2" style="font-size: 0.75rem; letter-spacing: 1px;">Key Traits</h6>' +
                '  <div class="d-flex flex-wrap gap-2">' +
                (person.traits || []).map(function (trait) {
                    return '<span class="badge rounded-pill bg-dark border border-secondary text-light px-3 py-2" style="font-size: 0.82rem;">' + safeText(trait) + '</span>';
                }).join("") +
                '  </div>' +
                '</div>'
            );
            new bootstrap.Modal(document.getElementById("characterModal")).show();
        });
    $(document).off("click", "[data-save-character]").on("click", "[data-save-character]", function () {
            const person = (data.characterProfiles || []).find(function (item) { return item.id === $(this).data("save-character"); }.bind(this));
            if (person) addBookmark(person.id, person.name, "character");
        });

    }).fail(function () { $("#CharactersGrid").html('<p class="empty-message">Character profiles could not be loaded.</p>'); });
}

function loadAudioPage() {
    $.getJSON("data.json", function (data) {
        let html = "";
        (data.audioClips || []).forEach(function (clip, index) {
            html += '<article class="audio-card" style="--card-number:' + index + '"><div class="audio-card-art"><img src="' + safeText(clip.image || getCategoryImage(clip.category)) + '" alt="FandomVerse artwork"><span><i class="fa-solid fa-music"></i></span></div><div class="audio-card-copy"><span class="content-tag">LICENSED MUSIC</span><h2>' + safeText(clip.title) + '</h2><p>' + safeText(clip.description) + '</p><p>Music by ' + safeText(clip.artist || "the credited artist") + ' · <a href="' + safeText(clip.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Track source</a> · <a href="' + safeText(clip.licenseUrl) + '" target="_blank" rel="noopener noreferrer">License terms</a></p><audio class="audio-player" controls preload="none" src="' + safeText(clip.audioUrl) + '">Your browser does not support audio playback.</audio><button class="simple-button quiet-button" type="button" data-save-audio="' + safeText(clip.id) + '">Save audio</button></div></article>';
        });
        $("#AudioGrid").html(html || '<p class="empty-message">No audio clips are available yet.</p>');
        $(document).off("click", "[data-save-audio]").on("click", "[data-save-audio]", function () {
            const clip = (data.audioClips || []).find(function (item) { return item.id === $(this).data("save-audio"); }.bind(this));
            if (clip) addBookmark(clip.id, clip.title, "audio");
        });
    }).fail(function () { $("#AudioGrid").html('<p class="empty-message">Audio clips could not be loaded.</p>'); });
}

function loadGalleryPage() {
    const select = $("#galleryCategory");
    select.append(fandomCategories.map(function (item) { return '<option value="' + item.id + '">' + safeText(item.name) + '</option>'; }).join(""));
    $.getJSON("data.json", function (data) {
        function showPictures() {
            const category = select.val() || "all";
            let html = "";
            (data.imageGalleries || []).filter(function (gallery) { return category === "all" || gallery.category === category; }).forEach(function (gallery) {
                gallery.images.forEach(function (picture, index) {
                    html += '<button class="full-gallery-tile" type="button" data-image-title="' + safeText(picture.title) + '" data-image-src="' + safeText(picture.image || getCategoryImage(gallery.category)) + '" style="--card-number:' + index + '"><img src="' + safeText(picture.image || getCategoryImage(gallery.category)) + '" alt="' + safeText(picture.title) + '"><span>' + safeText(picture.title) + '</span><small>' + safeText(getCategoryName(gallery.category)) + '</small></button>';
                });
            });
            $("#FullGalleryGrid").html(html || '<p class="empty-message">No pictures are available for this community yet.</p>');
        }
        select.off("change").on("change", showPictures);
        showPictures();
        $(document).off("click", "[data-image-src]").on("click", "[data-image-src]", function () {
            const image = $(this).data("image-src");
            $("#fullImageTitle").text($(this).data("image-title"));
            $("#fullImageView").attr({ src: image, alt: $(this).data("image-title") });
            new bootstrap.Modal(document.getElementById("fullImageModal")).show();
        });
    }).fail(function () { $("#FullGalleryGrid").html('<p class="empty-message">Gallery pictures could not be loaded.</p>'); });
}


