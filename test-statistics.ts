import { JsonRpcProvider } from "@massalabs/massa-web3";

const CONTRACT_ADDRESS = "AS1xbyLdbFa42NMd1iiUgF85Qt5P9E7LtH3vCFvpHwASSLyzYTrj";

async function testStatistics() {
  try {
    const provider = JsonRpcProvider.buildnet();
    
    console.log("Testing getStatistics function...");
    const response = await provider.readSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      targetFunction: "getStatistics",
      parameter: [],
      maxGas: BigInt(2_000_000_000),
    });

    const resultString = new TextDecoder().decode(response.returnValue);
    console.log("Raw statistics:", resultString);

    const parts = resultString.split("|");
    if (parts.length === 4) {
      console.log("✅ Statistics parsed successfully:");
      console.log("  Total Polls:", parts[0]);
      console.log("  Total Responses:", parts[1]);
      console.log("  Total Rewards Distributed:", parts[2], "nanoMASSA");
      console.log("  Active Polls:", parts[3]);
    } else {
      console.log("❌ Invalid statistics format");
    }
  } catch (error) {
    console.error("Error testing statistics:", error);
  }
}

testStatistics();
