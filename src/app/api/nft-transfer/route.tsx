import { ethers } from "ethers";
import TicketContract from "@/artifacts/contracts/TicketContract.sol/TicketContract.json";

const GANACHE_CONFIG = {
  rpcUrl: "http://127.0.0.1:7545",
  chainId: 1337,
  gasPrice: ethers.parseUnits("20", "gwei"),
  gasLimit: 6721975,
};

interface TransferNFTRequestBody {
  userAddress: string;
  tokenId: string;
}

interface ResponseData {
  success?: boolean;
  error?: string;
}

export default async function handler(
  req: { method: string; body: TransferNFTRequestBody },
  res: { status: (code: number) => { json: (data: ResponseData) => void } }
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userAddress, tokenId } = req.body;

  if (!userAddress || !tokenId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(GANACHE_CONFIG.rpcUrl);
    const GANACHE_PRIVATE_KEY = process.env.GANACHE_PRIVATE_KEY || "";
    const wallet = new ethers.Wallet(GANACHE_PRIVATE_KEY, provider);
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
    const contract = new ethers.Contract(contractAddress, TicketContract.abi, wallet);

    const tx = await contract.transferNFT(userAddress, tokenId, {
      gasPrice: GANACHE_CONFIG.gasPrice,
      gasLimit: GANACHE_CONFIG.gasLimit,
    });
    await tx.wait();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("NFT Transfer Error:", error);
    return res.status(500).json({ error: "Failed to transfer NFT" });
  }
}
