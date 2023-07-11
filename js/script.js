let currentTickers = [];

if (localStorage.getItem("tickerList") === null){
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
}

currentTickers = JSON.parse(localStorage.getItem("tickerList"));

document.querySelector("#input-form").addEventListener("submit", (event) => {
    event.preventDefault();
    let input = document.querySelector("#user-input").value.toUpperCase();
    if (!currentTickers.includes(input)){
        currentTickers.push(input);
        addCard(document.querySelector("#user-input").value.toUpperCase());
        document.querySelector("#user-input").value = "";
    }else {
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

        setPrice(productID, data.price);
        setLow(productID, data.low_24h);
        setHigh(productID, data.high_24h);
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
        <h2 id="${ticker}-USD-name">${ticker}</h2>
        <h3>price: <span id="${ticker}-USD-price">Waiting for API...</span></h3>
        <h3>24hr low: <span id="${ticker}-USD-low">Waiting for API...</span></h3>
        <h3>24hr high: <span id="${ticker}-USD-high">Waiting for API...</span></h3>
        <button id="${ticker}-remove">Remove</button>
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

function setPrice(tickerID, tickerPrice) {
    document.querySelector(`#${tickerID}-price`).innerText = '$' + tickerPrice;
}

function setLow(tickerID, tickerLow) {
    document.querySelector(`#${tickerID}-low`).innerText = '$' + tickerLow;
}

function setHigh(tickerID, tickerHigh) {
    document.querySelector(`#${tickerID}-high`).innerText = '$' + tickerHigh;
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