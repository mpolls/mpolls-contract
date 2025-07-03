import { main, createSamplePoll, voteOnPoll, displayPollResults } from './polls';

/**
 * Test script to demonstrate the decentralized polls contract
 */
async function runTests() {
  console.log("🧪 Testing Decentralized Polls Contract");
  console.log("=======================================");

  try {
    // Note: In a real scenario, you would need to:
    // 1. Deploy the contract first
    // 2. Set up a wallet with some MASSA tokens
    // 3. Update the contract address in polls.ts
    
    console.log("\n📋 Test Scenarios:");
    console.log("1. Create a sample poll");
    console.log("2. Vote on the poll");
    console.log("3. Display poll results");
    console.log("4. Check if user has voted");
    
    console.log("\n⚠️  Note: This is a demonstration script.");
    console.log("To run actual tests, you need to:");
    console.log("- Deploy the contract using: npm run deploy");
    console.log("- Update the CONTRACT_ADDRESS in polls.ts");
    console.log("- Set up your wallet credentials");
    
    // Mock test data
    console.log("\n📊 Sample Poll Data:");
    const samplePoll = {
      id: 1,
      title: "What's your favorite programming language?",
      description: "Vote for your preferred programming language for web development",
      options: ["JavaScript/TypeScript", "Python", "Rust", "Go", "Other"],
      totalVotes: 15,
      optionVotes: [8, 4, 2, 1, 0]
    };
    
    console.log(`Poll ID: ${samplePoll.id}`);
    console.log(`Title: ${samplePoll.title}`);
    console.log(`Description: ${samplePoll.description}`);
    console.log(`Options: ${samplePoll.options.join(', ')}`);
    console.log(`Total Votes: ${samplePoll.totalVotes}`);
    
    console.log("\n📈 Vote Distribution:");
    samplePoll.options.forEach((option, index) => {
      const votes = samplePoll.optionVotes[index];
      const percentage = ((votes / samplePoll.totalVotes) * 100).toFixed(1);
      console.log(`  ${option}: ${votes} votes (${percentage}%)`);
    });
    
    console.log("\n✅ Test demonstration completed!");
    console.log("\n🚀 Next steps:");
    console.log("1. Deploy the contract: npm run deploy");
    console.log("2. Update contract address in the code");
    console.log("3. Run the frontend: cd ../my-massa-dapp && npm run dev");
    console.log("4. Interact with the polls through the web interface");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the tests
runTests().catch(console.error); 