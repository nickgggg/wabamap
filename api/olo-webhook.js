// Import necessary libraries
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Serverless function handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Parse incoming webhook payload
      const { storeNumber, latitude, longitude, timePlaced, timeReady } = req.body;

      // Validate required fields
      if (!storeNumber || !latitude || !longitude || !timePlaced || !timeReady) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Insert data into Supabase table
      const { data, error } = await supabase.from('orders').insert([
        {
          storeNumber,
          latitude,
          longitude,
          timePlaced,
          timeReady,
        },
      ]);

      // Handle any Supabase insertion errors
      if (error) {
        console.error('Supabase insert error:', error.message);
        return res.status(500).json({ error: 'Failed to save order to database' });
      }

      // Respond with success
      return res.status(200).json({ message: 'Order successfully saved', data });
    } catch (error) {
      console.error('Server error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
