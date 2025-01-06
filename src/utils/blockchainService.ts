import { ethers } from 'ethers';
import TicketContract from '../../artifacts/contracts/TicketContract.sol/TicketContract.json';

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_GANACHE_URL);
const adminWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  TicketContract.abi,
  adminWallet
);

/**
 * Mints a ticket and returns the tokenId.
 * @param to - Recipient address
 * @param eventId - Event ID
 * @param zone - Zone name
 * @param seatNumber - Seat number
 * @param price - Price per ticket
 * @param eventDate - Event date as Unix timestamp
 * @returns tokenId as string
 */
export const mintTicket = async (
  to: string,
  eventId: number,
  zone: string,
  seatNumber: number,
  price: number,
  eventDate: number
): Promise<string> => {
  const tx = await contract.mintTicket(to, eventId, zone, seatNumber, price, eventDate);
  const receipt = await tx.wait();

  // Parse the TicketMinted event to extract tokenId
  const iface = new ethers.Interface(TicketContract.abi);
  let tokenId: string | null = null;

  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog && parsedLog.name === 'TicketMinted') {
        tokenId = parsedLog.args.tokenId.toString();
        break;
      }
    } catch {
      // Not a TicketMinted event
      continue;
    }
  }

  if (!tokenId) {
    throw new Error('Failed to extract tokenId from transaction receipt.');
  }

  console.log('Minted TokenId:', tokenId);
  return tokenId;
};


interface TransferTicketParams {
  privateKey: string;
  contractAddress: string;
  fromAddress: string;
  toAddress: string;
  tokenId: number;
}

export async function transferTicket(params: TransferTicketParams): Promise<string> {
  const { privateKey, contractAddress, fromAddress, toAddress, tokenId } = params;

  const provider = new ethers.JsonRpcProvider(GANACHE_CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Connecting to contract at ${contractAddress}`);
  const contract = new ethers.Contract(contractAddress, TicketContract.abi, wallet);

  console.log(`Transferring ticket #${tokenId} from ${fromAddress} to ${toAddress}`);
  const tx = await contract.safeTransferFrom(
    fromAddress,
    toAddress,
    tokenId,
    {
      gasPrice: GANACHE_CONFIG.gasPrice,
      gasLimit: GANACHE_CONFIG.gasLimit,
    }
  );

  console.log('Transaction hash:', tx.hash);
  await tx.wait();
  console.log('Transaction confirmed:', tx.hash);
  return tx.hash;
}

export async function parseTokenIdFromReceipt(receipt: ethers.TransactionReceipt): Promise<string | null> {
  const mintEvent = receipt.logs.find((log) => {
    try {
      const iface = new ethers.Interface(TicketContract.abi);
      const event = iface.parseLog(log);
      return event && event.name === 'Transfer'; // 解析 ERC721 的 Transfer 事件
    } catch {
      return false;
    }
  });

  if (mintEvent) {
    const iface = new ethers.Interface(TicketContract.abi);
    const parsedLog = iface.parseLog(mintEvent);
    return parsedLog && parsedLog.args?.tokenId?.toString() || null;
  }
  return null;
}

