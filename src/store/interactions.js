import Exchange from '../abis/Exchange.json'
import { ETHER_ADDRESS } from '../helpers'
import Token from '../abis/Token.json'
import Web3 from 'web3'
import {
  web3Loaded,
  web3AccountLoaded,
  tokenLoaded,
  exchangeLoaded,
  cancelledOrdersLoaded,
  filledOrdersLoaded,
  allOrdersLoaded,
  orderCancelling,
  orderCancelled,
  orderFilling,
  orderFilled,
  etherBalanceLoaded,
  tokenBalanceLoaded,
  exchangeEtherBalanceLoaded,
  exchangeTokenBalanceLoaded,
  balancesLoaded,
  balancesLoading,
  buyOrderMaking,
  sellOrderMaking,
  orderMade
} from './actions'

export const loadWeb3 = async (dispatch) => {
  if(typeof window.ethereum!=='undefined'){
    window.ethereum.autoRefreshOnNetworkChange = false;
    const web3 = new Web3(window.ethereum)
    dispatch(web3Loaded(web3))
    return web3
  } else {
    window.alert('Please install MetaMask')
    window.location.assign("https://metamask.io/")
  }
}

export const loadAccount = async (web3, dispatch) => {
  const accounts = await web3.eth.getAccounts()
  const account = await accounts[0]
  if(typeof account !== 'undefined'){
    dispatch(web3AccountLoaded(account))
    return account
  } else {
    dispatch(web3AccountLoaded(null))
    return null
  }
}

export const loadToken = async (web3, networkId, dispatch) => {
  try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
    dispatch(tokenLoaded(token))
    return token
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadExchange = async (web3, networkId, dispatch) => {
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
    dispatch(exchangeLoaded(exchange))
    return exchange
  } catch (error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadAllOrders = async (exchange, dispatch) => {
  // Fetch cancelled orders with the "Cancel" event stream
  const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })
  // Format cancelled orders
  const cancelledOrders = cancelStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(cancelledOrdersLoaded(cancelledOrders))

  // Fetch filled orders with the "Trade" event stream
  const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' })
  // Format filled orders
  const filledOrders = tradeStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(filledOrdersLoaded(filledOrders))

  // Load order stream
  const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0, toBlock: 'latest' })
  // Format order stream
  const allOrders = orderStream.map((event) => event.returnValues)
  // Add open orders to the redux store
  dispatch(allOrdersLoaded(allOrders))
}

export const subscribeToEvents = async (dispatch, web3, exchange, token) => {
  let account
  // put into try block, in order to prevent error: exchange is "undefined"
  try {
    exchange.events.Cancel({}, (error, event) => {
      dispatch(orderCancelled(event.returnValues))
    })

    exchange.events.Trade({}, async (error, event) => {
      dispatch(orderFilled(event.returnValues))

      account = await loadAccount(web3, dispatch)
      loadBalances(dispatch, web3, exchange, token, account)
    })

    exchange.events.Deposit({}, async (error, event) => {
      dispatch(balancesLoaded())

      account = await loadAccount(web3, dispatch)
      loadBalances(dispatch, web3, exchange, token, account)
    })

    exchange.events.Withdraw({}, async (error, event) => {
      dispatch(balancesLoaded())

      account = await loadAccount(web3, dispatch)
      loadBalances(dispatch, web3, exchange, token, account)
    })

    exchange.events.Order({}, async (error, event) => {
      dispatch(orderMade(event.returnValues))

      account = await loadAccount(web3, dispatch)
      loadBalances(dispatch, web3, exchange, token, account)
    })
  } catch (e) {
    console.log(e)
  }
}

export const cancelOrder = (dispatch, exchange, order, account) => {
  if(account){
    exchange.methods.cancelOrder(order.id).send({ from: account })
    .on('transactionHash', (hash) => {
       dispatch(orderCancelling())
    })
    .on('error', (error) => {
      console.log(error)
      window.alert('There was an error!')
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const fillOrder = async (dispatch, exchange, order, account) => {
  if(account) {
    const fee = await exchange.methods.calcFee().call({from: account})
    exchange.methods.fillOrder(order.id).send({ from: account, value: fee.toString() })
    .on('transactionHash', (hash) => {
       dispatch(orderFilling())
    })
    .on('error', (error) => {
      console.log(error)
      window.alert('There was an error!')
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const loadBalances = async (dispatch, web3, exchange, token, account) => {
  if(account && token && exchange){
    // Put it into try block in order to prevent error with syncing...
    try {
      // Ether balance in wallet
      const etherBalance = await web3.eth.getBalance(account)
      dispatch(etherBalanceLoaded(etherBalance))

      // Token balance in wallet
      const tokenBalance = await token.methods.balanceOf(account).call()
      dispatch(tokenBalanceLoaded(tokenBalance))

      // Ether balance in exchange
      const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
      dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))

      // Token balance in exchange
      const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call()
      dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance))

      // Trigger all balances loaded
      dispatch(balancesLoaded())
    } catch (e) {
      console.log('Syncing...')
    }
  }
}

export const depositEther = (dispatch, exchange, web3, amount, account) => {
  if(account){
    exchange.methods.depositEther().send({ from: account, value: web3.utils.toWei(amount, 'ether') })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const withdrawEther = (dispatch, exchange, web3, amount, account) => {
  if(account){
    exchange.methods.withdrawEther(web3.utils.toWei(amount, 'ether')).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const depositToken = (dispatch, exchange, web3, token, amount, account) => {
  amount = web3.utils.toWei(amount, 'ether')

  if(account){
    token.methods.approve(exchange.options.address, amount).send({ from: account })
    .on('transactionHash', (hash) => {
      exchange.methods.depositToken(token.options.address, amount).send({ from: account })
      .on('transactionHash', (hash) => {
        dispatch(balancesLoading())
      })
      .on('error',(error) => {
        console.error(error)
        window.alert(`There was an error!`)
      })
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const withdrawToken = (dispatch, exchange, web3, token, amount, account) => {
  if(account){
    exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(amount, 'ether')).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const makeBuyOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = token.options.address
  const amountGet = web3.utils.toWei(order.amount, 'ether')
  const tokenGive = ETHER_ADDRESS
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  if(account) {
    exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(buyOrderMaking())
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const makeSellOrder = (dispatch, exchange, token, web3, order, account) => {
  const tokenGet = ETHER_ADDRESS
  const tokenGive = token.options.address
  const amountGive = web3.utils.toWei(order.amount, 'ether')
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  if(account){
    exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(sellOrderMaking())
    })
    .on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const update = async (dispatch) => {
  let account, web3, netId, exchange, token

  web3 = await loadWeb3(dispatch)
  netId = await web3.eth.net.getId()
  account = await loadAccount(web3, dispatch)
  token = await loadToken(web3, netId, dispatch)
  exchange = await loadExchange(web3, netId, dispatch)

  if(!token || !exchange || !account){
    await reset(dispatch)
  } else {
    await loadAllOrders(exchange, dispatch)
    await loadBalances(dispatch, web3, exchange, token, account)
  }
}

export const reset = async (dispatch) =>{
  window.alert('Please login/switch network with MetaMask')

  //balances
  dispatch(exchangeEtherBalanceLoaded(0))
  dispatch(exchangeTokenBalanceLoaded(0))
  dispatch(etherBalanceLoaded(0))
  dispatch(tokenBalanceLoaded(0))
  dispatch(balancesLoaded())

  //orders
  dispatch(cancelledOrdersLoaded())
  dispatch(filledOrdersLoaded())
  dispatch(allOrdersLoaded())
}