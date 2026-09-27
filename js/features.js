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
        anime: "images/demon-slayer.jpg", gaming: "images/hero-image.jpeg",
        movies: "images/berserk.jpeg", "tv-shows": "images/death-note.jpg",
        kpop: "images/anime.jpeg", comics: "images/my-hero-academia.jpg",
        all: "images/logo.png",
        manga: "images/one-piece.jpeg"
    };
    return pictures[id] || "images/anime.jpeg";
}

function addBookmark(id, title, kind) {
    const saved = getSavedList("fandom_bookmarks");
    if (!saved.some(function (item) { return item.id === id; })) {
        saved.push({ id: id, title: title, kind: kind || "content" });
        localStorage.setItem("fandom_bookmarks", JSON.stringify(saved));
    }
    alert("Saved in your Bookmarks.");
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

function loadCategoryData() {
    const params = new URLSearchParams(window.location.search);
    selectedCategory = params.get("type") || "all";
    $("#CategoryTitle").html(safeText(selectedCategory === "all" ? "All Fandoms" : getCategoryName(selectedCategory)) + ' <span class="text-purple">Hub</span>');
    $("#CategoryPills button").removeClass("active").filter('[data-cat="' + selectedCategory + '"]').addClass("active");
    $("#FilterSearch").val(params.get("search") || "");

    $.getJSON("data.json", function (data) {
        categoryData = data;
        categoryItems = [];
        (data.contentCards || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.title, description: item.shortDescription, image: item.thumbnail, category: item.category, type: item.contentType || "article", tags: item.tags || [], date: item.date || "", popularity: item.popularity || 0, details: item.description || item.shortDescription, kind: "content" });
        });
        (data.trailersAndMedia || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.title, description: item.description, image: item.thumbnail, category: item.category, type: item.contentType === "audio" || item.contentType === "podcast" ? "audio" : "video", tags: [item.contentType || "trailer"], date: item.date || "", details: item.description, kind: "media", link: item.embedUrl });
        });
        (data.audioClips || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.title, description: item.description, image: "", category: item.category, type: "audio", tags: ["audio", "sample"], date: item.date || "", details: item.description, kind: "audio", link: item.audioUrl });
        });
        (data.imageGalleries || []).forEach(function (gallery) {
            gallery.images.forEach(function (image, index) {
                categoryItems.push({ id: gallery.category + "-gallery-" + index, title: image.title, description: "Open this image in the " + getCategoryName(gallery.category) + " gallery.", image: image.image, category: gallery.category, type: "gallery", tags: ["gallery", "images"], date: "2026-09-25", details: image.title, kind: "gallery" });
            });
        });
        (data.characterProfiles || []).forEach(function (person) {
            categoryItems.push({ id: person.id, title: person.name, description: person.biography, image: person.image, category: person.category, type: "character", tags: person.traits || [], date: "", details: person.biography, kind: "character" });
        });
        (data.eventHighlights || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.title, description: item.description, image: "", category: item.associatedCategory, type: "event", tags: [item.location], date: item.date, details: item.description + " Location: " + item.location, kind: "event" });
        });
        (data.merchandiseShowcase || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.name, description: item.shortDescription, image: item.image, category: item.category || "anime", type: "merchandise", tags: [item.priceRange], date: "", details: item.shortDescription + " Price: " + item.priceRange, kind: "merch" });
        });
        (data.upcomingReleases || []).forEach(function (item) {
            categoryItems.push({ id: item.id, title: item.title, description: item.description, image: "", category: item.category, type: "release", tags: [], date: item.date, details: item.description + " Date: " + item.date, kind: "release" });
        });
        renderCategoryItems();
        renderCategoryPeople();
        renderCategoryGallery();
    }).fail(function () {
        $("#CategoryListingGrid").html('<p class="text-warning">Could not load the fandom data. Start this site with a local web server.</p>');
    });

    $(document).off("click", "#CategoryPills button").on("click", "#CategoryPills button", function () {
        selectedCategory = $(this).data("cat");
        $("#CategoryPills button").removeClass("active");
        $(this).addClass("active");
        renderCategoryItems(); renderCategoryPeople(); renderCategoryGallery();
    });
    $(document).off("input change", "#FilterSearch, #FilterType, #FilterTag, #SortBy").on("input change", "#FilterSearch, #FilterType, #FilterTag, #SortBy", renderCategoryItems);
    $(document).off("click", "[data-view]").on("click", "[data-view]", function () {
        const view = $(this).data("view");
        $("[data-view]").removeClass("active"); $(this).addClass("active");
        $("#ContentSection, #CharacterSection, #GallerySection").hide();
        if (view === "characters") $("#CharacterSection").show();
        else if (view === "gallery") $("#GallerySection").show();
        else $("#ContentSection").show();
    });
    $(document).off("click", "[data-open-detail]").on("click", "[data-open-detail]", function () {
        const item = categoryItems.find(function (entry) { return entry.id === $(this).data("open-detail"); }.bind(this));
        if (item) {
            const related = categoryItems.filter(function (entry) { return entry.category === item.category && entry.id !== item.id; }).slice(0, 2).map(function (entry) { return entry.title; }).join(" · ");
            showDetail(item.title, item.details || item.description, item.image, (item.category ? getCategoryName(item.category) + " · " + item.type : item.type) + (related ? " · Related: " + related : ""));
        }
    });
    $(document).off("click", "[data-save-item]").on("click", "[data-save-item]", function () {
        const item = categoryItems.find(function (entry) { return entry.id === $(this).data("save-item"); }.bind(this));
        if (item) addBookmark(item.id, item.title, item.kind);
    });
    $(document).off("click", "[data-gallery-image]").on("click", "[data-gallery-image]", function () {
        $("#imageModalTitle").text($(this).data("title"));
        $("#largeGalleryImage").attr({ src: $(this).data("gallery-image"), alt: $(this).data("title") });
        new bootstrap.Modal(document.getElementById("imageModal")).show();
    });
}

