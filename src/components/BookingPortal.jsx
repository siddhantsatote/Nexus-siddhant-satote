import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, AlertCircle, CheckCircle2, Loader2, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';
import { extractPuneCoords } from '../lib/praana-ai';
import MapView from './MapView';

export default function BookingPortal({ addIncident, ambulances, hospitals, incidents, onBack }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentIncidentId, setCurrentIncidentId] = useState(null);
  const [formData, setFormData] = useState({
    location: '',
    category: '',
    contact: '',
    additionalInfo: ''
  });
  const [bookingRef, setBookingRef] = useState(null);

  const categories = [
    { id: 'cardiac', label: 'Cardiac / Heart', icon: HeartPulse, color: '#ef4444' },
    { id: 'accident', label: 'Road Accident', icon: AlertCircle, color: '#f59e0b' },
    { id: 'respiratory', label: 'Breathing Issue', icon: ShieldCheck, color: '#3b82f6' },
    { id: 'other', label: 'Other Emergency', icon: AlertCircle, color: '#10b981' }
  ];

  async function handleBook(e) {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      const coords = extractPuneCoords(formData.location);
      const lat = coords?.lat || (18.45 + Math.random() * 0.15);
      const lng = coords?.lng || (73.78 + Math.random() * 0.15);

      const incident = {
        priority: formData.category === 'cardiac' ? 'P1' : 'P2',
        incident_type: formData.category,
        status: 'open',
        caller_description: `[User Booking] Contact: ${formData.contact}. ${formData.additionalInfo || ''}`,
        location_raw: formData.location,
        location_lat: lat,
        location_lng: lng,
      };

      const result = await addIncident(incident);
      if (result) {
        setBookingRef(result.id.slice(0, 8).toUpperCase());
        setCurrentIncidentId(result.id);
        setStep(3);
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="booking-portal-container">
      <div className="booking-card">
        {onBack && (
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 16 }}>
            ← Back
          </button>
        )}
        {step === 1 && (
          <motion.div
            className="booking-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35 }}
          >
            <div className="booking-header">
              <h1>Emergency Help Needed?</h1>
              <p>Quickly book an ambulance. Track in real-time.</p>
            </div>
            
            <div className="category-grid">
              {categories.map((cat, i) => (
                <motion.div 
                  key={cat.id} 
                  className={`category-item ${formData.category === cat.id ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                >
                  <div className="cat-icon" style={{ backgroundColor: cat.color }}>
                    <cat.icon size={24} color="white" />
                  </div>
                  <span>{cat.label}</span>
                </motion.div>
              ))}
            </div>

            <div className="booking-actions">
              <motion.button 
                className="btn btn-primary btn-large w-full" 
                disabled={!formData.category}
                onClick={() => setStep(2)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next Step <ArrowRight size={18} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <div className="booking-step fade-in">
            <div className="booking-header">
              <button className="back-btn" onClick={() => setStep(1)}>← Change Type</button>
              <h1>Where should we reach?</h1>
              <p>Provide location and contact for the driver.</p>
            </div>

            <form onSubmit={handleBook} className="booking-form">
              <div className="input-group">
                <label><MapPin size={14} /> Pickup Location</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Shaniwar Wada, Pune" 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label><Phone size={14} /> Contact Number</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder="Your 10-digit mobile" 
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label>Additional Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="Apartment name, landmark, etc."
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-large w-full" disabled={loading}>
                {loading ? <Loader2 className="spin" /> : <ShieldCheck size={18} />}
                Confirm Booking
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <motion.div
            className="booking-step text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              className="success-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 15 }}
            >
              <CheckCircle2 size={64} color="var(--status-available)" />
            </motion.div>
            <h1>Ambulance Dispatched!</h1>
            <p className="booking-status-text">
              Reference: <span className="ref-code">#{bookingRef}</span>
            </p>
            <div className="status-eta-card">
              <div className="pulse-circle"></div>
              <div>
                <strong>Unit is on the way</strong>
                <span>Estimated arrival: 8-12 mins</span>
              </div>
            </div>

            <div className="booking-map-wrapper zoom-in">
              <MapView 
                ambulances={ambulances} 
                hospitals={hospitals} 
                incidents={incidents.filter(i => i.id === currentIncidentId)} 
              />
            </div>
            
            <div className="emergency-tips">
              <h3>While you wait:</h3>
              <ul>
                <li>Stay on the line if the control room calls.</li>
                <li>Keep the patient calm and comfortable.</li>
                <li>Ensure the entrance is clear for the ambulance.</li>
              </ul>
            </div>

            <button className="btn btn-secondary w-full" onClick={() => { setStep(1); setFormData({ location: '', category: '', contact: '', additionalInfo: '' }); }}>
              Book Another
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
