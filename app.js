import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";

const CONTRACT_ADDRESS = "0xbe75d09F423d81ad63Bc511b49462e216D394836";
const PROJECT_ID = "fe55ea601c3e7e0925c0b33723d6b158";
const READ_RPC = "https://ethereum.publicnode.com";
const MAX_SUPPLY = 6666;
const PRICE_ETH = "0.0001";
const BASE_METADATA = "https://ipfs.io/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/";

const ABI = ["function mint(uint256 amount) external payable","function PRICE() view returns (uint256)","function totalSupply() view returns (uint256)","function minted(address user) view returns (uint256)","function tokenURI(uint256 tokenId) view returns (string)"];

const MAINNET_HEX = "0x1", MAINNET_ID = 1;
let wcProvider, provider, signer, contract, readProvider, readContract, account;
const metaCache = new Map();
const $ = id => document.getElementById(id);
const walletModal = $("walletModal"), detailModal = $("detailModal");

function status(x){ $("status").textContent = x; }
function openWallet(){ walletModal.classList.remove("hidden"); }
function closeWallet(){ walletModal.classList.add("hidden"); }
function closeDetail(){ detailModal.classList.add("hidden"); }
function amount(){ let a=Number($("amountInput").value); if(!a||a<1)a=1; if(a>100)a=100; $("amountInput").value=a; return a; }
function ipfsToHttp(u){ return u && u.startsWith("ipfs://") ? "https://ipfs.io/ipfs/" + u.replace("ipfs://","") : u; }

