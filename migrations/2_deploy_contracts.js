const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {
  await deployer.deploy(Token);

  const accounts = await web3.eth.getAccounts()
  const feeAccount = accounts[0]

  const priceFeed = '0x9326BFA02ADD2366b30bacB125260Af641031331' //kovan
  await deployer.deploy(Exchange, feeAccount, priceFeed)
};