import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";

const CONTRACT_ADDRESS = "0xbe75d09F423d81ad63Bc511b49462e216D394836";
const PROJECT_ID = "fe55ea601c3e7e0925c0b33723d6b158";
const READ_RPC = "https://ethereum.publicnode.com";
const MAX_SUPPLY = 6666;
const BASE_METADATA = "https://ipfs.io/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/";

const ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
];

const MAINNET_HEX = "0x1", MAINNET_ID = 1;
let wcProvider, provider, signer, readProvider, readContract, account;
const metaCache = new Map();
let activeFilter = null;

const $ = id => document.getElementById(id);
const walletModal = $("walletModal"), detailModal = $("detailModal");

function openWallet(){ walletModal.classList.remove("hidden"); }
function closeWallet(){ walletModal.classList.add("hidden"); }
function closeDetail(){ detailModal.classList.add("hidden"); }
function short(a){ return a.slice(0,6)+"..."+a.slice(-4); }
function ipfsToHttp(u){ return u && u.startsWith("ipfs://") ? "https://ipfs.io/ipfs/" + u.replace("ipfs://","") : u; }

function setLinks(){
  if(CONTRACT_ADDRESS !== "0xbe75d09F423d81ad63Bc511b49462e216D394836"){
    $("etherscanLink").href = "https://etherscan.io/address/" + CONTRACT_ADDRESS;
    $("openseaLink").href = "https://opensea.io/assets/ethereum/" + CONTRACT_ADDRESS;
  }
}

function initRead(){
  if(CONTRACT_ADDRESS === "0xbe75d09F423d81ad63Bc511b49462e216D394836") return false;
  readProvider = new ethers.JsonRpcProvider(READ_RPC);
  readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
  return true;
}

async function loadSupply(){
  try{
    let s = MAX_SUPPLY;
    if(readContract) s = Number(await readContract.totalSupply());
    $("mintedText").textContent = s.toLocaleString();
    $("remainingText").textContent = Math.max(0, MAX_SUPPLY - s).toLocaleString();
  }catch(e){}
}

async function getMeta(id){
  if(metaCache.has(id)) return metaCache.get(id);
  let url = BASE_METADATA + id + ".json";
  if(readContract){
    try{ url = ipfsToHttp(await readContract.tokenURI(id)); }catch(e){}
  }
  const meta = await (await fetch(url)).json();
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
      try{
        const meta = await getMeta(id);
        img.src = meta.image;
        img.closest(".card").querySelector(".name").textContent = meta.name || ("v2 Grifter #" + id);
      }catch(e){}
      io.unobserve(img);
    }
  }), {root, rootMargin:"250px"});
  document.querySelectorAll(".card img").forEach(img => io.observe(img));
}

function attrHtml(attrs){
  return (attrs || []).map(a => `<div class="attr"><span>${a.trait_type}</span><b>${a.value}</b></div>`).join("") || "<div class='attr'><span>Metadata</span><b>No attributes</b></div>";
}

async function openDetail(id){
  try{
    const meta = await getMeta(id);
    $("detailImage").src = meta.image;
    $("detailName").textContent = meta.name || ("v2 Grifter #" + id);
    $("detailId").textContent = "#" + id;
    $("detailDescription").textContent = meta.description || "";
    $("attributes").innerHTML = attrHtml(meta.attributes);
    $("detailOpenSea").href = CONTRACT_ADDRESS === "0xbe75d09F423d81ad63Bc511b49462e216D394836" ? "#" : `https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${id}`;
    detailModal.classList.remove("hidden");
  }catch(e){ alert("Metadata load error: " + e.message); }
}

async function randomGrifter(){
  const id = Math.floor(Math.random() * MAX_SUPPLY) + 1;
  const meta = await getMeta(id);
  $("randomImage").src = meta.image;
  $("randomName").textContent = meta.name || ("v2 Grifter #" + id);
  $("randomAttributes").innerHTML = attrHtml((meta.attributes || []).slice(0,4));
  $("randomOpenSea").href = CONTRACT_ADDRESS === "0xbe75d09F423d81ad63Bc511b49462e216D394836" ? "#" : `https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${id}`;
}

