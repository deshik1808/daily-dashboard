// scripts/generate-vapid.mjs
// Run once: node scripts/generate-vapid.mjs
// Paste the output into .env.local and your Vercel environment variables.

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\n=== VAPID Keys ===\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_MAILTO=mailto:your-email@example.com`);
console.log("\nAdd these to .env.local and Vercel environment variables.\n");
