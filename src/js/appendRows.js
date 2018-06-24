var socket = io.connect('http://localhost:3000');
socket.on('push', function (data) {
    console.log(data)
    var binance = document.getElementById("prices--binance");
    while (binance.firstChild) {
        binance.removeChild(binance.firstChild);
    }

    // Instantiate the table with the existing HTML tbody
    // and the row with the template
    var tAsk = document.querySelector('#row--ask');
    var tBid = document.querySelector('#row--bid');
    var tMid = document.querySelector('#row--mid');

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
        vol.textContent = data[i].vol;
        price.textContent = data[i].price;
        sold.textContent = data[i].hit;
        bought.textContent = data[i].lift;
        tb.appendChild(clone);
    }

    socket.emit('response', "success");
});