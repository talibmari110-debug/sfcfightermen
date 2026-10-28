
/* ==========================================================================
   FandomVerse - Simple Client-Side JavaScript
   ========================================================================== */

// Login and sign up are demo screens only. No account details are saved.
$(document).ready(function () {
    updateCartCount();
    if (typeof updateAuthUI === "function") updateAuthUI();
});

// --- 4. LANDING PAGE DATA LOADER (JSON) ---
function loadHomeData() {
    $.getJSON("data.json", function (data) {
        
        // 1. Render Categories
        if ($("#CategoryListing").length && data.categories) {
            let catHtml = "";
            const categoryIcons = {
                anime: "fa-torii-gate", gaming: "fa-gamepad", movies: "fa-film",
                "tv-shows": "fa-tv", kpop: "fa-music", comics: "fa-mask", manga: "fa-book-open"
            };
            $.each(data.categories, function (i, cat) {
                catHtml += `
                    <a class="home-category-card" href="?page=category&type=${encodeURIComponent(cat.id)}" data-page="category" style="--category-number:${i}">
                        <span class="home-category-icon"><i class="fa-solid ${categoryIcons[cat.id] || "fa-star"}" aria-hidden="true"></i></span>
                        <span class="home-category-name">${safeText(cat.name)}</span>
                        <span class="home-category-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
                    </a>`;
            });
            $("#CategoryListing").html(catHtml);
        }

        // 2. Render Featured Content
        if ($("#FeaturedListing").length && data.contentCards) {
            let featHtml = "";
            $.each(data.contentCards.slice(0, 3), function (i, item) {
                featHtml += `
                    <div class="col-12 col-md-4">
                        <div class="card bg-dark text-white border-secondary h-100">
                            <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" class="card-img-top" style="height:180px; object-fit:cover;">
                            <div class="card-body">
                                <h5 class="fw-bold">${item.title}</h5>
                                <p class="small text-muted">${item.shortDescription}</p>
                                <button data-save-home="${item.id}" data-title="${item.title}" class="btn btn-sm btn-outline-light">
                                    <i class="fa-regular fa-bookmark"></i> Bookmark
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
            $("#FeaturedListing").html(featHtml);

            // Featured Highlights Bookmark click handler
            $(document).off("click", "[data-save-home]").on("click", "[data-save-home]", function (e) {
                e.preventDefault();
                if (typeof addBookmark === "function") {
                    addBookmark($(this).data("save-home"), $(this).data("title"), "content");
                }
            });
        }

        // 3. Render Trailers
        if ($("#TrailersListing").length && data.trailersAndMedia) {
            let mediaHtml = "";
            $.each(data.trailersAndMedia.slice(0, 1), function (i, video) {
                mediaHtml += `
                    <div class="col-lg-12 col-md-6">
                        <div class="ratio ratio-16x9 rounded overflow-hidden">
                            <iframe src="${video.embedUrl}" title="${video.title}" loading="lazy" allowfullscreen></iframe>
                        </div>
                        <h6 class="text-white mt-2 fw-bold">${video.title}</h6>
                    </div>`;
            });
            $("#TrailersListing").html(mediaHtml);
        }

        // 4. Render Events
        if ($("#EventsListing").length && data.eventHighlights) {
            let eventHtml = "";
            $.each(data.eventHighlights.slice(0, 2), function (i, evt) {
                eventHtml += `
                    <div class="col-12 col-md-6">
                        <div class="p-3 bg-dark text-white rounded border border-secondary">
                            <h5 class="fw-bold">${evt.title}</h5>
                            <small class="text-muted">${evt.date} | ${evt.location}</small>
                            <p class="small m-0 mt-2">${evt.description}</p>
                        </div>
                    </div>`;
            });
            $("#EventsListing").html(eventHtml);
        }

        // 5. UPCOMING RELEASES CALENDAR (Interactive Schedule & Filters)
        if ($("#ReleaseListing").length && data.upcomingReleases) {
            let activeCat = "all";
            let activeMonth = "all";

            function parseReleaseDate(dateStr) {
                const parts = (dateStr || "").split(" ");
                let month = "2026";
                let day = "TBA";
                if (parts.length >= 2) {
                    month = parts[0].substring(0, 3).toUpperCase();
                    day = parseInt(parts[1], 10) || "TBA";
                    if (typeof day === "number" && day < 10) day = "0" + day;
                } else if (dateStr) {
                    month = dateStr.substring(0, 4).toUpperCase();
                    day = "26";
                }
                return { month: month, day: day };
            }

            function renderUpcomingReleases() {
                let filtered = data.upcomingReleases.filter(function (release) {
                    const matchCat = (activeCat === "all" || release.category === activeCat);
                    const matchMonth = (activeMonth === "all" || (release.date && release.date.toLowerCase().includes(activeMonth.toLowerCase())));
                    return matchCat && matchMonth;
                });

                if (!filtered.length) {
                    $("#ReleaseListing").html('<div class="col-12 text-center py-5 text-muted"><i class="fa-regular fa-calendar-xmark fs-2 mb-2 d-block"></i>No upcoming releases found matching this filter.</div>');
                    return;
                }

                let releaseHtml = "";
                $.each(filtered, function (i, release) {
                    const parsed = parseReleaseDate(release.date);
                    const fallbackImg = typeof getCategoryImage === "function" ? getCategoryImage(release.category) : "images/logo.png";
                    const imgSrc = release.image || fallbackImg;

                    releaseHtml += `
                        <div class="col-12 col-md-6 col-lg-4 col-xl-3 release-item-col" data-release-id="${release.id}">
                            <article class="release-calendar-card">
                                <div class="release-card-cover">
                                    <img src="${safeText(imgSrc)}" alt="${safeText(release.title)}" loading="lazy" class="release-poster-img" onerror="this.src='${fallbackImg}'">
                                    <span class="release-category-badge">${safeText(release.category.toUpperCase())}</span>
                                    <div class="calendar-date-block">
                                        <span class="cal-month">${parsed.month}</span>
                                        <span class="cal-day">${parsed.day}</span>
                                    </div>
                                </div>
                                <div class="release-card-body">
                                    <div class="release-meta-date">
                                        <i class="fa-regular fa-calendar-check me-1 text-purple"></i> ${safeText(release.date)}
                                    </div>
                                    <h3 class="release-title">${safeText(release.title)}</h3>
                                    <p class="release-desc">${safeText(release.description)}</p>
                                    <div class="release-card-actions">
                                        <a class="release-source-btn" href="${safeText(release.source)}" target="_blank" rel="noopener noreferrer">
                                            <span>Official details</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                        </a>
                                        <button class="release-bookmark-btn" data-save-release="${safeText(release.id)}" data-title="${safeText(release.title)}" title="Bookmark release" aria-label="Bookmark release">
                                            <i class="fa-regular fa-bookmark"></i>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        </div>`;
                });
                $("#ReleaseListing").html(releaseHtml);
            }

            // Category filter click
            $(document).off("click", "#releaseCategoryPills button").on("click", "#releaseCategoryPills button", function () {
                $("#releaseCategoryPills button").removeClass("active");
                $(this).addClass("active");
                activeCat = $(this).data("release-cat") || "all";
                renderUpcomingReleases();
            });

            // Month filter click
            $(document).off("click", "#releaseMonthPills button").on("click", "#releaseMonthPills button", function () {
                $("#releaseMonthPills button").removeClass("active");
                $(this).addClass("active");
                activeMonth = $(this).data("release-month") || "all";
                renderUpcomingReleases();
            });

            // Bookmark release click handler (with auth requirement)
            $(document).off("click", "[data-save-release]").on("click", "[data-save-release]", function () {
                addBookmark($(this).data("save-release"), $(this).data("title"), "release");
            });

            renderUpcomingReleases();
        }

        // 5. Render Merchandise
        if ($("#MerchListing").length && data.merchandiseShowcase) {
            let merchHtml = "";
            $.each(data.merchandiseShowcase.slice(0, 4), function (i, item) {
                merchHtml += `
                    <div class="col-6 col-md-3">
                        <div class="card bg-dark text-white border-secondary h-100 text-center p-2">
                            <img src="${item.image}" alt="${item.name}" loading="lazy" class="card-img-top" style="height:150px; object-fit:cover;">
                            <h6 class="fw-bold text-truncate mt-2">${item.name}</h6>
                            <p class="text-purple fw-bold my-1">${item.priceRange}</p>
                            <button onclick="addToCart('${item.id}')" class="btn btn-sm btn-outline-light">
                                Add to Cart
                            </button>
                        </div>
                    </div>`;
            });
            $("#MerchListing").html(merchHtml);
        }

        // Show a few real profiles from the same character list used on the Characters page.
        if ($("#HomeCharacterListing").length && data.characterProfiles) {
            let characterHtml = "";
            $.each(data.characterProfiles.slice(0, 4), function (i, person) {
                characterHtml += `
                    <article class="home-character-card" style="--card-number:${i}">
                        <img src="${safeText(person.image)}" alt="${safeText(person.name)}" loading="lazy">
                        <div class="home-character-info">
                            <span class="home-character-label">${safeText(person.category.replace("-", " "))}</span>
                            <h3>${safeText(person.name)}</h3>
                            <p class="home-character-series">${safeText(person.series)}</p>
                            <p>${safeText(person.biography)}</p>
                            <div class="home-character-traits">${(person.traits || []).slice(0, 2).map(function (trait) { return `<span>${safeText(trait)}</span>`; }).join("")}</div>
                        </div>
                    </article>`;
            });
            $("#HomeCharacterListing").html(characterHtml);
        }

    }).fail(function () {
        console.error("Could not load data.json. Run site via Live Server!");
    });
}

// Automatically load data when landing page is ready
$(document).ready(function () {
    if ($("#CategoryListing").length) {
        loadHomeData();
    }
});

// --- 5. CART COUNT SHOWN IN THE SHARED MENU ---
function updateCartCount() {
    let cart = [];
    try {
        let raw = JSON.parse(localStorage.getItem("fandom_cart") || "[]");
        if (Array.isArray(raw)) cart = raw;
    } catch (e) {
        cart = [];
    }
    let totalQty = cart.reduce(function (sum, item) {
        if (typeof item === "object" && item !== null && item.quantity) {
            return sum + (Number(item.quantity) || 1);
        }
        return sum + 1;
    }, 0);
    $("#cartCount").text(totalQty);
    $("#shopCartCount").text(totalQty);
}

// --- 6. VISITOR COUNT, CURRENT DATE, AND TIME ---
$(document).ready(function () {
    let count = parseInt(localStorage.getItem("visitor_count") || "0", 10);
    if (Number.isNaN(count)) count = 0;
    count += 1;
    localStorage.setItem("visitor_count", count);
    $("#visitorCounter").text(count.toLocaleString());

    function updateHeaderClock() {
        const now = new Date();
        const clock = document.getElementById("realTimeClock");
        if (!clock) return;

        clock.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(now);
        clock.dateTime = now.toISOString();
    }

    updateHeaderClock();
    setInterval(updateHeaderClock, 1000);
    $("#currentYear").text(new Date().getFullYear());

    $(document).on("click", 'a[href="#chatOpen"]', function (event) {
        event.preventDefault();
        $("#chatOpen").trigger("click");
    });
});

// Trailer Page Logics

/* ==========================================================================
   FandomVerse - Trailers & Media Page Loader (Fixed Data Access)
   ========================================================================== */

let trailersState = {
    allTrailers: [],
    category: "all",
    type: "all",
    sortBy: "newest",
    searchQuery: "",
    releaseStatus: "all"
};

function loadTrailersData() {
    console.log("Fetching trailers from data.json...");

    // Get URL parameter if passed (e.g. ?cat=anime)
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCat = urlParams.get('cat') || "all";
    trailersState.category = selectedCat;

    // Highlight active pill button
    $("#TrailerCategoryPills button").removeClass("active");
    $(`#TrailerCategoryPills button[data-cat="${selectedCat}"]`).addClass("active");

    $.ajax({
        url: 'data.json',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            console.log("JSON Loaded for Trailers:", data);

            // FLEXIBLE KEY CHECK: Matches any key structure in your data.json
            trailersState.allTrailers = data.trailersAndMedia || data.trailers || data.media || data.trailersList || [];

            if (trailersState.allTrailers.length === 0) {
                console.warn("No trailers array found in data.json!");
                $("#TrailersGrid").html('<div class="col-12 text-center py-5"><p class="text-warning fs-5">No trailer data found in data.json.</p></div>');
                return;
            }

                        renderFeaturedHeroTrailer();
            renderTrailersGrid();
        },
        error: function (xhr, status, error) {
            console.error("Failed to load data.json for trailers:", status, error);
            $("#TrailersGrid").html('<div class="col-12 text-center py-5"><p class="text-danger fs-5">Error loading data.json. Ensure you are running via VS Code Live Server.</p></div>');
        }
    });

    setupTrailerEventListeners();
}

function setupTrailerEventListeners() {
    // Category Pills
    $(document).off("click", "#TrailerCategoryPills button").on("click", "#TrailerCategoryPills button", function () {
        $("#TrailerCategoryPills button").removeClass("active");
        $(this).addClass("active");

        trailersState.category = $(this).data("cat");
        renderTrailersGrid();
    });

    // Search Input
    $(document).off("keyup", "#TrailerSearch").on("keyup", "#TrailerSearch", function () {
        trailersState.searchQuery = $(this).val().toLowerCase().trim();
        renderTrailersGrid();
    });

    // Type Filter
    $(document).off("change", "#TrailerTypeFilter").on("change", "#TrailerTypeFilter", function () {
        trailersState.type = $(this).val();
        renderTrailersGrid();
    });

    // Sort By
    $(document).off("change", "#TrailerSortBy").on("change", "#TrailerSortBy", function () {
        trailersState.sortBy = $(this).val();
        renderTrailersGrid();
    });

    $(document).off("change", "#TrailerStatusFilter").on("change", "#TrailerStatusFilter", function () {
        trailersState.releaseStatus = $(this).val();
        renderTrailersGrid();
    });

    // Stop video audio when modal closes
    $('#trailerModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        $("#trailerPlayerIframe").attr("src", "");
    });
}

function renderFeaturedHeroTrailer() {
    if (trailersState.allTrailers.length === 0) return;

    let heroVideo = trailersState.allTrailers[0];
    let thumb = heroVideo.thumbnail || heroVideo.image || heroVideo.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80";
    let embedUrl = heroVideo.embedUrl || heroVideo.videoUrl || heroVideo.url || "";
    let title = (heroVideo.title || "Featured Trailer").replace(/'/g, "\\'");
    let category = (heroVideo.category || "SPOTLIGHT").toUpperCase();

    let heroHtml = `
        <div class="col-12">
            <div class="card bg-dark text-white border-0 rounded-4 overflow-hidden shadow-lg position-relative featured-video">
                <div class="row g-0 align-items-center">
                    <div class="col-lg-7 position-relative">
                        <img src="${thumb}" class="w-100 video-image" style="height: 350px; object-fit: cover;" alt="${title}">
                        <div class="video-shade d-flex align-items-center justify-content-center">
                            <button onclick="playTrailerModal('${embedUrl}', '${title}', '${category}')" class="btn play-button rounded-circle p-3">
                                <i class="fa-solid fa-play fa-2x"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-lg-5 p-4 p-xl-5">
                        <span class="badge bg-purple-glow mb-2">${category}</span>
                        <h2 class="display-6 fw-bold mb-3">${heroVideo.title}</h2>
                        <p class="text-muted mb-4">${heroVideo.description || "Watch the official trailer reveal in high definition."}</p>
                        <button onclick="playTrailerModal('${embedUrl}', '${title}', '${category}')" class="btn purple-button rounded-pill px-4 py-2">
                            <i class="fa-solid fa-play me-2"></i> Watch Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $("#FeaturedTrailerHero").html(heroHtml);
}

function renderTrailersGrid() {
    let list = [...trailersState.allTrailers];

    // Category Filter
    if (trailersState.category !== "all") {
        list = list.filter(item => item.category === trailersState.category);
    }

    // Type Filter
    if (trailersState.type !== "all") {
        list = list.filter(item => item.type === trailersState.type || item.contentType === trailersState.type);
    }

    if (trailersState.releaseStatus !== "all") {
        list = list.filter(item => item.releaseStatus === trailersState.releaseStatus);
    }

    // Search Filter
    if (trailersState.searchQuery !== "") {
        list = list.filter(item => 
            (item.title && item.title.toLowerCase().includes(trailersState.searchQuery)) ||
            (item.description && item.description.toLowerCase().includes(trailersState.searchQuery)) ||
            (item.category && item.category.toLowerCase().includes(trailersState.searchQuery)) ||
            (item.contentType && item.contentType.toLowerCase().includes(trailersState.searchQuery))
        );
    }

    // Sorting
    if (trailersState.sortBy === "alphabetical") {
        list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (trailersState.sortBy === "popular") {
        list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
        list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }

    if (list.length === 0) {
        $("#TrailersGrid").html('<div class="col-12 text-center py-5"><p class="text-muted fs-5">No video trailers found matching your search.</p></div>');
        return;
    }

    let html = "";
    $.each(list, function (i, item) {
        let thumb = item.thumbnail || item.image || item.poster || "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&q=80";
        let embedUrl = item.embedUrl || item.videoUrl || item.url || "";
        let title = (item.title || "Untitled Video").replace(/'/g, "\\'");
        let cat = (item.category || "MEDIA").toUpperCase();

        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card bg-dark text-white border-secondary h-100 rounded-4 overflow-hidden category-card">
                    <div class="position-relative" style="height: 200px;">
                        <img src="${thumb}" class="w-100 h-100" style="object-fit: cover;" alt="${item.title}">
                        <div class="position-absolute top-0 start-0 m-3">
                            <span class="badge bg-purple-neon">${cat}</span>
                        </div>
                        <div class="position-absolute top-0 bottom-0 start-0 end-0 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.35);">
                            <button onclick="playTrailerModal('${embedUrl}', '${title}', '${cat}')" class="btn btn-sm play-button rounded-circle p-3">
                                <i class="fa-solid fa-play"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column justify-content-between p-3">
                        <div>
                            <h6 class="fw-bold text-white mb-2 text-truncate">${item.title}</h6>
                            <p class="small text-muted mb-0">${item.description || "Official trailer."}</p>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-secondary">
                            <button onclick="playTrailerModal('${embedUrl}', '${title}', '${cat}')" class="btn btn-sm btn-outline-light rounded-pill">
                                Watch Preview
                            </button>
                            <button data-save-media="${item.id}" data-title="${title}" class="btn btn-sm btn-outline-light" title="Save to bookmarks">
                                <i class="fa-regular fa-bookmark me-1"></i> Bookmark
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    $("#TrailersGrid").html(html);
}

function playTrailerModal(embedUrl, title, category) {
    if (!embedUrl) {
        if (typeof FandomAlert !== "undefined") { FandomAlert.warning("Video Unavailable", "The video URL for this trailer is currently not available."); } else { alert("Video URL not available."); }
        return;
    }

    let finalUrl = embedUrl.includes('?') ? embedUrl + '&autoplay=1' : embedUrl + '?autoplay=1';

    $("#trailerModalTitle").text(title);
    $("#trailerModalCategory").text((category || "MEDIA").toUpperCase());
    $("#btnModalWatchlist").data("video-title", title);
    $("#trailerPlayerIframe").attr("src", finalUrl);

    let modal = new bootstrap.Modal(document.getElementById('trailerModal'));
    modal.show();
}
