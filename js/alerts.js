/**
 * ============================================================================
 * FandomVerse - SweetAlert2 Notification & Dialog Wrapper
 * Replaces all simple JavaScript alert() and confirm() dialogs
 * ============================================================================
 */

(function (window, $) {
    "use strict";

    // SweetAlert2 Toast Mixin
    let Toast = null;
    function getToast() {
        if (!Toast && typeof Swal !== "undefined") {
            Toast = Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: "#141628",
                color: "#ffffff",
                iconColor: "#c04cff",
                customClass: {
                    popup: "fandom-swal-toast"
                },
                didOpen: (toast) => {
                    toast.addEventListener("mouseenter", Swal.stopTimer);
                    toast.addEventListener("mouseleave", Swal.resumeTimer);
                }
            });
        }
        return Toast;
    }

    const FandomAlert = {
        // Auth Required Dialog with direct redirect to login
        authRequired: function (title, message, redirectPage = "login") {
            if (typeof Swal === "undefined") {
                if (window.confirm((title ? title + "\n\n" : "") + (message || "Please login to continue."))) {
                    window.location.href = "?page=" + redirectPage;
                }
                return Promise.resolve(false);
            }
            return Swal.fire({
                icon: "warning",
                title: title || "Login Required",
                text: message || "Please sign in or register to proceed.",
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-right-to-bracket me-1"></i> Sign In / Login',
                cancelButtonText: "Cancel",
                reverseButtons: true,
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn",
                    cancelButton: "fandom-swal-cancel-btn"
                }
            }).then(function (result) {
                if (result.isConfirmed) {
                    const loginLink = $('a[data-page="' + redirectPage + '"]').first();
                    if (loginLink.length) {
                        loginLink.trigger("click");
                    } else {
                        window.location.href = "?page=" + redirectPage;
                    }
                    return true;
                }
                return false;
            });
        },

        // Success Modal
        success: function (title, message, timer = 2500) {
            if (typeof Swal === "undefined") {
                console.log("[SUCCESS]", title, message);
                return Promise.resolve();
            }
            return Swal.fire({
                icon: "success",
                title: title || "Success!",
                text: message || "",
                timer: timer,
                timerProgressBar: timer > 0,
                confirmButtonText: "OK",
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn"
                }
            });
        },

        // Error Modal
        error: function (title, message) {
            if (typeof Swal === "undefined") {
                console.error("[ERROR]", title, message);
                return Promise.resolve();
            }
            return Swal.fire({
                icon: "error",
                title: title || "Error",
                text: message || "An unexpected error occurred.",
                confirmButtonText: "OK",
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn"
                }
            });
        },

        // Warning Modal
        warning: function (title, message) {
            if (typeof Swal === "undefined") {
                console.warn("[WARNING]", title, message);
                return Promise.resolve();
            }
            return Swal.fire({
                icon: "warning",
                title: title || "Attention",
                text: message || "",
                confirmButtonText: "Understood",
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn"
                }
            });
        },

        // Info Modal
        info: function (title, message) {
            if (typeof Swal === "undefined") {
                console.info("[INFO]", title, message);
                return Promise.resolve();
            }
            return Swal.fire({
                icon: "info",
                title: title || "Notice",
                text: message || "",
                confirmButtonText: "OK",
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn"
                }
            });
        },

        // Confirmation Dialog (returns Promise<boolean>)
        confirm: function (title, message, confirmText = "Yes, proceed", cancelText = "Cancel") {
            if (typeof Swal === "undefined") {
                return Promise.resolve(window.confirm(message || title));
            }
            return Swal.fire({
                title: title || "Are you sure?",
                text: message || "",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                reverseButtons: true,
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn",
                    cancelButton: "fandom-swal-cancel-btn"
                }
            }).then(function (result) {
                return result.isConfirmed;
            });
        },

        // Danger / Delete Confirmation Dialog
        dangerConfirm: function (title, message, confirmText = "Yes, delete it", cancelText = "Cancel") {
            if (typeof Swal === "undefined") {
                return Promise.resolve(window.confirm(message || title));
            }
            return Swal.fire({
                title: title || "Delete item?",
                text: message || "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                reverseButtons: true,
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn swal2-danger-btn",
                    cancelButton: "fandom-swal-cancel-btn"
                }
            }).then(function (result) {
                return result.isConfirmed;
            });
        },

        // Floating Toast Notification
        toast: function (message, icon = "success") {
            const t = getToast();
            if (t) {
                t.fire({
                    icon: icon,
                    title: message
                });
            } else {
                console.log("[TOAST]", icon, message);
            }
        }
    };

    // =========================================================================
    // Universal Override for window.alert
    // Any standard alert("...") in any script now opens a sleek SweetAlert modal!
    // =========================================================================
    window.alert = function (message) {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "info",
                title: "FandomVerse Notice",
                text: String(message || ""),
                confirmButtonText: "OK",
                customClass: {
                    popup: "fandom-swal-popup",
                    title: "fandom-swal-title",
                    confirmButton: "fandom-swal-confirm-btn"
                }
            });
        } else {
            console.log("[ALERT]", message);
        }
    };

    window.FandomAlert = FandomAlert;

})(window, jQuery);
