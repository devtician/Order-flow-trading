var socket = io.connect('http://localhost:3001');

// Instantiate the table with the existing HTML tbody
// and the row with the template
var tAsk = document.querySelector('#row--ask');
var tBid = document.querySelector('#row--bid');
var tMid = document.querySelector('#row--mid');
var tBuy = document.querySelector('#row--buy');
var tSell = document.querySelector('#row--sell');

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
    // console.log(data)
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
socket.on('binance-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".binance-trades");

    while (tb.childElementCount >= 46) {
        tb.removeChild(tb.lastChild)
    }

    if (data.side == true) {
        var clone = document.importNode(tSell.content, true);
    } else {
        var clone = document.importNode(tBuy.content, true);
    }
    vol = clone.querySelector(".row__volume");
    price = clone.querySelector(".row__price");
    time = clone.querySelector(".row__time");
    vol.textContent = Number(data.vol).toLocaleString();
    var date = new Date(data.time);
    time.textContent = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    price.textContent = data.price;
    if (Number(data.vol) >= document.getElementById('binance-filter').value) {
        tb.insertBefore(clone, tb.firstChild);
    }
    socket.emit('response', "success");
});
socket.on('bitfinex-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".bitfinex-trades");

    while (tb.childElementCount >= 46) {
        tb.removeChild(tb.lastChild)
    }

    if (Math.sign(data.vol) == 1) {
        var cloneBitfinex = document.importNode(tBuy.content, true);
    } else if (Math.sign(data.vol) == -1){
        var cloneBitfinex = document.importNode(tSell.content, true);
    }
    vol = cloneBitfinex.querySelector(".row__volume");
    price = cloneBitfinex.querySelector(".row__price");
    time = cloneBitfinex.querySelector(".row__time");
    vol.textContent = Math.abs(Number(data.vol)).toLocaleString();
    var date = new Date(data.time);
    time.textContent = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    price.textContent = data.price;
    if (Math.abs(Number(data.vol)) >= document.getElementById('bitfinex-filter').value) {
        tb.insertBefore(cloneBitfinex, tb.firstChild);
    }
    socket.emit('response', "success");
});

function resetBinanceFilter(){
    var tb = document.querySelector(".binance-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}
function resetBitfinexFilter(){
    var tb = document.querySelector(".bitfinex-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}