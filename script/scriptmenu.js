/**
 * VitalyTea - Menu Page Script (scriptmenu.js)
 * Modern UI/UX carousel, product card interactions, modal ordering, and cart sync
 */

document.addEventListener("DOMContentLoaded", function () {
    initCarousels();
    initModals();
    updateCheckoutBar();
});

/* ==========================================================================
   Carousel Engine & Interactions
   ========================================================================== */

function initCarousels() {
    const carousels = document.querySelectorAll(".carousel");

    carousels.forEach(carousel => {
        const carouselId = carousel.id;
        const inner = carousel.querySelector(".carousel-inner");
        const items = inner.querySelectorAll(".carousel-item");
        const dotsContainer = carousel.querySelector(".carousel-dots");

        if (items.length === 0) return;

        // Ensure first item is active
        items.forEach((item, idx) => {
            if (idx === 0) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Generate pagination dots dynamically if container exists
        if (dotsContainer) {
            dotsContainer.innerHTML = "";
            items.forEach((_, idx) => {
                const dot = document.createElement("button");
                dot.type = "button";
                dot.className = `carousel-dot ${idx === 0 ? "active" : ""}`;
                dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
                dot.addEventListener("click", (e) => {
                    e.stopPropagation();
                    goToSlide(carouselId, idx);
                });
                dotsContainer.appendChild(dot);
            });
        }

        // Update initial slide counter if present
        updateSlideMeta(carouselId, 0);

        // Touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener("touchstart", function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener("touchend", function (e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe(carouselId, touchStartX, touchEndX);
        }, { passive: true });

        // Keyboard arrow navigation when carousel has focus
        carousel.setAttribute("tabindex", "0");
        carousel.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") {
                prevSlide(carouselId);
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                nextSlide(carouselId);
                e.preventDefault();
            }
        });
    });
}

function handleSwipe(carouselId, startX, endX) {
    const threshold = 40;
    if (endX < startX - threshold) {
        nextSlide(carouselId);
    } else if (endX > startX + threshold) {
        prevSlide(carouselId);
    }
}

function goToSlide(carouselId, targetIndex) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const inner = carousel.querySelector(".carousel-inner");
    const items = inner.querySelectorAll(".carousel-item");
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains("active"));

    if (currentIndex === targetIndex || targetIndex < 0 || targetIndex >= items.length) return;

    items[currentIndex].classList.remove("active");
    items[targetIndex].classList.add("active");

    updateSlideMeta(carouselId, targetIndex);
}

function prevSlide(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const inner = carousel.querySelector(".carousel-inner");
    const items = inner.querySelectorAll(".carousel-item");
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains("active"));

    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    goToSlide(carouselId, prevIndex);
}

function nextSlide(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const inner = carousel.querySelector(".carousel-inner");
    const items = inner.querySelectorAll(".carousel-item");
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains("active"));

    const nextIndex = (currentIndex + 1) % items.length;
    goToSlide(carouselId, nextIndex);
}

function updateSlideMeta(carouselId, activeIndex) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    // Update dots
    const dots = carousel.querySelectorAll(".carousel-dot");
    dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === activeIndex);
    });

    // Update counter
    const inner = carousel.querySelector(".carousel-inner");
    const items = inner.querySelectorAll(".carousel-item");
    const activeItem = items[activeIndex];
    if (activeItem) {
        const counterEl = activeItem.querySelector(".item-index-counter");
        if (counterEl) {
            counterEl.textContent = `${activeIndex + 1} of ${items.length}`;
        }
    }
}

/* ==========================================================================
   Modal Ordering System
   ========================================================================== */

let activeModalItem = null;
let currentSelectedSize = null;
let currentItemPrice = 0;

