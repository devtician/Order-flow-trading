var socket = io.connect('http://localhost:3001');

// Instantiate the table with the existing HTML tbody
// and the row with the template
var tAsk = document.querySelector('#row--ask');
var tBid = document.querySelector('#row--bid');
var tMid = document.querySelector('#row--mid');

socket.on('push', function (data) {
    var binance = document.getElementById("prices--binance");
    while (binance.firstChild) {
        binance.removeChild(binance.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices--binance");

    for(var i=0;i<data.length;i++){
        if (data[i].type == 'ask'){
            var clone = document.importNode(tAsk.content, true);
        } else if (data[i].type == 'mid'){
            var clone = document.importNode(tMid.content, true);
        } else {
            var clone = document.importNode(tBid.content, true);
        }
        vol = clone.querySelector(".row__level-2");
        price = clone.querySelector(".row__price");
        sold = clone.querySelector(".sold");
        bought = clone.querySelector(".bought");
        if (data[i].vol != "") {
            vol.textContent = Number(data[i].vol).toLocaleString();
        }
        price.textContent = data[i].price;
        if (data[i].hit != null) {
            sold.textContent = Number(data[i].hit).toLocaleString();
        }
        if (data[i].lift != null) {
            bought.textContent = Number(data[i].lift).toLocaleString();
        }
        tb.appendChild(clone);
    }

    socket.emit('response', "success");
});
socket.on('pushbtfx', function (data) {
    console.log(data)
    var bitfinex = document.getElementById("prices--bitfinex");
    while (bitfinex.firstChild) {
        bitfinex.removeChild(bitfinex.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices--bitfinex");

    for(var i=0;i<data.length;i++){
        if (data[i].type == 'ask'){
            var clone = document.importNode(tAsk.content, true);
        } else if (data[i].type == 'mid'){
            var clone = document.importNode(tMid.content, true);
        } else {
            var clone = document.importNode(tBid.content, true);
        }
        vol = clone.querySelector(".row__level-2");
        price = clone.querySelector(".row__price");
        sold = clone.querySelector(".sold");
        bought = clone.querySelector(".bought");
        if (data[i].vol != "") {
            vol.textContent = Number(data[i].vol).toLocaleString();
        }
        price.textContent = data[i].price;
        if (data[i].hit != null) {
            sold.textContent = Number(data[i].hit).toLocaleString();
        }
        if (data[i].lift != null) {
            bought.textContent = Number(data[i].lift).toLocaleString();
        }
        tb.appendChild(clone);
    }

    socket.emit('response', "success");
});