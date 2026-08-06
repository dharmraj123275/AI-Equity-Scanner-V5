const API_BASE = "/api";

let marketData = [];

async function scanMarket() {

    document.getElementById("lastScan").innerHTML =
        new Date().toLocaleTimeString();

    try {

        const response = await fetch(API_BASE + "/market");

        marketData = await response.json();

        renderStocks(marketData);

    }

    catch (err) {

        console.log(err);

        document.getElementById("buyList").innerHTML =
            "<p>❌ Server Offline</p>";

        document.getElementById("sellList").innerHTML =
            "<p>Waiting...</p>";

    }

}

function renderStocks(data){

    let buyHTML="";

    let sellHTML="";

    let buyCount=0;

    let sellCount=0;

    data.forEach(stock=>{

        const card=`
<div class="stock-card">

<h3>${stock.symbol}</h3>

<p>Price : ₹${stock.price}</p>

<p>AI Score : ${stock.score}%</p>

<p>Signal : ${stock.signal}</p>

<p>RSI : ${stock.rsi}</p>

<p>Volume : ${stock.volume}</p>

<p>Entry : ₹${stock.entry}</p>

<p>Target : ₹${stock.target}</p>

<p>Stop Loss : ₹${stock.sl}</p>

</div>
`;

        if(stock.signal.includes("BUY")){

            buyHTML+=card;

            buyCount++;

        }

        else{

            sellHTML+=card;

            sellCount++;

        }

    });

    document.getElementById("buyList").innerHTML=buyHTML;

    document.getElementById("sellList").innerHTML=sellHTML;

    document.getElementById("buyCount").innerHTML=buyCount;

    document.getElementById("sellCount").innerHTML=sellCount;

    document.getElementById("scanCount").innerHTML=data.length;

}
function searchStock() {

    const search = document
        .getElementById("search")
        .value
        .toUpperCase();

    const cards = document.getElementsByClassName("stock-card");

    for (let i = 0; i < cards.length; i++) {

        if (
            cards[i].innerText.toUpperCase().includes(search)
        ) {

            cards[i].style.display = "block";

        } else {

            cards[i].style.display = "none";

        }

    }

}

async function loadMarketStatus() {

    try {

        const response = await fetch(API_BASE + "/status");

        const data = await response.json();

        document.getElementById("niftyTrend").innerHTML =
            data.nifty;

        document.getElementById("bankTrend").innerHTML =
            data.bankNifty;

    }

    catch (e) {

        document.getElementById("niftyTrend").innerHTML =
            "Offline";

        document.getElementById("bankTrend").innerHTML =
            "Offline";

    }

}

scanMarket();

loadMarketStatus();

setInterval(() => {

    scanMarket();

    loadMarketStatus();

},30000);
