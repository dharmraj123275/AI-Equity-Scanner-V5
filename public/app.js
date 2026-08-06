async function scanStock() {

    const search = document.getElementById("search").value.trim();

    try {

        const response = await fetch("/api/scan?stock=" + encodeURIComponent(search));

        const data = await response.json();

        document.getElementById("result").innerHTML = `
            <h2>${data.name || search}</h2>
            <p><b>Signal:</b> ${data.signal || "-"}</p>
            <p><b>AI Score:</b> ${data.aiScore || "-"}</p>
            <p><b>Price:</b> ₹${data.price || "-"}</p>
        `;

    } catch (e) {

        document.getElementById("result").innerHTML =
        "<h2>⚠ Unable to connect to server.</h2>";

    }

}

window.onload = scanStock;
