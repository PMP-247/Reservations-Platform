import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

//  Production & Development CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'reservations-platform-git-main-palesa-ms-projects.vercel.app' // <-- Change this to your live Vercel URL once generated
];

app.use(cors({
  origin: function (origin, callback) {
   
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Initialized Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Root healthcheck endpoint for Render's z validation checks
app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Venue Booking API' });
});

// 1. GET Bookings for a  date and room
app.get('/api/bookings/:date/:room', async (req, res) => {
  const { date, room } = req.params;
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .eq('resourceId', room);

    if (error) throw error;
    res.json({ bookings: data || [] });
  } catch (error) {
    console.error("GET Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST a new reservation
app.post('/api/bookings', async (req, res) => {
  const { resourceId, date, slot, user } = req.body;
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{ resourceId, date, slot, user }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Booking successful!', booking: data[0] });
  } catch (error) {
    console.error("POST Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. DELETE a reservation
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error("DELETE Error:", error); 
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});