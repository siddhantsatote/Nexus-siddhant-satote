import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_AMBULANCES, DEMO_HOSPITALS, DEMO_INCIDENTS } from '../data/demo-data';

export function useRealtimeData() {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isSupabaseConfigured()) {
      loadSupabaseData();
      subscribeToChanges();
    } else {
      setAmbulances(DEMO_AMBULANCES);
      setHospitals(DEMO_HOSPITALS);
      setIncidents(DEMO_INCIDENTS);
      setUsingDemo(true);
      setLoading(false);
    }
  }, []);

  async function loadSupabaseData() {
    try {
      const [ambRes, hospRes, incRes] = await Promise.all([
        supabase.from('ambulances').select('*').order('unit_code'),
        supabase.from('hospitals').select('*').order('name'),
        supabase.from('incidents').select('*').order('created_at', { ascending: false }),
      ]);

      if (ambRes.error || hospRes.error || incRes.error) {
        throw new Error(ambRes.error?.message || hospRes.error?.message || incRes.error?.message);
      }

      setAmbulances(ambRes.data);
      setHospitals(hospRes.data);
      setIncidents(incRes.data);
      setUsingDemo(false);
    } catch (err) {
      console.warn('Supabase load failed, using demo data:', err);
      setAmbulances(DEMO_AMBULANCES);
      setHospitals(DEMO_HOSPITALS);
      setIncidents(DEMO_INCIDENTS);
      setUsingDemo(true);
    }
    setLoading(false);
  }

  function subscribeToChanges() {
    if (!supabase) return;

    supabase
      .channel('praana-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' },
        (payload) => {
          if (payload.eventType === 'INSERT') setAmbulances(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setAmbulances(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
          if (payload.eventType === 'DELETE') setAmbulances(prev => prev.filter(a => a.id !== payload.old.id));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' },
        (payload) => {
          if (payload.eventType === 'INSERT') setHospitals(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setHospitals(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
          if (payload.eventType === 'DELETE') setHospitals(prev => prev.filter(h => h.id !== payload.old.id));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') setIncidents(prev => [payload.new, ...prev]);
          if (payload.eventType === 'UPDATE') setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
        })
      .subscribe();
  }

  const addIncident = useCallback(async (incident) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticIncident = { ...incident, id: tempId, created_at: new Date().toISOString() };
    setIncidents(prev => [optimisticIncident, ...prev]);

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('incidents').insert([incident]).select().single();
      if (error) {
        console.error('Insert incident error:', error);
        alert('Error saving incident to Supabase: ' + error.message);
        // Rollback optimistic update
        setIncidents(prev => prev.filter(i => i.id !== tempId));
        return null;
      } else {
        console.log('Incident saved to Supabase:', data);
        // Replace optimistic incident with real one
        setIncidents(prev => prev.map(i => i.id === tempId ? data : i));
        return data;
      }
    } else {
      // In demo mode, the optimistic update is already there (but maybe with wrong ID)
      setIncidents(prev => prev.map(i => i.id === tempId ? { ...i, id: `inc-${Date.now()}` } : i));
      return optimisticIncident;
    }
  }, []);

  const updateAmbulanceStatus = useCallback(async (ambId, status) => {
    // Optimistic update
    setAmbulances(prev => prev.map(a => a.id === ambId ? { ...a, status } : a));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('ambulances').update({ status }).eq('id', ambId);
      if (error) {
        console.error('Update ambulance error:', error);
        // Rollback? (Maybe too complex for now, just log)
      }
    }
  }, []);

  const updateIncidentStatus = useCallback(async (incId, updates) => {
    // Optimistic update
    setIncidents(prev => prev.map(i => i.id === incId ? { ...i, ...updates } : i));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('incidents').update(updates).eq('id', incId);
      if (error) {
        console.error('Update incident error:', error);
        alert('Error updating incident: ' + error.message);
        // Rollback
        loadSupabaseData(); // Re-fetch to be safe
      }
    }
  }, [loadSupabaseData]);

  const setAllAmbulancesAvailable = useCallback(async () => {
    // Optimistic update
    setAmbulances(prev => prev.map(a => ({ ...a, status: 'available' })));

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('ambulances').update({ status: 'available' }).neq('status', 'available');
      if (error) {
        console.error('Set all available error:', error);
        loadSupabaseData(); // Re-fetch on error
      }
    }
  }, []);

  return {
    ambulances,
    hospitals,
    incidents,
    loading,
    usingDemo,
    addIncident,
    updateAmbulanceStatus,
    updateIncidentStatus,
    setAllAmbulancesAvailable,
  };
}
