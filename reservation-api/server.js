import dotenv from "dotenv";

dotenv.config();

import express from "express";
import path from 'path';
import cors from "cors";
import { fileURLToPath } from 'url';
import { supabase } from "./lib/supabaseClient.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This matches your folder name "platform" and its build output "dist"
const frontendDistPath = path.resolve(__dirname, '..', 'platform', 'dist');

// --- Middleware ---
app.use(cors());
app.use(express.json()); 
app.use(express.static(frontendDistPath)); 

app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.originalUrl}`);
  next();
});

// --- API Routes ---
app.get("/api/ping", (_req, res) => res.json({ message: "pong" }));

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

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

app.post("/api/bookings", async (req, res) => {
  const { resourceId, date, slot, user } = req.body;
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('id')
      .eq('resourceId', resourceId)
      .eq('date', date)
      .eq('slot', slot)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing) return res.status(409).json({ error: "This slot is already taken." });

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

app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: "Booking deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Serve React Frontend ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend served from: ${frontendDistPath}`);
  console.log("Supabase URL loaded:", !!process.env.SUPABASE_URL);
  console.log("Supabase Key loaded:", !!process.env.SUPABASE_ANON_KEY);
});