function renderCategoryItems() {
    if (!categoryData) return;
    const word = String($("#FilterSearch").val() || "").toLowerCase();
    const type = $("#FilterType").val() || "all";
    const tag = $("#FilterTag").val() || "all";
    const categoryTags = [];
    categoryItems.filter(function (item) { return selectedCategory === "all" || item.category === selectedCategory; }).forEach(function (item) {
        item.tags.forEach(function (itemTag) { if (!categoryTags.includes(itemTag)) categoryTags.push(itemTag); });
    });
    $("#FilterTag").html('<option value="all">All tags</option>' + categoryTags.map(function (itemTag) { return '<option value="' + safeText(itemTag) + '">' + safeText(itemTag) + '</option>'; }).join(""));
    if (tag !== "all" && categoryTags.includes(tag)) $("#FilterTag").val(tag);
    let items = categoryItems.filter(function (item) {
        const rightCategory = selectedCategory === "all" || item.category === selectedCategory;
        const rightType = type === "all" || item.type === type;
        const searchable = (item.title + " " + item.description + " " + item.category + " " + item.tags.join(" ")).toLowerCase();
        return rightCategory && rightType && (tag === "all" || item.tags.includes(tag)) && searchable.includes(word);
    });
    const sort = $("#SortBy").val() || "newest";
    if (sort === "alphabetical") items.sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (sort === "popularity") items.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); });
    if (sort === "newest") items.sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (!items.length) { $("#CategoryListingGrid").html('<p class="empty-message">No matching items yet. Try another filter.</p>'); return; }
    let html = "";
    items.forEach(function (item) {
        html += '<div class="col-12 col-md-6 col-lg-4"><article class="content-card h-100">' +
            '<img class="card-img-top" src="' + safeText(item.image || getCategoryImage(item.category)) + '" alt="' + safeText(item.title) + '" onerror="this.onerror=null;this.src=\'' + safeText(getCategoryImage(item.category)) + '\'">' +
            '<div class="card-body"><span class="content-tag">' + safeText(getCategoryName(item.category)) + ' · ' + safeText(item.type) + '</span><h3>' + safeText(item.title) + '</h3><p>' + safeText(item.description) + '</p>' +
            (item.type === "audio" && item.link ? '<audio class="audio-player" controls preload="none" src="' + safeText(item.link) + '">Your browser does not support audio.</audio>' : '') +
            '<div class="card-buttons">' + (item.type === "article" ? '<a class="simple-button" href="?page=article&id=' + encodeURIComponent(item.id) + '">Open article</a>' : '<button class="simple-button" data-open-detail="' + safeText(item.id) + '">Read more</button>') + '<button class="simple-button quiet-button" data-save-item="' + safeText(item.id) + '">Save</button></div></div></article></div>';
    });
    $("#CategoryListingGrid").html(html);
}

