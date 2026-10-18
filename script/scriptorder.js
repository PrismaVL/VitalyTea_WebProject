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
    ["address", "city"].forEach((id) => {
        document.getElementById(id).required = !isPickup;
    });

    const cashOnDeliveryOption = document.getElementById("cashOnDeliveryOption");
    const cashOnDeliveryInput = cashOnDeliveryOption.querySelector("input");
    cashOnDeliveryOption.hidden = isPickup;
    if (isPickup && cashOnDeliveryInput.checked) {
        document.querySelector('input[name="paymentMethod"][value="GCash"]').checked = true;
    }
}

async function populateAccountDetails() {
    const status = document.getElementById("accountCheckoutStatus");
    const completeOrderButton = document.getElementById("completeOrderButton");

    try {
        const response = await fetch("../account/order-profile.php", {
            credentials: "same-origin",
            cache: "no-store"
        });
        const account = await response.json();

        if (!response.ok) {
            throw new Error(account.error || "Could not load your account details.");
        }
        checkoutCsrfToken = account.csrfToken;
        checkoutCatalog = account.catalog;
        if (!account.fullName || !/^\+63[0-9]{9,10}$/.test(account.phone)) {
            throw new Error("Add your full name and a valid +63 phone number to your profile before checkout.");
        }

        const pricedCart = applyCatalogPrices(getCart());
        localStorage.setItem("cart", JSON.stringify(pricedCart));
        displayCart();
        document.getElementById("name").value = account.fullName;
        document.getElementById("phone").value = account.phone;
        document.getElementById("address").value = account.address;
        const city = document.getElementById("city");
        account.cities.forEach((name) => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            city.append(option);
        });
        if (account.cities.includes(account.city)) {
            city.value = account.city;
        }

        status.hidden = true;
        completeOrderButton.disabled = false;
    } catch (error) {
        status.textContent = `${error.message} `;
        const link = document.createElement("a");
        if (error.message.includes("Return to the menu")) {
            link.href = "../html/menu.html";
            link.textContent = "Return to menu";
        } else {
            link.href = error.message.startsWith("Sign in")
                ? "../account/login.php"
                : "../account/profile.php";
            link.textContent = error.message.startsWith("Sign in") ? "Sign in" : "Update profile";
        }
        status.append(link);
    }
}

let receiptCloseTimer;
let receiptPreviousFocus;
let checkoutCsrfToken = "";
let checkoutCatalog = null;
let pendingOrderPayload = null;
let orderSaving = false;

function createOrderToken() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function applyCatalogPrices(cart) {
    if (!checkoutCatalog) {
        throw new Error("Menu prices are still loading. Please try again.");
    }

    return cart.map((item) => {
        const sizes = checkoutCatalog[item.name];
        const size = item.size || "";
        const priceCents = sizes?.[size];
        if (!Number.isInteger(priceCents) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
            throw new Error("A cart item is no longer available at its current size. Return to the menu and update your cart.");
        }
        return {
            ...item,
            price: priceCents / 100,
            totalPrice: priceCents / 100 * Number(item.quantity)
        };
    });
}

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

function renderOrderDetails(order, isConfirmation) {
    const address = order.deliveryMethod === "pickup"
        ? "Store Pickup"
        : [order.address, order.city].filter(Boolean).join(", ");
    const items = order.items;
    const subtotal = order.subtotal;
    const shipping = order.deliveryFee;
    const total = order.total;
    const paymentMethod = order.paymentMethod;

    document.getElementById("receiptDetails").innerHTML = `
        ${isConfirmation ? '<p class="confirmation-prompt">Please review these details before placing your order.</p>' : `<p class="receipt-order-number">Order <strong>${escapeHtml(order.orderNumber)}</strong></p>`}
        <section class="receipt-section receipt-customer" aria-label="Customer and delivery information">
            <h3>Delivery details</h3>
            <dl class="receipt-info-grid">
                <div><dt>Name</dt><dd>${escapeHtml(order.fullName)}</dd></div>
                <div><dt>Phone</dt><dd>${escapeHtml(order.phone)}</dd></div>
                <div class="receipt-info-wide"><dt>Address</dt><dd>${escapeHtml(address)}</dd></div>
                <div><dt>Delivery</dt><dd>${escapeHtml(order.deliveryName)}</dd></div>
                <div><dt>Payment</dt><dd>${escapeHtml(paymentMethod)}</dd></div>
                ${order.notes ? `<div class="receipt-info-wide"><dt>Order notes</dt><dd>${escapeHtml(order.notes)}</dd></div>` : ""}
            </dl>
        </section>
        <section class="receipt-section" aria-label="Ordered items">
            <h3>Order items</h3>
            <ul class="receipt-items">
                ${items.map((item) => `
                    <li>
                        <span class="receipt-item-name">${escapeHtml(item.name)}${item.size ? ` <small>(${escapeHtml(item.size)})</small>` : ""}</span>
                        <span class="receipt-item-quantity">${Number(item.quantity)} × ${formatCurrency(Number(item.unitPrice))}</span>
                        <strong>${formatCurrency(Number(item.lineTotal))}</strong>
                    </li>
                `).join("")}
            </ul>
        </section>
        <section class="receipt-section receipt-totals" aria-label="Payment summary">
            <div><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
            <div><span>Shipping</span><strong>${formatCurrency(shipping)}</strong></div>
            <div class="receipt-grand-total"><span>Total</span><strong>${formatCurrency(total)}</strong></div>
            ${paymentMethod !== "Cash on Delivery" ? '<p class="receipt-payment-note">Online payment is not processed by this demo checkout.</p>' : ""}
            ${isConfirmation ? '<p class="receipt-payment-note">Confirming places this order and adds it to your account history. No online payment will be charged.</p>' : ""}
        </section>
    `;
}

