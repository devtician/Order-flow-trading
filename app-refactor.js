const express = require('express')
const path = require('path')
const app = express()
const server = require('http').Server(app);
const io = require('socket.io')(server);

// CONFIG
app.set('view engine', "ejs")
app.use(express.static(__dirname, +"/build/public"))
app.set('views', path.join(__dirname, '/src/views'));

// ROUTES
app.get("/", function(req, res){
    res.render("index-refactor")
})

// BITFINEX Initialization
const BiftinexCurrency = require("./bitfinex-refactor.js")
const WebSocket = require("ws")
const wss = new WebSocket("wss://api.bitfinex.com/ws/2")

let bitfinexCurrencyArray = [
    eos_usd = new BiftinexCurrency(2, 0, 'EOSUSD'),
    btc_usd = new BiftinexCurrency(0, 4, 'BTCUSD'),
]

wss.onopen = () => {
    for (let currency of bitfinexCurrencyArray) {
        wss.send(currency.subscribeOrderbook())
        wss.send(currency.subscribeTrades())
    }
}

wss.onmessage = (message) => {
    let response = JSON.parse(message.data)
    
    if(Array.isArray(response)){
        for (let currency of bitfinexCurrencyArray) {
            if (response[0] == currency.channelId.book) {
                if (response[1].length > 3) {
                    currency.snapshotOrderbook(response)
                } else {
                    let cup = currency.updateOrderbook(response)
                    if(cup != null){
                        io.emit(`update-btfx-${currency.symbol}-cup`, cup)
                    }
                }
            } else if (response[0] == currency.channelId.trades) {
                let trades = currency.updateTrades(response)
                if(trades != null){
                    io.emit(`update-btfx-${currency.symbol}-cup`, trades[0])
                    io.emit(`update-btfx-${currency.symbol}-trades`, trades[1])
                }
            }
        }
    } else {
        let event = response.event
        let channel = response.channel
        let pair = response.pair
        switch(event){
            case "subscribed":
                for (let currency of bitfinexCurrencyArray) {
                    if (pair == currency.symbol) {
                        if (channel == 'book') {
                            currency.channelId.book = response.chanId
                            console.log(`${currency.symbol} book channel ID updated`)
                        } else if (channel == 'trades') {
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

// BINANCE Initialization
const binance = require("node-binance-api")
const BinanceCurrency = require('./binance-refactor.js')

let binanceCurrencyArray = [
    eos_usdt = new BinanceCurrency(2,0,'EOSUSDT'),
    btc_usdt = new BinanceCurrency(0,4,'BTCUSDT')
]

for (let currency of binanceCurrencyArray) {
    binance.websockets.depthCache([currency.symbol], (symbol, depth) => {
        let output = currency.updateOrderbook(symbol, depth)
        io.emit(`update-binance-${currency.symbol}-cup`, output)
    })
    binance.websockets.trades([currency.symbol], (trades) => {
        let output = currency.updateTrades(trades)
        io.emit(`update-binance-${currency.symbol}-cup`, output[0])
        io.emit(`update-binance-${currency.symbol}-trades`, output[1])
    })
}

// SERVER
server.listen(3000, function(){
    console.log("Server running on port 3000")
})