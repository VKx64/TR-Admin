import PocketBase from 'pocketbase';

// Create a single PocketBase instance for the entire application
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Export the PocketBase instance
export default pb;