document.getElementById("orderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (orderSaving) {
        return;
    }

    let cart;
    try {
        cart = applyCatalogPrices(getCart());
        localStorage.setItem("cart", JSON.stringify(cart));
        displayCart();
    } catch (error) {
        alert(error.message);
        return;
    }
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
    const paymentMethod = String(formData.get("paymentMethod"));
    const delivery = getDeliverySelection();
    const deliveryName = delivery.closest(".checkout-choice").querySelector(".choice-copy strong").textContent;
    pendingOrderPayload = {
        orderToken: createOrderToken(),
        items: cart.map((item) => ({
            name: item.name,
            size: item.size || "",
            quantity: Number(item.quantity)
        })),
        deliveryMethod: delivery.value,
        paymentMethod,
        address: String(formData.get("address") || ""),
        city: String(formData.get("city") || ""),
        notes: String(formData.get("orderNotes") || "")
    };

    const confirmationOrder = {
        fullName: String(formData.get("name")),
        phone: String(formData.get("phone")),
        address: pendingOrderPayload.address,
        city: pendingOrderPayload.city,
        deliveryMethod: delivery.value,
        deliveryName,
        paymentMethod,
        notes: pendingOrderPayload.notes,
        items: cart.map((item) => ({
            name: item.name,
            size: item.size,
            quantity: Number(item.quantity),
            unitPrice: Number(item.price),
            lineTotal: Number(item.price) * Number(item.quantity)
        })),
        subtotal,
        deliveryFee: shipping,
        total: subtotal + shipping
    };
    document.getElementById("receiptEyebrow").textContent = "Review your order";
    document.getElementById("receiptHeading").textContent = "Confirm your order";
    document.getElementById("confirmOrderButton").hidden = false;
    document.getElementById("receiptDoneButton").hidden = true;
    document.getElementById("orderSubmissionError").hidden = true;
    document.getElementById("confirmOrderButton").disabled = false;
    document.getElementById("confirmOrderButton").textContent = "Confirm & place order";
    renderOrderDetails(confirmationOrder, true);
    openModal();
});

document.getElementById("confirmOrderButton").addEventListener("click", async (event) => {
    if (orderSaving || !pendingOrderPayload || !checkoutCsrfToken) {
        return;
    }

    const button = event.currentTarget;
    const errorMessage = document.getElementById("orderSubmissionError");
    orderSaving = true;
    button.disabled = true;
    button.textContent = "Saving your order…";
    document.getElementById("completeOrderButton").disabled = true;
    errorMessage.hidden = true;

    try {
        const response = await fetch("../account/submit-order.php", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": checkoutCsrfToken
            },
            body: JSON.stringify(pendingOrderPayload)
        });
        const order = await response.json();
        if (!response.ok) {
            throw new Error(order.error || "We could not save your order. Please try again.");
        }

        const deliveryInput = document.querySelector(`input[name="deliveryMethod"][value="${order.deliveryMethod}"]`);
        order.deliveryName = deliveryInput.closest(".checkout-choice").querySelector(".choice-copy strong").textContent;
        document.getElementById("receiptEyebrow").textContent = "Order saved to your account";
        document.getElementById("receiptHeading").textContent = `Order confirmed`;
        renderOrderDetails(order, false);
        document.getElementById("confirmOrderButton").hidden = true;
        document.getElementById("receiptDoneButton").hidden = false;
        document.getElementById("completeOrderButton").disabled = false;
        localStorage.removeItem("cart");
        displayCart();
        pendingOrderPayload = null;
        orderSaving = false;
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.hidden = false;
        button.disabled = false;
        button.textContent = "Try again";
        document.getElementById("completeOrderButton").disabled = false;
        orderSaving = false;
    }
});

displayCart();
updateCheckoutFields();
populateAccountDetails();