function renderCategoryPeople() {
    if (!categoryData) return;
    let people = (categoryData.characterProfiles || []).filter(function (person) { return selectedCategory === "all" || person.category === selectedCategory; });
    let html = "";
    people.forEach(function (person) {
        html += '<div class="col-6 col-md-4 col-lg-3"><article class="person-card"><img src="' + safeText(person.image || getCategoryImage(person.category)) + '" alt="' + safeText(person.name) + '" onerror="this.onerror=null;this.src=\'' + safeText(getCategoryImage(person.category)) + '\'"><h4>' + safeText(person.name) + '</h4><p>' + safeText(person.series) + '</p><button class="simple-button" data-person-id="' + safeText(person.id) + '">Profile</button> <button class="simple-button quiet-button" data-person-save="' + safeText(person.id) + '">Save</button></article></div>';
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
    let galleries = (categoryData.imageGalleries || []).filter(function (item) { return selectedCategory === "all" || item.category === selectedCategory; });
    let html = "";
    galleries.forEach(function (gallery) {
        gallery.images.forEach(function (image) {
            html += '<div class="col-6 col-md-4"><button class="gallery-tile" data-gallery-image="' + safeText(image.image) + '" data-title="' + safeText(image.title) + '"><img src="' + safeText(image.image) + '" alt="' + safeText(image.title) + '"><span>' + safeText(image.title) + '</span></button></div>';
        });
    });
    $("#GalleryGrid").html(html || '<p>No gallery images are available.</p>');
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
        $.getJSON("data.json", function (data) {
            const items = (data.merchandiseShowcase || []).filter(function (item) { return cat === "all" || item.category === cat; });
            let html = "";
            items.forEach(function (item) {
                html += '<div class="col-6 col-md-4 col-lg-3"><article class="shop-card"><img src="' + safeText(item.image) + '" alt="' + safeText(item.name) + '"><div class="shop-copy"><span class="content-tag">' + safeText(getCategoryName(item.category)) + '</span><h2>' + safeText(item.name) + '</h2><p>' + safeText(item.shortDescription) + '</p><strong>$' + Number(item.price).toFixed(2) + '</strong><button class="simple-button" data-add-cart="' + safeText(item.id) + '">Add to cart</button></div></article></div>';
            });
            $("#ShopGrid").html(html);
            $("#shopCartCount").text(getSavedList("fandom_cart").length);
        });
    }
    $("#shopCategory").off("change").on("change", render);
    $(document).off("click", "[data-add-cart]").on("click", "[data-add-cart]", function () { addToCart($(this).data("add-cart")); $("#shopCartCount").text(getSavedList("fandom_cart").length); });
    render();
}

function addToCart(id) {
    const cart = getSavedList("fandom_cart");
    cart.push(id);
    localStorage.setItem("fandom_cart", JSON.stringify(cart));
    updateCartCount();
    showSiteAlert("Added to cart.");
}

function showSiteAlert(message) {
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
        const cart = getSavedList("fandom_cart");
        const products = data.merchandiseShowcase || [];
        let total = 0;
        let html = "";
        cart.forEach(function (id, index) {
            const item = products.find(function (product) { return product.id === id; });
            if (!item) return;
            total += Number(item.price) || 0;
            html += '<div class="cart-row"><span>' + safeText(item.name) + '</span><strong>$' + Number(item.price).toFixed(2) + '</strong><button class="simple-button quiet-button" data-remove-cart="' + index + '">Remove</button></div>';
        });
        $("#CartList").html(html || '<p>Your cart is empty. Visit the <a href="?page=shop" data-page="shop">shop</a> to add a sample item.</p>');
        $("#CartTotal").text("$" + total.toFixed(2));
    });
    $(document).off("click", "[data-remove-cart]").on("click", "[data-remove-cart]", function () {
        const cart = getSavedList("fandom_cart"); cart.splice(Number($(this).data("remove-cart")), 1);
        localStorage.setItem("fandom_cart", JSON.stringify(cart)); updateCartCount(); loadCartPage();
    });
    $("#clearCart").off("click").on("click", function () { localStorage.setItem("fandom_cart", "[]"); updateCartCount(); loadCartPage(); });
}

