import { Component, OnInit} from '@angular/core';
import * as io from 'socket.io-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit{
  currencyArray = [];
  socket;

  ngOnInit() {
    this.socket = io.connect('http://localhost:3000')
    this.socket.on('getCurrencies', (data) => {
      this.currencyArray = data
    })
    this.socket.on('update-trades', (data) => {
      for (let currency of this.currencyArray) {
        if (currency.exchange == data[1].exchange && currency.symbol == data[1].symbol && Math.abs(Number(data[0].vol)) >= currency.initFilterValue) {
          if (Math.abs(Number(data[0].vol)) != 0) {
            let date = new Date(data[0].time);
            currency.trades.unshift({
              volume: Math.abs(Number(data[0].vol)).toFixed(data[1].numsAfterDecimal.trades),
              time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
              price: data[0].price.toFixed(data[1].numsAfterDecimal.cup),
              side: typeof data[0].side === 'boolean' ? data[0].side : (Math.sign(data[0].vol) == 1 ? false : true)
            })
            if (currency.trades.length >= 58) {
              currency.trades.pop()
            }
          }
        }
      }
    })
    this.socket.on('update-cup', (data) => {
      for (let currency of this.currencyArray) {
        if (currency.exchange == data[1].exchange && currency.symbol == data[1].symbol) {
          currency.cup = []
          for (let item of data[0]) {
            currency.cup.push({
              vol: item.vol != '' ? item.vol : '',
              price: item.price.toFixed(data[1].numsAfterDecimal.cup),
              hit: item.hit != null ? item.hit.toFixed(data[1].numsAfterDecimal.trades) : '',
              lift: item.lift != null ? item.lift.toFixed(data[1].numsAfterDecimal.trades) : '',
              type: item.type
            })
          }
        }
      }
    })
  }

  changeFilterValue(e) {
    let idArr = e.target.id.split('-')
    for (let currency of this.currencyArray) {
      if (currency.exchange == idArr[0] && currency.symbol == idArr[1]) {
        currency.initFilterValue = Number(e.target.value)
      }
    }
  }

  resetFilter(e){
    let filter  = e.target.nextSibling;
    while (filter.children.length != 0) {
      filter.removeChild(filter.lastChild)
    }
  }
}
