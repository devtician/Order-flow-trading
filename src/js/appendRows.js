var socket = io.connect('http://localhost:3001');

// Instantiate the table with the existing HTML tbody
// and the row with the template
var tAsk = document.querySelector('#row--ask');
var tBid = document.querySelector('#row--bid');
var tMid = document.querySelector('#row--mid');
var tBuy = document.querySelector('#row--buy');
var tSell = document.querySelector('#row--sell');

socket.on('pushBinance-eos', function (data) {
    var binance = document.getElementById("prices-eos-binance");
    while (binance.firstChild) {
        binance.removeChild(binance.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices-eos-binance");

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
socket.on('pushbtfx-eos', function (data) {
    // console.log(data)
    var bitfinex = document.getElementById("prices-eos-bitfinex");
    while (bitfinex.firstChild) {
        bitfinex.removeChild(bitfinex.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices-eos-bitfinex");

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
socket.on('binance-eos-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".binance-eos-trades");

    while (tb.childElementCount >= 58) {
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
    vol.textContent = Math.round(Number(data.vol)).toLocaleString();
    var date = new Date(data.time);
    time.textContent = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    price.textContent = data.price;
    if (Number(data.vol) >= document.getElementById('binance-eos-filter').value) {
        tb.insertBefore(clone, tb.firstChild);
    }
    socket.emit('response', "success");
});
socket.on('bitfinex-eos-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".bitfinex-eos-trades");

    while (tb.childElementCount >= 58) {
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
    if (Math.abs(Number(data.vol)) >= document.getElementById('bitfinex-eos-filter').value) {
        tb.insertBefore(cloneBitfinex, tb.firstChild);
    }
    socket.emit('response', "success");
});

function resetBinanceEosFilter(){
    var tb = document.querySelector(".binance-eos-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}
function resetBitfinexEosFilter(){
    var tb = document.querySelector(".bitfinex-eos-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}

socket.on('pushBinance-btc', function (data) {
    console.log(data)
    var binance = document.getElementById("prices-btc-binance");
    while (binance.firstChild) {
        binance.removeChild(binance.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices-btc-binance");

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
        if (data[i].vol.toLocaleString() != "" && Math.round(data[i].vol) != 0) {
            vol.textContent = Number(data[i].vol).toLocaleString();
        }
        price.textContent = data[i].price;
        if (data[i].hit != null) {
            sold.textContent = Math.round(Number(data[i].hit)).toLocaleString();
        }
        if (data[i].lift != null) {
            bought.textContent = Math.round(Number(data[i].lift)).toLocaleString();
        }
        tb.appendChild(clone);
    }

    socket.emit('response', "success");
});
socket.on('pushbtfx-btc', function (data) {
    // console.log(data)
    var bitfinex = document.getElementById("prices-btc-bitfinex");
    while (bitfinex.firstChild) {
        bitfinex.removeChild(bitfinex.firstChild);
    }

    // Clone the new row and insert it into the table
    var tb = document.querySelector("#prices-btc-bitfinex");

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
        if (data[i].vol.toLocaleString() != "") {
            vol.textContent = Number(data[i].vol).toLocaleString();
        }
        price.textContent = data[i].price;
        if (data[i].hit != null) {
            sold.textContent = Math.round(Number(data[i].hit)).toLocaleString();
        }
        if (data[i].lift != null) {
            bought.textContent = Math.round(Number(data[i].lift)).toLocaleString();
        }
        tb.appendChild(clone);
    }

    socket.emit('response', "success");
});
socket.on('binance-btc-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".binance-btc-trades");

    while (tb.childElementCount >= 58) {
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
    if (Number(data.vol) >= document.getElementById('binance-btc-filter').value) {
        tb.insertBefore(clone, tb.firstChild);
    }
    socket.emit('response', "success");
});
socket.on('bitfinex-btc-trades', function (data) {
    // console.log(data)

    // Clone the new row and insert it into the table
    var tb = document.querySelector(".bitfinex-btc-trades");

    while (tb.childElementCount >= 58) {
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
    if (Math.abs(Number(data.vol)) >= document.getElementById('bitfinex-btc-filter').value) {
        tb.insertBefore(cloneBitfinex, tb.firstChild);
    }
    socket.emit('response', "success");
});

function resetBinanceBtcFilter(){
    var tb = document.querySelector(".binance-btc-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}
function resetBitfinexBtcFilter(){
    var tb = document.querySelector(".bitfinex-btc-trades");
    while (tb.firstChild) {
        tb.removeChild(tb.firstChild)
    }
}