// This small router loads each page into the main area without reloading the site.
$(function () {
    const allowedPages = ["home", "category", "articles", "article", "characters", "audio", "gallery", "trailers", "events", "shop", "cart", "bookmarks", "about", "contact", "login", "register", "sitemap"];

    function currentPage() {
        const params = new URLSearchParams(window.location.search);
        let page = params.get("page") || "home";
        if (page === "event") page = "events";
        return allowedPages.includes(page) ? page : "404";
    }

    function loadPage(page, params, updateAddress) {
        if (!allowedPages.includes(page)) {
            $("#content").html('<section class="page-wrap"><h1>Page not found</h1><p>Use the menu to choose another page.</p></section>');
            return;
        }

        $("#content").html('<div class="page-wrap"><p>Loading page...</p></div>');
        $.get("pages/" + page + ".html")
            .done(function (html) {
                $("#content").html(html);
                if (updateAddress) {
                    params.set("page", page);
                    history.pushState({}, "", "?" + params.toString());
                }
                startPage(page, params);
                const menu = document.getElementById("navbarMenu");
                const menuPanel = bootstrap.Collapse.getInstance(menu);
                if (menuPanel) menuPanel.hide();
                window.scrollTo(0, 0);
            })
            .fail(function () {
                $("#content").html('<section class="page-wrap"><h1>Page not found</h1><p>This page could not be opened.</p></section>');
            });
    }

    function startPage(page, params) {
        $(".nav-link").removeClass("active");
        if (page === "category") $("#categoryDropdown").addClass("active");
        else $(".nav-link[data-page='" + page + "']").addClass("active");
        if (page !== "home" && page !== "404") {
            const titles = { category: "Category hub", articles: "Articles", article: "Article", characters: "Characters", audio: "Audio", gallery: "Gallery", trailers: "Trailers", events: "Events", shop: "Shop", cart: "Cart", bookmarks: "Bookmarks", about: "About", contact: "Contact", login: "Login", register: "Sign up", sitemap: "Sitemap" };
            const title = page === "category" ? safeText(getCategoryName(params.get("type") || "all") + " hub") : safeText(titles[page]);
            $("#content > section, #content > div").first().prepend('<nav class="bread-crumb" aria-label="Breadcrumb"><a href="?page=home" data-page="home">Home</a><span> / ' + title + '</span></nav>');
        }
        if (page === "home") loadHomeData();
        if (page === "category") loadCategoryData();
        if (page === "articles") loadArticlesPage();
        if (page === "article") loadArticlePage(params.get("id"));
        if (page === "characters") loadCharactersPage();
        if (page === "audio") loadAudioPage();
        if (page === "gallery") loadGalleryPage();
        if (page === "trailers") loadTrailersData();
        if (page === "events") loadEventsPage();
        if (page === "shop") loadShopPage();
        if (page === "cart") loadCartPage();
        if (page === "bookmarks") loadBookmarksPage();
        if (page === "about") loadAboutPage();
        if (page === "contact") loadContactPage();
        if (page === "login" || page === "register") loadDemoForm(page);
        if (page === "category" && params.get("type")) {
            $("#CategoryPills [data-cat='" + params.get("type") + "']").trigger("click");
        }
    }

    $(document).on("click", "a[data-page]", function (event) {
        const page = $(this).data("page");
        const params = new URLSearchParams($(this).attr("href").split("?")[1] || "");
        event.preventDefault();
        loadPage(page, params, true);
    });

    $(document).on("submit", "#globalSearch", function (event) {
        event.preventDefault();
        const params = new URLSearchParams();
        params.set("search", $("#globalSearchInput").val().trim());
        loadPage("category", params, true);
    });

    window.addEventListener("popstate", function () {
        loadPage(currentPage(), new URLSearchParams(window.location.search), false);
    });

    loadPage(currentPage(), new URLSearchParams(window.location.search), false);
});
