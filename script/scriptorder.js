function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getCart() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}

function formatCurrency(amount) {
    return `₱${amount.toFixed(2)}`;
}

function getSubtotal(cart) {
    return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function getDeliverySelection() {
    return document.querySelector('input[name="deliveryMethod"]:checked');
}

function getShippingFee() {
    if (getCart().length === 0) {
        return 0;
    }
    return Number(getDeliverySelection()?.dataset.fee || 0);
}

function updateOrderSummary() {
    const subtotal = getSubtotal(getCart());
    const shipping = getShippingFee();
    document.getElementById("orderSubtotal").textContent = formatCurrency(subtotal);
    document.getElementById("orderShipping").textContent = formatCurrency(shipping);
    document.getElementById("orderTotal").textContent = formatCurrency(subtotal + shipping);
}

function displayCart() {
    const cart = getCart();
    const cartItemDetails = document.getElementById("cartItemDetails");

    if (cart.length === 0) {
        cartItemDetails.innerHTML = "<p>No items in the cart.</p>";
        updateOrderSummary();
        return;
    }

    cartItemDetails.innerHTML = cart.map((item, index) => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const itemTotal = price * quantity;
        return `
            <div class="cart-item">
                <div class="cart-item-heading">
                    <p><strong>Item:</strong> ${escapeHtml(item.name)}</p>
                    <button class="remove-cart-item" type="button" data-remove-item="${index}" aria-label="Remove ${escapeHtml(item.name)} from cart">&times;</button>
                </div>
                ${item.size ? `<p><strong>Size:</strong> ${escapeHtml(item.size)}</p>` : ""}
                <p><strong>Quantity:</strong> ${quantity}</p>
                <p><strong>Price per Item:</strong> ${formatCurrency(price)}</p>
                <p><strong>Total Price:</strong> ${formatCurrency(itemTotal)}</p>
            </div>
        `;
    }).join("");

    updateOrderSummary();
}

function updateCheckoutFields() {
    const isPickup = getDeliverySelection()?.value === "pickup";
    ["address", "postalCode", "city", "country"].forEach((id) => {
        document.getElementById(id).required = !isPickup;
    });

    const cashOnDeliveryOption = document.getElementById("cashOnDeliveryOption");
    const cashOnDeliveryInput = cashOnDeliveryOption.querySelector("input");
    cashOnDeliveryOption.hidden = isPickup;
    if (isPickup && cashOnDeliveryInput.checked) {
        document.querySelector('input[name="paymentMethod"][value="GCash"]').checked = true;
    }
}

let receiptCloseTimer;
let receiptPreviousFocus;

function openModal() {
    const modal = document.getElementById("receiptModal");
    window.clearTimeout(receiptCloseTimer);
    receiptPreviousFocus = document.activeElement;
    modal.style.display = "flex";
    modal.classList.remove("is-closing");
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.querySelector(".modal-content").focus();
}

function closeModal() {
    const modal = document.getElementById("receiptModal");
    if (!modal.classList.contains("is-open")) {
        return;
    }

    modal.classList.remove("is-open");
    modal.classList.add("is-closing");
    modal.setAttribute("aria-hidden", "true");
    receiptCloseTimer = window.setTimeout(() => {
        modal.style.display = "none";
        modal.classList.remove("is-closing");
        receiptPreviousFocus?.focus();
    }, 220);
}

document.getElementById("receiptModal").addEventListener("click", (event) => {
    if (event.target.id === "receiptModal") {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});

document.getElementById("orderForm").addEventListener("change", (event) => {
    if (event.target.name === "deliveryMethod") {
        updateCheckoutFields();
        updateOrderSummary();
    }
});

document.getElementById("cartItemDetails").addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-item]");
    if (!removeButton) {
        return;
    }

    const cart = getCart();
    cart.splice(Number(removeButton.dataset.removeItem), 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
});

document.getElementById("orderForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
        alert("Your cart is empty. Add items before placing an order.");
        return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) {
        return;
    }

    const formData = new FormData(form);
    const subtotal = getSubtotal(cart);
    const shipping = getShippingFee();
    const total = subtotal + shipping;
    const paymentMethod = String(formData.get("paymentMethod"));
    const delivery = getDeliverySelection();
    const deliveryName = delivery.closest(".checkout-choice").querySelector(".choice-copy strong").textContent;

    const address = delivery.value === "pickup"
        ? "Store Pickup"
        : `${formData.get("address")}, ${formData.get("city")}, ${formData.get("postalCode")}, ${formData.get("country")}`;
    const receiptDetails = `
        <section class="receipt-section receipt-customer" aria-label="Customer and delivery information">
            <h3>Delivery details</h3>
            <dl class="receipt-info-grid">
                <div><dt>Name</dt><dd>${escapeHtml(formData.get("name"))}</dd></div>
                <div><dt>Phone</dt><dd>${escapeHtml(formData.get("phone"))}</dd></div>
                <div class="receipt-info-wide"><dt>Address</dt><dd>${escapeHtml(address)}</dd></div>
                <div><dt>Delivery</dt><dd>${escapeHtml(deliveryName)}</dd></div>
                <div><dt>Payment</dt><dd>${escapeHtml(paymentMethod)}</dd></div>
                ${formData.get("orderNotes") ? `<div class="receipt-info-wide"><dt>Order notes</dt><dd>${escapeHtml(formData.get("orderNotes"))}</dd></div>` : ""}
            </dl>
        </section>
        <section class="receipt-section" aria-label="Ordered items">
            <h3>Order items</h3>
            <ul class="receipt-items">
                ${cart.map((item) => `
                    <li>
                        <span class="receipt-item-name">${escapeHtml(item.name)}${item.size ? ` <small>(${escapeHtml(item.size)})</small>` : ""}</span>
                        <span class="receipt-item-quantity">${Number(item.quantity)} × ${formatCurrency(Number(item.price))}</span>
                        <strong>${formatCurrency(Number(item.price) * Number(item.quantity))}</strong>
                    </li>
                `).join("")}
            </ul>
        </section>
        <section class="receipt-section receipt-totals" aria-label="Payment summary">
            <div><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
            <div><span>Shipping</span><strong>${formatCurrency(shipping)}</strong></div>
            <div class="receipt-grand-total"><span>Total</span><strong>${formatCurrency(total)}</strong></div>
            ${paymentMethod !== "Cash on Delivery" ? '<p class="receipt-payment-note">Online payment is not processed by this demo checkout.</p>' : ""}
        </section>
    `;

    document.getElementById("receiptDetails").innerHTML = receiptDetails;
    openModal();
    localStorage.removeItem("cart");
    displayCart();
});

displayCart();
updateCheckoutFields();
