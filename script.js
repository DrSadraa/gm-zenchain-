// ZenChain Testnet configuration
const ZENCHAIN_CONFIG = {
    chainId: 8408, // Chain ID
    rpcUrl: 'https://zenchain-testnet.api.onfinality.io/public',
    chainName: 'ZenChain Testnet',
    nativeCurrency: { name: 'ZTC', symbol: 'ZTC', decimals: 18 },
    blockExplorerUrl: 'https://zentrace.io'
};

// Contract address - REPLACE WITH YOUR ACTUAL CONTRACT ADDRESS
const CONTRACT_ADDRESS = '0x72bf210e0a01838367ef47f5b6087d22d53c93d6'; // Placeholder

// Sample ABI - REPLACE WITH YOUR ACTUAL ABI
const CONTRACT_ABI = [
    {
        "inputs": [],
        "name": "sendGM",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalGMs",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "count", "type": "uint256"}],
        "name": "getLastGMs",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "user", "type": "address"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct GMContract.GM[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

let provider, signer, contract, userAddress;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Connect to EVM wallet (works with MetaMask, Rabby, etc.)
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];

            // Add network if not present
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [ZENCHAIN_CONFIG]
                });
            } catch (error) {
                console.log('Network already added');
            }

            // Setup provider, signer, and contract
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            // Update UI
            document.getElementById('walletStatus').textContent = `Status: Connected - ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
            document.getElementById('connectWallet').textContent = 'Disconnect Wallet';
            document.getElementById('sendGM').disabled = false;

            // Load data and check cooldown
            loadData();
            checkCooldown();
        } catch (error) {
            console.error('Connection error:', error);
            alert('Error connecting to wallet!');
        }
    } else {
        alert('Install an EVM wallet like MetaMask!');
    }
}

// Disconnect wallet
function disconnectWallet() {
    userAddress = null;
    document.getElementById('walletStatus').textContent = 'Status: Disconnected';
    document.getElementById('connectWallet').textContent = 'Connect Wallet';
    document.getElementById('sendGM').disabled = true;
    document.getElementById('totalGMs').textContent = 'Loading...';
    document.getElementById('lastGMsList').innerHTML = '';
}

// Send GM transaction
async function sendGM() {
    if (!contract) return;
    try {
        const tx = await contract.sendGM({ gasLimit: 300000 });
        await tx.wait();
        alert('GM sent successfully!');

        // Save timestamp to localStorage for cooldown
        localStorage.setItem(`lastGM_${userAddress}`, Date.now().toString());

        // Disable button and start timer
        document.getElementById('sendGM').disabled = true;
        updateTimer();
    } catch (error) {
        console.error('Transaction error:', error);
        alert('Error: ' + error.message);
    }
}

// Check cooldown
function checkCooldown() {
    const lastTime = localStorage.getItem(`lastGM_${userAddress}`);
    if (lastTime && (Date.now() - parseInt(lastTime)) < COOLDOWN_MS) {
        document.getElementById('sendGM').disabled = true;
        updateTimer();
    } else {
        document.getElementById('sendGM').disabled = false;
        document.getElementById('cooldownTimer').textContent = 'Active';
    }
}

// Update cooldown timer
function updateTimer() {
    const lastTime = localStorage.getItem(`lastGM_${userAddress}`);
    if (!lastTime) return;

    const timeLeft = COOLDOWN_MS - (Date.now() - parseInt(lastTime));
    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('cooldownTimer').textContent = `Disabled - Remaining: ${hours}h ${minutes}m`;
        setTimeout(updateTimer, 60000); // Update every minute
    } else {
        document.getElementById('cooldownTimer').textContent = 'Active';
        document.getElementById('sendGM').disabled = false;
    }
}

// Load total GMs
async function loadTotalGMs() {
    try {
        const total = await contract.totalGMs();
        document.getElementById('totalGMs').textContent = total.toString();
    } catch (error) {
        console.error('Error loading total:', error);
    }
}

// Load last 5 GMs
async function loadLastGMs() {
    try {
        const lastGMs = await contract.getLastGMs(5);
        const list = document.getElementById('lastGMsList');
        list.innerHTML = '';
        lastGMs.forEach(gm => {
            const li = document.createElement('li');
            const date = new Date(Number(gm.timestamp) * 1000).toLocaleString();
            li.textContent = `User: ${gm.user} - Time: ${date}`;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading list:', error);
        document.getElementById('lastGMsList').innerHTML = '<li>Error loading</li>';
    }
}

// Load all data
async function loadData() {
    if (contract) {
        await loadTotalGMs();
        await loadLastGMs();
    }
    setInterval(loadData, 30000); // Refresh every 30 seconds
}

// Event listeners
document.getElementById('connectWallet').addEventListener('click', () => {
    if (userAddress) {
        disconnectWallet();
    } else {
        connectWallet();
    }
});

document.getElementById('sendGM').addEventListener('click', sendGM);

// Auto-connect if wallet is already connected
window.addEventListener('load', () => {
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    }

});