function initModals() {
    const modal = document.getElementById("itemModal");
    const itemForm = document.getElementById("itemForm");

    // Attach click listeners to cards and buttons
    document.querySelectorAll(".carousel-item").forEach(item => {
        // Clicking order button
        const orderBtn = item.querySelector(".add-to-cart-btn");
        if (orderBtn) {
            orderBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const activeChip = item.querySelector(".size-chip.is-active");
                const preselectedSize = activeChip ? activeChip.getAttribute("data-size") : null;
                openItemModal(item, preselectedSize);
            });
        }

        // Clicking size chips on drink card toggles selection on preview card
        const sizeChips = item.querySelectorAll(".size-chip");
        sizeChips.forEach(chip => {
            chip.addEventListener("click", (e) => {
                e.stopPropagation();
                const wasActive = chip.classList.contains("is-active");
                sizeChips.forEach(c => c.classList.remove("is-active"));
                if (!wasActive) {
                    chip.classList.add("is-active");
                }
            });
        });

        // Clicking the crop frame
        const cropFrame = item.querySelector(".product-crop-frame");
        if (cropFrame) {
            cropFrame.addEventListener("click", () => {
                const activeChip = item.querySelector(".size-chip.is-active");
                const preselectedSize = activeChip ? activeChip.getAttribute("data-size") : null;
                openItemModal(item, preselectedSize);
            });
        }
    });

    // Form submission
    if (itemForm) {
        itemForm.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!activeModalItem) return;

            const name = activeModalItem.getAttribute("data-name");
            const quantityInput = document.getElementById("quantity");
            const quantity = parseInt(quantityInput.value, 10) || 1;

            let finalSize = null;
            let finalPrice = 0;

            const sizesAttr = activeModalItem.getAttribute("data-sizes");
            if (sizesAttr) {
                const sizes = JSON.parse(sizesAttr);
                if (!currentSelectedSize) {
                    showToast("Please choose a size first!");
                    const sizeOptionsGrid = document.getElementById("sizeOptionsGrid");
                    if (sizeOptionsGrid) {
                        sizeOptionsGrid.classList.add("shake-error");
                        setTimeout(() => sizeOptionsGrid.classList.remove("shake-error"), 600);
                    }
                    return;
                }
                finalSize = currentSelectedSize;
                finalPrice = parseFloat(sizes[finalSize]);
            } else {
                finalPrice = parseFloat(activeModalItem.getAttribute("data-price")) || 0;
            }

            addToCart(name, finalSize, quantity, finalPrice);
            closeModal();
            showToast(`${quantity}x ${name}${finalSize ? ` (${finalSize})` : ""} added to cart!`);
        });
    }

    // Keyboard Escape to close modal
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
            closeModal();
        }
    });
}

function openItemModal(itemElement, preselectedSize = null) {
    const modal = document.getElementById("itemModal");
    if (!modal) return;

    activeModalItem = itemElement;

    const name = itemElement.getAttribute("data-name");
    const desc = itemElement.querySelector(".product-description")?.textContent || "";
    const badge = itemElement.querySelector(".product-badge")?.textContent || "VitalyTea Menu";
    const sizesAttr = itemElement.getAttribute("data-sizes");
    const priceAttr = itemElement.getAttribute("data-price");

    // Elements
    const titleEl = document.getElementById("modalItemName");
    const descEl = document.getElementById("modalItemDesc");
    const badgeEl = document.getElementById("modalCategoryBadge");
    const sizeGroup = document.getElementById("modalSizeGroup");
    const sizeOptionsGrid = document.getElementById("sizeOptionsGrid");
    const quantityInput = document.getElementById("quantity");

    titleEl.textContent = name;
    descEl.textContent = desc;
    badgeEl.textContent = badge;
    quantityInput.value = "1";

    if (sizesAttr) {
        // Drink with sizes
        const sizes = JSON.parse(sizesAttr);
        sizeGroup.style.display = "flex";
        sizeOptionsGrid.innerHTML = "";

        const sizeKeys = Object.keys(sizes);
        currentSelectedSize = preselectedSize && sizes[preselectedSize] ? preselectedSize : null;
        currentItemPrice = currentSelectedSize ? sizes[currentSelectedSize] : 0;

        sizeKeys.forEach(size => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `modal-size-btn ${size === currentSelectedSize ? "is-selected" : ""}`;
            btn.innerHTML = `
                <span class="btn-size-name">${size}</span>
                <span class="btn-size-price">₱${sizes[size].toFixed(2)}</span>
            `;
            btn.addEventListener("click", () => {
                currentSelectedSize = size;
                currentItemPrice = sizes[size];
                sizeOptionsGrid.querySelectorAll(".modal-size-btn").forEach(b => b.classList.remove("is-selected"));
                btn.classList.add("is-selected");
                updateModalTotalPrice();
            });
            sizeOptionsGrid.appendChild(btn);
        });
    } else {
        // Sandwich with single price
        sizeGroup.style.display = "none";
        currentSelectedSize = null;
        currentItemPrice = parseFloat(priceAttr) || 0;
    }

    updateModalTotalPrice();
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    const modal = document.getElementById("itemModal");
    if (modal) {
        modal.classList.remove("is-open");
    }
    document.body.style.overflow = "";
    activeModalItem = null;
    currentSelectedSize = null;
    currentItemPrice = 0;
}

