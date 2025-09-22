let provider, signer, contract, userAddress;

// Replace these with your contract's details
const CONTRACT_ADDRESS = "0xYourContractAddressHere";
const CONTRACT_ABI = [ /* Put your ABI JSON here */ ];

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask is not installed!");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById("walletStatus").innerText = `Connected: ${userAddress}`;

    // Add or switch to ZenChain Testnet
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x20D8" }] // 8408 in hex
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x20D8",
            chainName: "ZenChain Testnet",
            rpcUrls: ["https://zenchain-testnet.api.onfinality.io/public"],
            blockExplorerUrls: ["https://zentrace.io"],
            nativeCurrency: {
              name: "ZTC",
              symbol: "ZTC",
              decimals: 18
            }
          }]
        });
      } else {
        throw switchError;
      }
    }

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    checkCooldown();
    loadData();

  } catch (error) {
    console.error("Connection error:", error);
    document.getElementById("walletStatus").innerText = "Connection failed";
    alert("Error: " + error.message);
  }
}

function disconnectWallet() {
  userAddress = null;
  signer = null;
  contract = null;
  document.getElementById("walletStatus").innerText = "Status: Disconnected";
  document.getElementById("sendGM").disabled = true;
}

async function sendGM() {
  if (!contract) {
    alert("Please connect your wallet first.");
    return;
  }
  try {
    const tx = await contract.sendGM();
    await tx.wait();

    localStorage.setItem(`lastGM_${userAddress}`, Date.now().toString());

    document.getElementById("sendGM").disabled = true;
    updateTimer();
    loadData();
  } catch (error) {
    console.error("Transaction error:", error);
    alert("Error: " + error.message);
  }
}

function checkCooldown() {
  const lastTime = localStorage.getItem(`lastGM_${userAddress}`);
  if (lastTime && (Date.now() - parseInt(lastTime)) < COOLDOWN_MS) {
    document.getElementById("sendGM").disabled = true;
    updateTimer();
  } else {
    document.getElementById("sendGM").disabled = false;
    document.getElementById("cooldownTimer").textContent = "Active";
  }
}

function updateTimer() {
  const lastTime = localStorage.getItem(`lastGM_${userAddress}`);
  if (!lastTime) return;

  const timeLeft = COOLDOWN_MS - (Date.now() - parseInt(lastTime));
  if (timeLeft > 0) {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById("cooldownTimer").textContent =
      `Disabled - Remaining: ${hours}h ${minutes}m`;
    setTimeout(updateTimer, 60000);
  } else {
    document.getElementById("cooldownTimer").textContent = "Active";
    document.getElementById("sendGM").disabled = false;
  }
}

async function loadTotalGMs() {
  if (!contract) return;
  try {
    const total = await contract.totalGMs();
    document.getElementById("totalGMs").textContent = total.toString();
  } catch (error) {
    console.error("Error loading total GMs:", error);
  }
}

async function loadLastGMs() {
  if (!contract) return;
  try {
    const lastGMs = await contract.getLastGMs(5);
    const list = document.getElementById("lastGMsList");
    list.innerHTML = "";
    lastGMs.forEach(gm => {
      const li = document.createElement("li");
      const date = new Date(Number(gm.timestamp) * 1000).toLocaleString();
      li.textContent = `User: ${gm.user} - Time: ${date}`;
      list.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading last GMs:", error);
    document.getElementById("lastGMsList").innerHTML = "<li>Error loading</li>";
  }
}

async function loadData() {
  if (contract) {
    await loadTotalGMs();
    await loadLastGMs();
  }
  setTimeout(loadData, 30000);
}

document.getElementById("connectWallet").addEventListener("click", () => {
  if (userAddress) {
    disconnectWallet();
  } else {
    connectWallet();
  }
});
document.getElementById("sendGM").addEventListener("click", sendGM);

window.addEventListener("load", () => {
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
  }
});
