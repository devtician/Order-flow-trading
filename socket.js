var binance = require("node-binance-api");

binance.websockets.depthCache(['EOSUSDT'], (symbol, depth) => {
    let bids = binance.sortBids(depth.bids);
    let asks = binance.sortAsks(depth.asks);

    let bestBid = Number(binance.first(bids));
    let bestAsk = Number(binance.first(asks));

    let bidPrices = Object.keys(bids)
    let askPrices = Object.keys(asks)
    let bidVolumes = Object.values(bids)
    let askVolumes = Object.values(asks)

    let scaleMid = precisionRound(((bestBid + bestAsk)/2), 2)
    
    for(i=0; i < length.bidPrices; i++){

    }

    

})

function precisionRound(number, precision){
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}