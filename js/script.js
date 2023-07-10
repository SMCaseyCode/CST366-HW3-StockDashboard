
const currentTickers = [];

document.querySelector("#input-form").addEventListener("submit", (event) => {
    event.preventDefault();
    let input = document.querySelector("#user-input").value.toUpperCase();
    if (!currentTickers.includes(input)){
        addCard(document.querySelector("#user-input").value.toUpperCase());
        currentTickers.push(input);
    }else {
        errorHandler(`Already tracking ${input}`);
    }

})

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

    subscribe(ticker);
}

function removeCard(ticker) {
    document.querySelector(`#${ticker}card`).remove();
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