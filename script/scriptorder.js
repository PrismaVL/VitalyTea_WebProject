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

function openModal() {
    document.getElementById("receiptModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("receiptModal").style.display = "none";
}

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
        <p><strong>Name:</strong> ${escapeHtml(formData.get("name"))}</p>
        <p><strong>Phone:</strong> ${escapeHtml(formData.get("phone"))}</p>
        <p><strong>Address:</strong> ${escapeHtml(address)}</p>
        ${formData.get("orderNotes") ? `<p><strong>Order Notes:</strong> ${escapeHtml(formData.get("orderNotes"))}</p>` : ""}
        <p><strong>Delivery:</strong> ${escapeHtml(deliveryName)}</p>
        <p><strong>Payment Method:</strong> ${escapeHtml(paymentMethod)}</p>
        <p><strong>Subtotal:</strong> ${formatCurrency(subtotal)}</p>
        <p><strong>Shipping:</strong> ${formatCurrency(shipping)}</p>
        <p><strong>Total:</strong> ${formatCurrency(total)}</p>
        ${paymentMethod !== "Cash on Delivery" ? "<p>Online payment is not processed by this demo checkout.</p>" : ""}
        <h3>Order Items:</h3>
        <ul>
            ${cart.map((item) => `<li>${escapeHtml(item.name)}${item.size ? ` (${escapeHtml(item.size)})` : ""} - ${Number(item.quantity)} x ${formatCurrency(Number(item.price))} = ${formatCurrency(Number(item.price) * Number(item.quantity))}</li>`).join("")}
        </ul>
    `;

    document.getElementById("receiptDetails").innerHTML = receiptDetails;
    openModal();
    localStorage.removeItem("cart");
    displayCart();
});

displayCart();
updateCheckoutFields();
