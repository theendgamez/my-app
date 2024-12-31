import { ethers } from "hardhat";

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());

    const TicketContractFactory = await ethers.getContractFactory("TicketContract");
    const contract = await TicketContractFactory.deploy();
    
    // Wait for contract deployment
    await contract.waitForDeployment();
    
    // Get the deployed contract address
    const deployedAddress = await contract.getAddress();
    console.log("Contract deployed to:", deployedAddress);
    
    return deployedAddress;
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