function loadBookmarksPage() {
    $.getJSON("data.json", function (data) {
        const galleryItems = [];
        (data.imageGalleries || []).forEach(function (gallery) {
            gallery.images.forEach(function (image, index) {
                galleryItems.push({
                    id: gallery.category + "-gallery-" + index,
                    title: image.title,
                    shortDescription: "Image from the " + getCategoryName(gallery.category) + " gallery."
                });
            });
        });
        const allItems = [].concat(
            data.contentCards || [], data.trailersAndMedia || [], data.audioClips || [],
            galleryItems, data.characterProfiles || [], data.eventHighlights || [],
            data.merchandiseShowcase || [], data.upcomingReleases || []
        );
        const saved = getSavedList("fandom_bookmarks");
        let html = "";
        saved.forEach(function (bookmark, index) {
            const item = allItems.find(function (entry) { return entry.id === bookmark.id; });
            const title = bookmark.title || (item && (item.title || item.name || item.label)) || "Saved item";
            const note = sessionStorage.getItem("note-" + bookmark.id) || "";
            html += '<div class="col-md-6"><article class="bookmark-card"><h2>' + safeText(title) + '</h2><p>' + safeText(item ? item.shortDescription || item.description || item.biography : bookmark.kind) + '</p><label for="note-' + index + '">Session note</label><textarea id="note-' + index + '" class="form-control" data-note-id="' + safeText(bookmark.id) + '" rows="2" placeholder="Only kept until this browser tab closes">' + safeText(note) + '</textarea><button class="simple-button quiet-button" data-remove-bookmark="' + index + '">Remove</button></article></div>';
        });
        $("#BookmarksGrid").html(html || '<p class="empty-message">Nothing saved yet. Browse a category and choose Save.</p>');
    });
    $(document).off("input", "[data-note-id]").on("input", "[data-note-id]", function () { sessionStorage.setItem("note-" + $(this).data("note-id"), $(this).val()); });
    $(document).off("click", "[data-remove-bookmark]").on("click", "[data-remove-bookmark]", function () {
        const saved = getSavedList("fandom_bookmarks"); const removed = saved.splice(Number($(this).data("remove-bookmark")), 1)[0];
        if (removed) sessionStorage.removeItem("note-" + removed.id);
        localStorage.setItem("fandom_bookmarks", JSON.stringify(saved)); loadBookmarksPage();
    });
    $("#clearBookmarks").off("click").on("click", function () { localStorage.setItem("fandom_bookmarks", "[]"); loadBookmarksPage(); });
    $("#exportBookmarks").off("click").on("click", function () {
        const saved = getSavedList("fandom_bookmarks");
        const text = saved.map(function (item) { return "• " + item.title + " (" + item.kind + ")"; }).join("\n") || "No bookmarks saved.";
        const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["FandomVerse bookmarks\n\n" + text], { type: "text/plain" })); link.download = "fandomverse-bookmarks.txt"; link.click(); URL.revokeObjectURL(link.href);
    });
}

function loadAboutPage() { $("#visitorTotal").text(localStorage.getItem("visitor_count") || "1"); }
function loadContactPage() {
    $("#contactForm").off("submit").on("submit", function (event) {
        event.preventDefault();
        alert("We will contact you soon.");
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
function loadDemoForm(page) {
    $("#demoForm").off("submit").on("submit", function (event) {
        event.preventDefault();
        alert(page === "login" ? "Login successfully." : "Registration successfully Done.");
        this.reset();
    });
}

function addChatMessage(text, className) {
    $("#chatMessages").append('<p class="' + className + '">' + safeText(text) + '</p>');
    $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
}

function answerChat(question) {
    const words = String(question || "").toLowerCase();
    $.getJSON("data.json", function (data) {
        const chosenCategory = fandomCategories.find(function (item) { return words.includes(item.id) || words.includes(item.name.toLowerCase()); });
        if (words.includes("cart")) {
            addChatMessage("Your sample cart is saved in this browser. It has no checkout or payment step.", "chat-answer");
            $("#chatMessages").append('<a class="chat-link" href="?page=cart" data-page="cart">Open your cart</a>');
            return;
        }
        if (chosenCategory && (words.includes("recommend") || words.includes("suggest") || words.includes("like") || words.includes("interest"))) {
            const pick = (data.contentCards || []).find(function (item) { return item.category === chosenCategory.id; });
            const suggestion = pick ? pick.title + " — " + pick.shortDescription : "Browse the category hub to find a new favorite.";
            addChatMessage("For " + chosenCategory.name + ", try: " + suggestion, "chat-answer");
            $("#chatMessages").append('<a class="chat-link" href="?page=category&type=' + chosenCategory.id + '" data-page="category">Open "' + safeText(chosenCategory.name) + '" hub</a>');
            return;
        }
        const rules = data.chatbotDataset || [];
        let answer = rules.find(function (rule) { return rule.keywords.some(function (word) { return words.includes(word); }); });
        if (!answer && words.includes("bookmark")) answer = { response: "Open Bookmarks to see your saved items. Notes last only for this browser session.", targetPage: "bookmarks" };
        if (!answer && (words.includes("anime") || words.includes("game") || words.includes("movie") || words.includes("manga"))) answer = { response: "Open a category hub to browse its articles, characters, images, media, and events.", targetPage: "category" };
        if (!answer) answer = { response: "I can help you find categories, character profiles, events, trailers, bookmarks, and merchandise. What would you like to explore?", targetPage: "category" };
        addChatMessage(answer.response, "chat-answer");
        if (answer.targetPage) {
            const label = answer.targetPage === "category" ? "Open category hubs" : "Open " + answer.targetPage;
            $("#chatMessages").append('<a class="chat-link" href="?page=' + safeText(answer.targetPage) + '" data-page="' + safeText(answer.targetPage) + '">' + safeText(label) + '</a>');
        }
        (answer.suggestedQuickReplies || []).slice(0, 3).forEach(function (reply) { $("#chatMessages").append('<button class="chat-reply" type="button" data-question="' + safeText(reply) + '">' + safeText(reply) + '</button>'); });
    });
}

$(function () {
    $(document).on("click", "#chatOpen", function () { $("#chatBox").prop("hidden", false); $("#chatInput").trigger("focus"); });
    $(document).on("click", "#chatClose", function () { $("#chatBox").prop("hidden", true); });
    $(document).on("submit", "#chatForm", function (event) { event.preventDefault(); const question = $("#chatInput").val().trim(); if (!question) return; addChatMessage(question, "chat-question"); $("#chatInput").val(""); answerChat(question); });
    $(document).on("click", "[data-question]", function () { const question = $(this).data("question"); addChatMessage(question, "chat-question"); answerChat(question); });
    $(document).on("click", "#btnModalWatchlist", function () { addBookmark("media-" + Date.now(), $(this).data("video-title") || "Featured video", "media"); });
    $(document).on("submit", ".newsletter-form", function (event) { event.preventDefault(); alert("Thanks for joining the sample newsletter. This demo does not save email addresses."); this.reset(); });
    $(document).on("click", "[data-save-home]", function () { addBookmark($(this).data("save-home"), $(this).data("title"), "content"); });
    $(document).on("click", "[data-save-media]", function () { addBookmark($(this).data("save-media"), $(this).data("title"), "media"); });
    $(document).on("click", ".nav-link[data-page]", function () { $(".nav-link").removeClass("active"); $(this).addClass("active"); });
    $(document).on("click", "[data-page='home']", function () { $(".nav-link").removeClass("active").filter("[data-page='home']").addClass("active"); });
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
            $("#characterModalBody").html('<img class="profile-modal-picture" src="' + safeText(person.image || getCategoryImage(person.category)) + '" alt="' + safeText(person.name) + '"><p class="content-tag">' + safeText(getCategoryName(person.category)) + ' · ' + safeText(person.series) + '</p><p>' + safeText(person.biography) + '</p><p><strong>Traits:</strong> ' + safeText((person.traits || []).join(", ")) + '</p>');
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
            html += '<article class="audio-card" style="--card-number:' + index + '"><div class="audio-card-art"><img src="' + safeText(getCategoryImage(clip.category)) + '" alt="FandomVerse artwork"><span><i class="fa-solid fa-music"></i></span></div><div class="audio-card-copy"><span class="content-tag">LICENSED MUSIC</span><h2>' + safeText(clip.title) + '</h2><p>' + safeText(clip.description) + '</p><p>Music by ' + safeText(clip.artist || "the credited artist") + ' · <a href="' + safeText(clip.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Track source</a> · <a href="' + safeText(clip.licenseUrl) + '" target="_blank" rel="noopener noreferrer">License terms</a></p><audio class="audio-player" controls preload="none" src="' + safeText(clip.audioUrl) + '">Your browser does not support audio playback.</audio><button class="simple-button quiet-button" type="button" data-save-audio="' + safeText(clip.id) + '">Save audio</button></div></article>';
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


