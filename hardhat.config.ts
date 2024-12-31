import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:5545",
      chainId: 1337,
      accounts: [process.env.GANACHE_PRIVATE_KEY || ""]
    },
  },
};

export default config;