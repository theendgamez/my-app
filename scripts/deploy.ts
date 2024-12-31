import { ethers } from "hardhat";

async function main() {
  try {
    // Debug logs
    console.log("Loading deployer account...");
    console.log("Network URL:", process.env.NEXT_PUBLIC_GANACHE_URL);
    console.log("Private Key exists:", !!process.env.GANACHE_PRIVATE_KEY);

    const [deployer] = await ethers.getSigners();
    console.log("Got signer:", !!deployer);

    if (!deployer) throw new Error("No deployer account found");
    
    const address = await deployer.getAddress();
    console.log("Deploying with account:", address);

    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance));

    const TicketContractFactory = await ethers.getContractFactory("TicketContract", deployer);
    const contract = await TicketContractFactory.deploy();
    await contract.deployed();

    console.log("Contract deployed to:", contract.address);
    return contract.address;
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });