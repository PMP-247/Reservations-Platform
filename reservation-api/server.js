import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./lib/supabaseClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

process.on('uncaughtException', err => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
  });
  
  process.on('unhandledRejection', err => {
    console.error('💥 Unhandled Rejection:', err);
    process.exit(1);
  });
  

// Middleware
app.use(cors());
app.use(express.json());



app.use((req, _res, next) => {
    console.log(`➡️  ${req.method} ${req.originalUrl}`);
    next();
  });
  
//  Time Slots 
const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

// --- ROUTES ---

//  Root Health Check
app.get("/", (req, res) => {
  res.send("API with Supabase is running 🚀");
});


//  GET Slots
app.get("/api/slots", async (req, res) => {
  const { date, resourceId } = req.query;

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('slot')
      .eq('date', date)
      .eq('resourceId', resourceId);

    if (error) throw error;

    const bookedSlots = bookings.map(b => b.slot);
    const availableSlots = ALL_TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));
    
    res.json({ availableSlots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// . GET Confirmed Bookings for a specific date/resource centrr
app.get("/api/bookings/:date/:resource", async (req, res) => {
  const { date, resource } = req.params;
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .eq('resourceId', resource);

    if (error) throw error;
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST Create Nw Booking
app.post("/api/bookings", async (req, res) => {
  const { resourceId, date, slot, user } = req.body;

  try {
    // Detect Conflict
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('id')
      .eq('resourceId', resourceId)
      .eq('date', date)
      .eq('slot', slot)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) {
      return res.status(409).json({ error: "This slot is already taken." });
    }

  
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert([{ resourceId, date, slot, user }])
      .select()
      .single();

    if (insertError) throw insertError;
    
    res.status(201).json({ message: "Reservation confirmed!", booking: newBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE a Booking
app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: "Booking deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});