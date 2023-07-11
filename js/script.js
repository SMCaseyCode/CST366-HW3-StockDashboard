let currentTickers = [];

// Checks for localStorage, if none, creates entry
if (localStorage.getItem("tickerList") === null){
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
}

currentTickers = JSON.parse(localStorage.getItem("tickerList"));

// Form submission event listener
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

// API URL + Websocket creation
const URL = "wss://ws-feed.exchange.coinbase.com";
const API = new WebSocket(URL);

// on API message, do ___
API.onmessage = (event) => {
    let data = JSON.parse(event.data);
    // Sends msg from API to console
    console.log(data);

    // If data is ticker, not heartbeat
    if (data.type === "ticker"){

        let productID = data.product_id;
        changeData(productID, data);

    } else if (data.type === "error") {
        errorHandler(data.reason);
    }

}

// Fills dashboard with localStorage, on delay to allow for websocket to connect.
setTimeout(function (){
    fillTickers();
}, 700)

// Fills dashboard
function fillTickers() {
    currentTickers.forEach((item) => {
        addCard(item);
    })
}

// Adds card when input is entered
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

    // Set eventListener for remove button
    const removeButton = cardElement.querySelector(`#${ticker}-remove`);
    removeButton.addEventListener("click", () => {
        unsubscribe(ticker);
        removeCard(ticker);
    });

    cardWrapper.appendChild(cardElement);
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
    // Sends to API to add to watch list
    subscribe(ticker);
}

// Removes card from dashboard
function removeCard(ticker) {
    document.querySelector(`#${ticker}card`).remove();
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
}

// Changes data in cards
function changeData(productID, data) {
    setPrice(productID, data.price, data.open_24h);
    setLow(productID, data.low_24h);
    setHigh(productID, data.high_24h);
    setOpen(productID, data.open_24h);
    setVolume(productID, data.volume_30d);
}

// Changes price
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

// Sets 24hr low
function setLow(tickerID, tickerLow) {
    document.querySelector(`#${tickerID}-low`).innerText = '$' + tickerLow;
}

// Sets 24hr high
function setHigh(tickerID, tickerHigh) {
    document.querySelector(`#${tickerID}-high`).innerText = '$' + tickerHigh;
}

// Sets 24hr open price
function setOpen(tickerID, tickerOpen) {
    document.querySelector(`#${tickerID}-open`).innerText = '$' + tickerOpen;
}

// Sets 30d volume
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

// Handles any errors from API
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
}

// Called if session was idle too long; websocket force closes from API
function idleSession(){
    currentTickers = [];
    localStorage.setItem("tickerList", JSON.stringify(currentTickers));
    alert('Session has been idle too long, please reload the page') ? "" : location.reload();
}

// Sent to API to start watchlist
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

    // Checks if socket is open, if not, force refresh
    if (!isSocketOpen(API)) {
        idleSession();
        return;
    }
    
    API.send(JSON.stringify(parameters));
}

// Checks if socket is open
function isSocketOpen(wss) {
    return wss.readyState === wss.OPEN;
}

// Sent to API to remove ticker from watchlist
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