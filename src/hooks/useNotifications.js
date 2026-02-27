import { useState, useCallback } from 'react';

/**
 * Hook to manage hospital pre-notifications when an ambulance is dispatched.
 * Stores in-memory notifications that are displayed on the HospitalPanel.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  /** Add a pre-notification for a hospital when an ambulance is dispatched */
  const addNotification = useCallback((hospitalId, hospitalName, incident, ambulance, etaMinutes) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Determine required resources based on incident type and priority
    const resources = [];
    const type = (incident.incident_type || '').toLowerCase();
    if (incident.priority === 'P1') resources.push('Crash Cart', 'ER Team Standby');
    if (type === 'cardiac') resources.push('Cardiac Monitor', 'Cath Lab Prep');
    if (type === 'trauma') resources.push('Trauma Bay', 'Blood Bank Alert');
    if (type === 'burns') resources.push('Burn Ward', 'IV Fluids');
    if (type === 'respiratory') resources.push('Ventilator', 'O₂ Supply');
    if (type === 'accident') resources.push('X-Ray', 'Ortho Standby');
    if (resources.length === 0) resources.push('General ER');

    const notif = {
      id,
      hospitalId,
      hospitalName,
      incidentId: incident.id,
      incidentType: incident.incident_type || 'Unknown',
      priority: incident.priority,
      patientInfo: incident.caller_description?.slice(0, 100) || 'No details available',
      ambulanceCode: ambulance?.unit_code || 'Unknown',
      ambulanceType: ambulance?.type || 'BLS',
      driverName: ambulance?.driver_name || 'Unknown',
      eta: etaMinutes || '?',
      resources,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [notif, ...prev]);
    return notif;
  }, []);

  /** Dismiss a notification */
  const dismissNotification = useCallback((notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  }, []);

  /** Get notifications for a specific hospital */
  const getNotificationsForHospital = useCallback((hospitalId) => {
    return notifications.filter(n => n.hospitalId === hospitalId);
  }, [notifications]);

  /** Clear all notifications for a resolved incident */
  const clearForIncident = useCallback((incidentId) => {
    setNotifications(prev => prev.filter(n => n.incidentId !== incidentId));
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    getNotificationsForHospital,
    clearForIncident,
  };
}