async function setup(p, acc){
  provider = new ethers.BrowserProvider(p);
  signer = await provider.getSigner();
  account = acc || await signer.getAddress();
  $("wallet").textContent = short(account);
  closeWallet();

  if(readContract){
    try{
      const bal = await readContract.balanceOf(account);
      $("yourBalanceText").textContent = bal.toString();
    }catch(e){}
  }
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

async function loadHolderStats(){
  if(!readProvider || CONTRACT_ADDRESS === "0xbe75d09F423d81ad63Bc511b49462e216D394836"){
    alert("Insert contract address in app.js first");
    return;
  }

  $("topHolders").innerHTML = "<div class='empty'>Loading transfers... this can take a moment.</div>";

  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  const latest = await readProvider.getBlockNumber();
  const step = 100000;
  const balances = new Map();
  let loaded = 0;

  for(let from = 0; from <= latest; from += step){
    const to = Math.min(latest, from + step - 1);
    try{
      const logs = await readProvider.getLogs({
        address: CONTRACT_ADDRESS,
        topics: [transferTopic],
        fromBlock: from,
        toBlock: to
      });

      for(const log of logs){
        const fromAddr = "0x" + log.topics[1].slice(26).toLowerCase();
        const toAddr = "0x" + log.topics[2].slice(26).toLowerCase();

        if(fromAddr !== "0x0000000000000000000000000000000000000000"){
          balances.set(fromAddr, (balances.get(fromAddr) || 0) - 1);
        }
        if(toAddr !== "0x0000000000000000000000000000000000000000"){
          balances.set(toAddr, (balances.get(toAddr) || 0) + 1);
        }
        loaded++;
      }
    }catch(e){}
  }

  const holders = [...balances.entries()].filter(([,v]) => v > 0).sort((a,b)=>b[1]-a[1]);
  $("holdersText").textContent = holders.length.toLocaleString();
  $("totalHolders").textContent = holders.length.toLocaleString();
  $("topHolderAmount").textContent = holders[0] ? holders[0][1].toString() : "0";
  $("loadedTransfers").textContent = loaded.toLocaleString();

  $("topHolders").innerHTML = holders.slice(0,20).map((h,i)=>`
    <div class="holderRow">
      <b>#${i+1}</b>
      <code>${h[0]}</code>
      <span>${h[1]} NFTs</span>
    </div>
  `).join("") || "<div class='empty'>No holders found.</div>";
}

async function scanVisibleMetadata(){
  const cards = [...document.querySelectorAll(".card")].slice(0, 250);
  const traits = new Map();

  for(const card of cards){
    const id = Number(card.dataset.id);
    try{
      const meta = await getMeta(id);
      card.dataset.traits = JSON.stringify(meta.attributes || []);
      for(const a of meta.attributes || []){
        const key = `${a.trait_type}: ${a.value}`;
        traits.set(key, (traits.get(key) || 0) + 1);
      }
    }catch(e){}
  }

  const sorted = [...traits.entries()].sort((a,b)=>b[1]-a[1]).slice(0,60);
  $("traitFilters").innerHTML = sorted.map(([key,count]) => `<button class="filterPill" data-filter="${key}">${key} (${count})</button>`).join("") || "<div class='empty'>No traits found yet.</div>";

  document.querySelectorAll(".filterPill").forEach(btn => {
    btn.onclick = () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll(".filterPill").forEach(x=>x.classList.toggle("active", x===btn));
      applyTraitFilter();
    };
  });
}

function applyTraitFilter(){
  document.querySelectorAll(".card").forEach(card => {
    if(!activeFilter){ card.classList.remove("hiddenByFilter"); return; }
    let attrs = [];
    try{ attrs = JSON.parse(card.dataset.traits || "[]"); }catch(e){}
    const ok = attrs.some(a => `${a.trait_type}: ${a.value}` === activeFilter);
    card.classList.toggle("hiddenByFilter", !ok);
  });
}

function clearFilters(){
  activeFilter = null;
  document.querySelectorAll(".filterPill").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".card").forEach(x=>x.classList.remove("hiddenByFilter"));
}

$("connectWalletBtn").onclick = openWallet;
$("closeWalletBtn").onclick = closeWallet;
$("browserWalletBtn").onclick = connectBrowser;
$("walletConnectBtn").onclick = connectWC;
$("goBtn").onclick = renderGrid;
$("searchId").oninput = renderGrid;
$("loadVisibleBtn").onclick = renderGrid;
$("closeDetailBtn").onclick = closeDetail;
$("randomBtn").onclick = randomGrifter;
$("loadHoldersBtn").onclick = loadHolderStats;
$("scanVisibleBtn").onclick = scanVisibleMetadata;
$("clearFiltersBtn").onclick = clearFilters;

setLinks();
initRead();
loadSupply();
renderGrid();
randomGrifter();
