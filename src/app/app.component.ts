import { Component, OnInit} from '@angular/core';
import * as io from 'socket.io-client'

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
        if (currency.exchange == data[1].exchange && currency.symbol == data[1].symbol && Math.round(Number(data[0].vol)) >= currency.initFilterValue) {
          let date = new Date(data[0].time);
          currency.trades.push({
            volume: Math.round(Number(data[0].vol)).toLocaleString(),
            time: date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(),
            price: data[0].price,
            side: data[0].side
          })
          if (currency.trades.length >= 58) {
            currency.trades.pop()
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
              vol: item.vol != '' ? Number(item.vol).toLocaleString() : '',
              price: item.price,
              hit: item.hit != null ? Number(item.hit).toLocaleString() : '',
              lift: item.lift != null ? Number(item.lift).toLocaleString() : '',
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
