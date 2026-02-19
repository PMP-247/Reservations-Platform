import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  List, 
  Grid,
  Trash2,
  Terminal
} from 'lucide-react';

// --- Interfaces & Types ---

interface Resource {
  id: string;
  name: string;
  capacity: number;
  icon: React.ElementType;
}

interface BookingData {
  resourceId: string;
  date: string;
  slot: string;
  user: string;
}
interface Booking extends BookingData {
  id: string;
}

interface StatusMessage {
  message: string;
  type: 'success' | 'error' | '';
}

// --- Global Data ---

const API_BASE_URL = "http://localhost:3001/api";

const RESOURCES: Resource[] = [
  { id: 'R1', name: 'Meeting Room Alpha', capacity: 10, icon: Users },
  { id: 'R2', name: 'Projector Unit B', capacity: 1, icon: Grid },
  { id: 'R3', name: 'Collaboration Pod 3', capacity: 4, icon: List },
];

const TIME_SLOTS: string[] = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

const getTodayDate = (): string => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// --- API Functions ---

const apiFetchBookings = async (date: string, resourceId: string): Promise<Booking[]> => {
  const response = await fetch(`${API_BASE_URL}/bookings/${date}/${resourceId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch bookings');
  }
  const data = await response.json();

  // Type assertion to Booking[]
  return (data.bookings || []) as Booking[];
};


const apiSubmitReservation = async (bookingData: BookingData): Promise<{success: boolean, message: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    const result = await response.json();
    return { success: response.ok, message: result.message || result.error };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Could not connect to the server.' };
  }
};

const apiDeleteReservation = async (id: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { method: 'DELETE' });
  return response.ok;
};

// --- Main Component ---

export default function App() {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedResourceId, setSelectedResourceId] = useState<string>(RESOURCES[0].id);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({ message: '', type: '' });
  const [userName, setUserName] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const selectedResource = RESOURCES.find(r => r.id === selectedResourceId);

  const fetchData = useCallback(async (date: string, resourceId: string) => {
    setLoading(true);
    try {
      const bookings = await apiFetchBookings(date, resourceId);
      setConfirmedBookings(bookings);
    } catch (error: unknown) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate, selectedResourceId);
  }, [selectedDate, selectedResourceId, fetchData]);

  const handleReserveSlot = async (slot: string) => {
    if (!userName.trim()) {
      setStatusMessage({ message: 'Please enter your name first.', type: 'error' });
      return;
    }

    setStatusMessage({ message: '', type: '' });
    setLoading(true);

    const bookingData: BookingData = {
      resourceId: selectedResourceId,
      date: selectedDate,
      slot: slot,
      user: userName,
    };

    const result = await apiSubmitReservation(bookingData);
    setLoading(false);

    if (result.success) {
      fetchData(selectedDate, selectedResourceId);
      setStatusMessage({ message: result.message, type: 'success' });
      
      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] User: ${userName} | Room: ${selectedResource?.name} | Slot: ${slot}`;
      setLogs(prev => [newLog, ...prev]);
    } else {
      setStatusMessage({ message: result.message, type: 'error' });
    }
  };

  const handleCancel = async (id: string) => {
    if (await apiDeleteReservation(id)) {
      fetchData(selectedDate, selectedResourceId);
      setStatusMessage({ message: 'Booking cancelled.', type: 'success' });
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [`[${timestamp}] Action: CANCELLED reservation ID: ${id}`, ...prev]);
    }
  };

  const bookedSlots = useMemo(() => confirmedBookings.map(b => b.slot), [confirmedBookings]);
  const isSlotBooked = (slot: string) => bookedSlots.includes(slot);

  const StatusAlert = useMemo(() => {
    if (!statusMessage.message) return null;
    const isSuccess = statusMessage.type === 'success';
    const Icon = isSuccess ? CheckCircle : XCircle;
    const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
    const textColor = isSuccess ? 'text-green-800' : 'text-red-800';

    return (
      <div role="alert" className={`p-3 mb-4 rounded-lg shadow-md ${bgColor} ${textColor} flex items-center max-w-4xl mx-auto`}>
        <Icon className="w-5 h-5 mr-3" />
        <p className="font-medium text-sm">{statusMessage.message}</p>
      </div>
    );
  }, [statusMessage]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter text-slate-900">
      <header className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Resource Reservation</h1>
        <p className="text-gray-500">Live persistence with Node.js and Supabase.</p>
      </header>

      {StatusAlert}

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-10 border border-gray-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b pb-6 text-slate-700">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-blue-600" /> Select Resource
            </label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl shadow-inner bg-gray-50"
            >
              {RESOURCES.map(res => (
                <option key={res.id} value={res.id}>{res.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-600" /> Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl shadow-inner bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2 text-blue-600" /> Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter name to book"
              className="mt-1 block w-full pl-4 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl shadow-inner bg-gray-50 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Availability for {selectedResource?.name}
          </h2>
          {loading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>

        {/* Regular Grid (No internal scroll) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {TIME_SLOTS.map(slot => {
            const booked = isSlotBooked(slot);
            return (
              <button
                key={slot}
                disabled={booked || loading}
                onClick={() => handleReserveSlot(slot)}
                className={`w-full py-3 px-4 rounded-xl transition-all duration-200 shadow-sm flex items-center justify-between text-sm font-semibold border ${
                  booked 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" 
                    : "bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-500"
                }`}
              >
                <span className="flex items-center">
                  {booked ? <XCircle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  {booked ? 'Booked' : 'Book'}
                </span>
                <span>{slot}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-4 mb-8">
        <h2 className="text-xl font-bold text-gray-700 flex items-center">
          <List className="w-5 h-5 mr-2" /> Confirmed Reservations
        </h2>
        
        <div className="h-64 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {confirmedBookings.length > 0 ? (
            confirmedBookings.map(b => (
              <div key={b.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center transition-all hover:border-blue-200 mx-1">
                <div>
                  <p className="font-bold text-gray-900">{b.slot}</p>
                  <p className="text-xs text-gray-500">Booked by <span className="font-semibold text-slate-700">{b.user}</span></p>
                </div>
                <button 
                  onClick={() => handleCancel(b.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Cancel Reservation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
              <p className="italic text-sm">No reservations confirmed for this selection.</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Console */}
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-gray-800 text-green-200 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <h3 className="text-xl font-bold text-blue-400 flex items-center">
            <Terminal className="w-5 h-5 mr-2" />
            Confirm Reservations List
          </h3>
          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 uppercase tracking-widest font-bold">
            Live
          </span>
        </div>
        
        <div className="h-40 overflow-y-auto space-y-2 font-mono text-xs custom-scrollbar">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="flex gap-3 text-amber-400 animate-in fade-in">
                <span className="text-blue-500/50 shrink-0">➜</span>
                <span>{log}</span>
              </div>
            ))
          ) : (
            <p className="text-amber-800-italic">waiting for future bookings...</p>
          )}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}