function setLinks(){
  if(CONTRACT_ADDRESS !== "PASTE_CONTRACT_ADDRESS_HERE"){
    $("etherscanLink").href = "https://etherscan.io/address/" + CONTRACT_ADDRESS;
    $("openseaLink").href = "https://opensea.io/assets/ethereum/" + CONTRACT_ADDRESS;
  }
}
function initRead(){
  if(CONTRACT_ADDRESS === "PASTE_CONTRACT_ADDRESS_HERE") return false;
  readProvider = new ethers.JsonRpcProvider(READ_RPC);
  readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
  return true;
}
async function loadSupply(){
  try{
    let s = 0;
    if(readContract) s = Number(await readContract.totalSupply());
    const pct = s / MAX_SUPPLY * 100;
    $("mintedText").textContent = s.toLocaleString();
    $("remainingText").textContent = (MAX_SUPPLY - s).toLocaleString();
    $("progressBar").style.width = pct + "%";
    $("percentText").textContent = pct.toFixed(2) + "%";
    await updatePrice();
  }catch(e){ status("Read error: " + (e.shortMessage || e.message)); }
}
async function getMeta(id){
  if(metaCache.has(id)) return metaCache.get(id);
  const meta = await (await fetch(BASE_METADATA + id + ".json")).json();
  meta.image = ipfsToHttp(meta.image);
  metaCache.set(id, meta);
  return meta;
}
function renderGrid(){
  const grid = $("grid");
  const q = $("searchId").value.trim();
  let ids = [];
  if(q){ const n=Number(q); if(n>=1 && n<=MAX_SUPPLY) ids=[n]; }
  else { for(let i=1;i<=MAX_SUPPLY;i++) ids.push(i); }
  grid.innerHTML = ids.map(id => `<article class="card" data-id="${id}"><span class="id">#${id}</span><img loading="lazy" data-id="${id}" src=""><div class="name">v2 Grifter #${id}</div></article>`).join("");
  document.querySelectorAll(".card").forEach(card => card.onclick = () => openDetail(Number(card.dataset.id)));
  observeImages();
}
function observeImages(){
  const root = $("grid");
  const io = new IntersectionObserver(entries => entries.forEach(async entry => {
    if(entry.isIntersecting){
      const img = entry.target;
      const id = Number(img.dataset.id);
      try{ img.src = (await getMeta(id)).image; }catch(e){}
      io.unobserve(img);
    }
  }), {root, rootMargin:"250px"});
  document.querySelectorAll(".card img").forEach(img => io.observe(img));
}
async function openDetail(id){
  try{
    const meta = await getMeta(id);
    $("detailImage").src = meta.image;
    $("detailName").textContent = meta.name || ("v2 Grifter #" + id);
    $("detailId").textContent = "#" + id;
    $("detailDescription").textContent = meta.description || "";
    $("attributes").innerHTML = (meta.attributes || []).map(a => `<div class="attr"><span>${a.trait_type}</span><b>${a.value}</b></div>`).join("") || "<div class='attr'><span>Metadata</span><b>No attributes</b></div>";
    detailModal.classList.remove("hidden");
  }catch(e){ alert("Metadata load error: " + e.message); }
}
async function setup(p, acc){
  if(CONTRACT_ADDRESS === "PASTE_CONTRACT_ADDRESS_HERE") throw new Error("Встав адресу контракту в app.js");
  provider = new ethers.BrowserProvider(p);
  signer = await provider.getSigner();
  account = acc || await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  readContract = contract;
  $("wallet").textContent = account.slice(0,6)+"..."+account.slice(-4);
  closeWallet();
  await loadSupply();
  await updatePrice();
}
async function connectBrowser(){
  try{
    if(!window.ethereum) throw new Error("Wallet extension not found");
    if(await window.ethereum.request({method:"eth_chainId"}) !== MAINNET_HEX){
      await window.ethereum.request({method:"wallet_switchEthereumChain", params:[{chainId:MAINNET_HEX}]});
    }
    const acc = await window.ethereum.request({method:"eth_requestAccounts"});
    await setup(window.ethereum, acc[0]);
  }catch(e){ alert(e.shortMessage || e.message); }
}
async function connectWC(){
  try{
    wcProvider = await EthereumProvider.init({ projectId: PROJECT_ID, chains:[MAINNET_ID], optionalChains:[MAINNET_ID], showQrModal:true });
    await wcProvider.connect();
    await setup(wcProvider, (wcProvider.accounts || [])[0]);
  }catch(e){ alert(e.shortMessage || e.message); }
}
async function disconnect(){
  try{ if(wcProvider) await wcProvider.disconnect(); }catch(e){}
  provider = signer = contract = account = null;
  $("wallet").textContent = "not connected";
  initRead();
  await loadSupply();
  status("Disconnected");
}
async function updatePrice(){
  const a = BigInt(amount());
  if(!account || !contract){
    $("priceText").textContent = a === 1n ? "FREE" : (Number(a - 1n) * Number(PRICE_ETH)).toFixed(4).replace(/0+$/,'').replace(/\.$/,'') + " ETH";
    return;
  }
  const p = await contract.PRICE();
  const used = await contract.minted(account);
  let paid = a;
  if(used === 0n) paid = paid > 0n ? paid - 1n : 0n;
  $("priceText").textContent = paid === 0n ? "FREE" : ethers.formatEther(p * paid) + " ETH";
}
async function mint(){
  try{
    if(!contract){ openWallet(); return; }
    const a = BigInt(amount());
    const p = await contract.PRICE();
    const used = await contract.minted(account);
    let paid = a;
    if(used === 0n) paid = paid > 0n ? paid - 1n : 0n;
    status("Confirm mint...");
    const tx = await contract.mint(Number(a), { value: p * paid });
    status("Tx: " + tx.hash);
    await tx.wait();
    status("Mint success");
    await loadSupply();
  }catch(e){ status("Error: " + (e.shortMessage || e.message)); }
}
$("connectWalletBtn").onclick = openWallet;
$("closeWalletBtn").onclick = closeWallet;
$("browserWalletBtn").onclick = connectBrowser;
$("walletConnectBtn").onclick = connectWC;
$("disconnectBtn").onclick = disconnect;
$("mintBtn").onclick = mint;
$("refreshSupplyBtn").onclick = loadSupply;
$("minusBtn").onclick = async()=>{ $("amountInput").value = Math.max(1, amount()-1); await updatePrice(); };
$("plusBtn").onclick = async()=>{ $("amountInput").value = Math.min(100, amount()+1); await updatePrice(); };
$("amountInput").oninput = updatePrice;
$("goBtn").onclick = renderGrid;
$("searchId").oninput = renderGrid;
$("loadVisibleBtn").onclick = renderGrid;
$("closeDetailBtn").onclick = closeDetail;
setLinks(); initRead(); renderGrid(); loadSupply(); updatePrice();
