import { subscribeToEvents } from '../store/interactions'
import MyTransactions from './MyTransactions'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import PriceChart from './PriceChart'
import OrderBook from './OrderBook'
import NewOrder from './NewOrder'
import Balance from './Balance'
import Trades from './Trades'
import {
  exchangeSelector,
  tokenSelector,
  web3Selector
} from '../store/selectors'

class Content extends Component {
  componentWillMount() {
    this.loadBlockchainData(this.props)
  }

  async loadBlockchainData(props) {
    const { dispatch, web3, exchange, token } = props
    await subscribeToEvents(dispatch, web3, exchange, token)
  }

  render() {
    return (
      <div className="content">
        <div className="vertical-split">
          <Balance />
          <NewOrder />
        </div>
        <OrderBook />
        <div className="vertical-split">
          <PriceChart />
          <MyTransactions />
        </div>
        <Trades />
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    exchange: exchangeSelector(state),
    token: tokenSelector(state),
    web3: web3Selector(state)
  }
}

export default connect(mapStateToProps)(Content)