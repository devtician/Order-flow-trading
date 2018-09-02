const express = require('express')
const path = require('path')
const app = express()
const server = require('http').Server(app);
const io = require('socket.io')(server, { 'pingTimeout': 7000 , 'pingInterval': 1000});

// CONFIG
app.set('view engine', "ejs")
app.use(express.static(__dirname, +"/build/public"))
app.set('views', path.join(__dirname, '/src/views'));

// ROUTES
app.get("/", function(req, res){
    res.render("index")
})

// BITFINEX Initialization
const currency = require("./bitfinex-refactor.js")
const WebSocket = require("ws")
const wss = new WebSocket("wss://api.bitfinex.com/ws/2")

let currencyArray = [
    eos_usd = new currency(2, 0, 'EOSUSD'),
    btc_usd = new currency(0, 4, 'BTCUSD'),
]

wss.onopen = () => {
    for (let currency of currencyArray) {
        wss.send(currency.subscribeOrderbook())
        wss.send(currency.subscribeTrades())
    }
}


wss.onmessage = (message) => {
    let response = JSON.parse(message.data)

    if(Array.isArray(response)){
        for (let currency of currencyArray) {
            if (response[0] == currency.channelId.book) {
                if (response[1].length > 3) {
                    currency.snapshotOrderbook(response)
                } else {
                    let cup = currency.updateOrderbook(response)
                    if(cup != null){
                        io.sockets.emit(`update-btfx-${currency.symbol}-cup`, cup)
                    }
                }
            } else if (response[0] == currency.channelId.trades) {
                let trades = currency.updateTrades(response)
                if(trades != null){
                    io.sockets.emit(`update-btfx-${currency.symbol}-cup`, trades[0])
                    io.sockets.emit(`update-btfx-${currency.symbol}-trades`, trades[1])
                }
            }
        }
    } else {
        let event = response.event
        let channel = response.channel
        let pair = response.pair
        switch(event){
            case "subscribed":
                if (channel == 'book') {
                    for (let currency of currencyArray) {
                        if (pair == currency.symbol) {
                            currency.channelId.book = response.chanId
                            console.log(`${currency.symbol} book channel ID updated`)
                        }
                    }
                } else if (channel == 'trades') {
                    for (let currency of currencyArray) {
                        if (pair == currency.symbol) {
                            currency.channelId.trades = response.chanId
                            console.log(`${currency.symbol} trades channel ID updated`)
                        }
                    }
                }
                break
            case "info":
                console.log(response)
                break
            default:
                console.log(response)
        }
    }
}

// SERVER
server.listen(3000, function(){
    console.log("Server running on port 3000")
})