function stepQuantity(delta) {
    const quantityInput = document.getElementById("quantity");
    if (!quantityInput) return;

    let currentVal = parseInt(quantityInput.value, 10) || 1;
    currentVal = Math.max(1, Math.min(99, currentVal + delta));
    quantityInput.value = currentVal;

    updateModalTotalPrice();
}

function updateModalTotalPrice() {
    const quantityInput = document.getElementById("quantity");
    const priceDisplay = document.getElementById("modalPrice");
    const qty = parseInt(quantityInput?.value, 10) || 1;

    if (!currentItemPrice) {
        if (priceDisplay) {
            priceDisplay.textContent = "₱0.00";
        }
        return;
    }

    const total = currentItemPrice * qty;
    if (priceDisplay) {
        priceDisplay.textContent = `₱${total.toFixed(2)}`;
    }
}

/* ==========================================================================
   Cart Engine & Order Page Sync
   ========================================================================== */

function addToCart(name, size, quantity, price) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalPrice = price * quantity;

    // Check if an identical item already exists to merge quantities
    const existingIndex = cart.findIndex(item => item.name === name && item.size === (size || null));

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
        cart[existingIndex].totalPrice = cart[existingIndex].quantity * cart[existingIndex].price;
    } else {
        const cartItem = {
            name,
            size: size || null,
            quantity,
            price,
            totalPrice
        };
        cart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCheckoutBar();
}

function updateCheckoutBar() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const checkoutBar = document.getElementById("checkoutBar");
    const countBadge = document.getElementById("cartCountBadge");
    const itemsText = document.getElementById("cartItemsText");
    const totalText = document.getElementById("cartTotalText");

    if (!checkoutBar) return;

    if (cart.length > 0) {
        let totalItems = 0;
        let totalAmount = 0;

        cart.forEach(item => {
            totalItems += item.quantity;
            totalAmount += item.totalPrice || (item.price * item.quantity);
        });

        if (countBadge) countBadge.textContent = totalItems;
        if (itemsText) itemsText.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"} in cart`;
        if (totalText) totalText.textContent = `₱${totalAmount.toFixed(2)}`;

        checkoutBar.classList.remove("is-hidden");
    } else {
        checkoutBar.classList.add("is-hidden");
    }
}

/* ==========================================================================
   Toast Feedback Notifications
   ========================================================================== */

let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById("toastNotification");
    const toastMsg = document.getElementById("toastMessage");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add("is-visible");

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 3800);
}

// Backward-compatibility aliases for legacy scripts if any
function openSandwichModal(item) {
    openItemModal(item);
}

function closeSandwichModal() {
    closeModal();
}

function updateCheckoutButtonVisibility() {
    updateCheckoutBar();
}
