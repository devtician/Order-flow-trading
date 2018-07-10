var adjust = require("./decimalAdjust.js")

let ceil = adjust.ceil(2.554, -2)
let floor = adjust.floor(2.995, -2)

console.log("ceil", ceil)
console.log("floor", floor)