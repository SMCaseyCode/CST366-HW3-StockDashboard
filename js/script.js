let currentTickers = [];

if (localStorage.getItem("tickerList") === null){
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
}

currentTickers = JSON.parse(localStorage.getItem("tickerList"));

document.querySelector("#input-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#error").innerText = "";
    let input = document.querySelector("#user-input").value.toUpperCase();
    if (!currentTickers.includes(input) && input.length > 0){
        currentTickers.push(input);
        addCard(document.querySelector("#user-input").value.toUpperCase());
        document.querySelector("#user-input").value = "";
    }else if (input.length > 0) {
        errorHandler(`Already tracking ${input}`);
    }

})

// TODO: if page is idle with 0 tickers active, websocket will close.
const URL = "wss://ws-feed.exchange.coinbase.com";
const API = new WebSocket(URL);

API.onmessage = (event) => {
    let data = JSON.parse(event.data);
    console.log(data);

    if (data.type === "ticker"){

        let productID = data.product_id;
        changeData(productID, data);

    } else if (data.type === "error") {
        errorHandler(data.reason);
    }

}

setTimeout(function (){
    fillTickers();
}, 700)

function fillTickers() {
    currentTickers.forEach((item) => {
        addCard(item);
    })
}

function addCard(ticker) {
    const cardWrapper = document.querySelector("#card-wrapper");
    const cardElement = document.createElement("div");

    cardElement.className = "card";
    cardElement.id = `${ticker}card`;
    cardElement.innerHTML = `
        <h2 class="card-name" id="${ticker}-USD-name">${ticker}</h2>
        <div class="btn-container">
            <img class="remove-btn" id="${ticker}-remove" src="assets/removeIcon.png" alt="removeIcon">
        </div>
        <h3>Price: <span class="card-number" id="${ticker}-USD-price">Waiting for API...</span></h3>
        <h3>24hr Open: <span class="card-number" id="${ticker}-USD-open">Waiting for API...</span></h3>
        <h3>24hr Low: <span class="card-number" id="${ticker}-USD-low">Waiting for API...</span></h3>
        <h3>24hr High: <span class="card-number" id="${ticker}-USD-high">Waiting for API...</span></h3>
        <h3>Volume: <span class="card-number" id="${ticker}-USD-volume">Waiting for API...</span></h3>
    `;

    const removeButton = cardElement.querySelector(`#${ticker}-remove`);
    removeButton.addEventListener("click", () => {
        unsubscribe(ticker);
        removeCard(ticker);
    });

    cardWrapper.appendChild(cardElement);
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
    subscribe(ticker);
}

function removeCard(ticker) {
    document.querySelector(`#${ticker}card`).remove();
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
}

function changeData(productID, data) {
    setPrice(productID, data.price, data.open_24h);
    setLow(productID, data.low_24h);
    setHigh(productID, data.high_24h);
    setOpen(productID, data.open_24h);
    setVolume(productID, data.volume_30d);
}

function setPrice(tickerID, tickerPrice, openPrice) {
    let currentPriceElement = document.querySelector(`#${tickerID}-price`);

    currentPriceElement.innerText = '$' + tickerPrice;

    if (parseFloat(tickerPrice) >= parseFloat(openPrice)) {
        currentPriceElement.style.color = "green";
        currentPriceElement.style.transition = "background-color 0.1s";

        // Green Flashing effect
        currentPriceElement.style.backgroundColor = "rgba(0,255,0,50%)";
        setTimeout(() => {
            currentPriceElement.style.backgroundColor = "";
        }, 100);
    } else {
        currentPriceElement.style.color = "red";
        currentPriceElement.style.transition = "background-color 0.1s";

        // Red Flashing effect
        currentPriceElement.style.backgroundColor = "rgba(255,0,0,50%)";
        setTimeout(() => {
            currentPriceElement.style.backgroundColor = "";
        }, 100);
    }
}

function setLow(tickerID, tickerLow) {
    document.querySelector(`#${tickerID}-low`).innerText = '$' + tickerLow;
}

function setHigh(tickerID, tickerHigh) {
    document.querySelector(`#${tickerID}-high`).innerText = '$' + tickerHigh;
}

function setOpen(tickerID, tickerOpen) {
    document.querySelector(`#${tickerID}-open`).innerText = '$' + tickerOpen;
}

function setVolume(tickerID, tickerVolume) {
    let currentVolumeElement = document.querySelector(`#${tickerID}-volume`);
    let currentVolume = currentVolumeElement.innerText;
    let volume = parseFloat(tickerVolume);
    currentVolume = currentVolume.replace("$", "");
    currentVolumeElement.innerText = volume.toFixed(2);

    if (volume >= parseFloat(currentVolume) || currentVolume.toString() === 'Waiting for API...') {
        currentVolumeElement.style.color = "green";
    } else {
        currentVolumeElement.style.color = "red";
    }
}

function errorHandler(msg){
    document.querySelector("#error").innerText = msg;

    if (msg.includes(' is not a valid product')) {
        let ticker = JSON.stringify(msg);

        ticker = ticker.replace("-USD is not a valid product", "");
        ticker = ticker.replaceAll('"', "");

        removeCard(ticker);
        let index = currentTickers.indexOf(ticker);
        currentTickers.splice(index,1);
        localStorage.setItem("tickerList", JSON.stringify(currentTickers));
    }

    if (msg.includes('websocket')){
        alert("Session has been idle too long, please reload the page");
    }
}

function subscribe(ticker) {
    let parameters = {
        "type": "subscribe",
        "product_ids": [
            `${ticker}-USD`
        ],
        "channels": [
            "heartbeat",
            {
                "name": "ticker",
                "product_ids": [
                    `${ticker}-USD`
                ]
            }
        ]
    }

    API.send(JSON.stringify(parameters));
}

function unsubscribe(ticker){

    let parameters = {
        "type": "unsubscribe",
        "product_ids": [
          `${ticker}-USD`
        ],
        "channels": [
            "heartbeat",
            "ticker"
        ]
    }

    API.send(JSON.stringify(parameters));
    let index = currentTickers.indexOf(ticker);
    currentTickers.splice(index, 1);

}