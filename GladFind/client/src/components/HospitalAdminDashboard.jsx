import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Alert, Badge, EmptyState, Field, LoadingBlock, Spinner } from './ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const APPT_STATUS_TONES = {
  requested: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled: 'danger',
};

const KENYA_COUNTIES = [
  'Nairobi', 'Kiambu', 'Mombasa', 'Nakuru', 'Kisumu', 'Machakos', 'Uasin Gishu',
  'Kajiado', 'Kilifi', 'Meru', 'Nyeri', 'Kakamega', 'Murang\'a', 'Kisii',
  'Kericho', 'Bungoma', 'Trans Nzoia', 'Kitui', 'Garissa', 'Laikipia',
];

const FACILITY_TYPES = [
  { value: 'specialist_clinic', label: 'Specialist Clinic' },
  { value: 'private_hospital', label: 'Private Hospital' },
  { value: 'public_hospital', label: 'Public Hospital' },
  { value: 'teaching_hospital', label: 'Teaching & Referral Hospital' },
];

export function HospitalAdminDashboard({ user, onSwitchToPatientView }) {
  const toast = useToast();

  const [hospitals, setHospitals] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // appointments | services | settings | lookup

  // Reference catalog data
  const [categories, setCategories] = useState([]);
  const [insuranceCatalog, setInsuranceCatalog] = useState([]);

  // Appointments state
  const [appointments, setAppointments] = useState(null);
  const [apptStatusFilter, setApptStatusFilter] = useState('all');
  const [apptSearch, setApptSearch] = useState('');
  const [updatingApptId, setUpdatingApptId] = useState(null);

  // Modal / Form states
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showTestBookingModal, setShowTestBookingModal] = useState(false);

  // Intake Lookup state
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);

  const selectedHospital = hospitals?.find((h) => h.id === selectedHospitalId) || hospitals?.[0] || null;

  // Load hospitals & reference catalogs
  const loadHospitals = useCallback(async (selectId = null) => {
    try {
      const list = await Api.myHospitals();
      setHospitals(list);
      if (list.length > 0) {
        if (selectId && list.some((h) => h.id === selectId)) {
          setSelectedHospitalId(selectId);
        } else if (!selectedHospitalId || !list.some((h) => h.id === selectedHospitalId)) {
          setSelectedHospitalId(list[0].id);
        }
      } else {
        setSelectedHospitalId(null);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load managed facilities');
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHospitalId, toast]);

  useEffect(() => {
    loadHospitals();
    Api.categories().then(setCategories).catch(() => {});
    Api.insurance().then(setInsuranceCatalog).catch(() => {});
  }, []);

  // Load appointments when selected hospital changes
  const loadAppointments = useCallback(async () => {
    if (!selectedHospital?.id) {
      setAppointments([]);
      return;
    }
    try {
      const res = await Api.hospitalAppointments(selectedHospital.id, { limit: 100 });
      setAppointments(res.results ?? []);
    } catch (e) {
      setAppointments([]);
    }
  }, [selectedHospital?.id]);

  useEffect(() => {
    if (selectedHospital?.id) {
      loadAppointments();
    }
  }, [selectedHospital?.id, loadAppointments]);

  // Appointment status change handler
  async function handleUpdateApptStatus(appointmentId, newStatus) {
    setUpdatingApptId(appointmentId);
    try {
      const updated = await Api.updateAppointmentStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: updated.status } : a))
      );
      toast.success(`Appointment marked as ${newStatus}`);
    } catch (e) {
      toast.error(e.message || 'Could not update status');
    } finally {
      setUpdatingApptId(null);
    }
  }

  // Toggle hospital open / closed status
  async function handleToggleOpen() {
    if (!selectedHospital) return;
    try {
      const updated = await Api.updateHospital(selectedHospital.id, {
        is_open: !selectedHospital.is_open,
      });
      setHospitals((prev) =>
        prev.map((h) => (h.id === selectedHospital.id ? { ...h, is_open: updated.is_open } : h))
      );
      toast.success(`Facility marked as ${updated.is_open ? 'Open' : 'Temporarily Closed'}`);
    } catch (e) {
      toast.error(e.message || 'Failed to update operating status');
    }
  }

  // Handle Desk Patient Intake Lookup
  async function handleDeskLookup(e) {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupBusy(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await Api.lookupIntake(lookupCode.trim());
      setLookupResult(res);
    } catch (e) {
      setLookupError(e.message || 'Reference not found');
    } finally {
      setLookupBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading hospital management console…" />;

  return (
    <div className="space-y-8">
      {/* Top Banner / Role Identifier */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white font-bold text-lg shadow-sm">
              🏥
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
                  Hospital Administrator Portal
                </h1>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                  Live Management
                </span>
              </div>
              <p className="text-sm text-navy/60">
                Logged in as <strong className="text-navy">{user.full_name}</strong> ({user.email})
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onSwitchToPatientView && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={onSwitchToPatientView}
            >
              Switch to Patient View
            </button>
          )}
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => setShowAddFacility(true)}
          >
            + Register New Facility
          </button>
        </div>
      </div>

      {/* When no facilities exist yet */}
      {(!hospitals || hospitals.length === 0) && !showAddFacility && (
        <div className="card border-dashed p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl text-brand-600">
            🏥
          </div>
          <h2 className="mt-4 text-xl font-bold text-navy">No Healthcare Facilities Registered Yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-navy/65">
            As a hospital administrator, you can list your hospital or clinic on GlandFind, publish
            services and consultation fees, and receive patient booking requests.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAddFacility(true)}
            >
              Register Your Hospital or Clinic Now
            </button>
          </div>
        </div>
      )}

      {/* Facility Registration Modal / Form */}
      {showAddFacility && (
        <FacilityRegistrationCard
          categories={categories}
          insuranceCatalog={insuranceCatalog}
          onCancel={() => setShowAddFacility(false)}
          onCreated={(newHosp) => {
            setShowAddFacility(false);
            loadHospitals(newHosp.id);
            toast.success(`"${newHosp.name}" registered successfully!`);
          }}
        />
      )}

      {/* Main Console when facility is selected */}
      {selectedHospital && !showAddFacility && (
        <div className="space-y-6">
          {/* Facility Selector (if multiple) & Quick Header */}
          <div className="card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {hospitals.length > 1 && (
                  <div className="mb-3 flex items-center gap-2">
                    <label htmlFor="hosp-select" className="text-xs font-semibold uppercase tracking-wider text-navy/55">
                      Active Facility:
                    </label>
                    <select
                      id="hosp-select"
                      className="rounded-lg border border-navy/20 bg-white px-2.5 py-1 text-sm font-semibold text-navy"
                      value={selectedHospital.id}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>{h.name} ({h.town})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-black text-navy">{selectedHospital.name}</h2>
                  <Badge tone={selectedHospital.facility_type === 'teaching_hospital' ? 'brand' : 'neutral'}>
                    {FACILITY_TYPES.find((t) => t.value === selectedHospital.facility_type)?.label || selectedHospital.facility_type}
                  </Badge>
                  <Badge tone={selectedHospital.status === 'approved' ? 'success' : 'warning'}>
                    {selectedHospital.status === 'approved' ? '✓ Approved & Live' : '⏳ Pending Review'}
                  </Badge>
                  {selectedHospital.is_verified && (
                    <Badge tone="brand">Verified Partner</Badge>
                  )}
                </div>

                <p className="mt-1 text-sm text-navy/60">
                  📍 {selectedHospital.town}, {selectedHospital.county}
                  {selectedHospital.address_line ? ` · ${selectedHospital.address_line}` : ''}
                  {selectedHospital.phone ? ` · 📞 ${selectedHospital.phone}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleOpen}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selectedHospital.is_open
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-navy/20 bg-navy/5 text-navy/70 hover:bg-navy/10'
                  }`}
                  title="Click to toggle walk-in and operating status"
                >
                  <span className={`h-2 w-2 rounded-full ${selectedHospital.is_open ? 'bg-emerald-500' : 'bg-navy/40'}`} />
                  {selectedHospital.is_open ? 'Facility Open' : 'Facility Closed'}
                </button>

                <Link
                  to={`/hospitals/${selectedHospital.id}`}
                  className="btn-secondary text-xs"
                  target="_blank"
                  rel="noreferrer"
                >
                  View Public Page ↗
                </Link>

                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setShowTestBookingModal(true)}
                >
                  + Simulate Patient Booking
                </button>
              </div>
            </div>

            {/* Status notice if pending */}
            {selectedHospital.status === 'pending' && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
                <strong>Notice:</strong> Your facility registration has been submitted and is in review. Direct
                bookings via appointment links are fully functional immediately. Once verified by administrators, it
                will also appear in public search listings.
              </div>
            )}

            {/* Quick Metrics Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-navy/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-navy/50">Total Bookings</p>
                <p className="mt-1 text-2xl font-black text-navy">{appointments ? appointments.length : '—'}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-200/60">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Needs Action</p>
                <p className="mt-1 text-2xl font-black text-amber-900">
                  {appointments ? appointments.filter((a) => a.status === 'requested').length : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-brand-50 p-4 border border-brand-200/60">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Active Services</p>
                <p className="mt-1 text-2xl font-black text-brand-900">
                  {selectedHospital.services?.length ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-navy/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-navy/50">Bed Capacity</p>
                <p className="mt-1 text-2xl font-black text-navy">
                  {selectedHospital.bed_capacity ? `${selectedHospital.bed_capacity} beds` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-navy/15 gap-2 overflow-x-auto text-sm font-semibold">
            <button
              type="button"
              className={`border-b-2 px-4 py-3 transition whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-navy/60 hover:text-navy'
              }`}
              onClick={() => setActiveTab('appointments')}
            >
              📅 Appointments & Bookings{' '}
              {appointments && appointments.filter((a) => a.status === 'requested').length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white font-bold">
                  {appointments.filter((a) => a.status === 'requested').length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`border-b-2 px-4 py-3 transition whitespace-nowrap ${
                activeTab === 'services'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-navy/60 hover:text-navy'
              }`}
              onClick={() => setActiveTab('services')}
            >
              🩺 Services & Pricing ({selectedHospital.services?.length ?? 0})
            </button>
            <button
              type="button"
              className={`border-b-2 px-4 py-3 transition whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-navy/60 hover:text-navy'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Facility Settings & Profile
            </button>
            <button
              type="button"
              className={`border-b-2 px-4 py-3 transition whitespace-nowrap ${
                activeTab === 'lookup'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-navy/60 hover:text-navy'
              }`}
              onClick={() => setActiveTab('lookup')}
            >
              🔍 Desk Patient Check-In
            </button>
          </div>

          {/* Tab 1: Appointments Management */}
          {activeTab === 'appointments' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['all', 'requested', 'confirmed', 'completed', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        apptStatusFilter === st
                          ? 'bg-navy text-white'
                          : 'bg-navy/5 text-navy/70 hover:bg-navy/10'
                      }`}
                      onClick={() => setApptStatusFilter(st)}
                    >
                      {st === 'all' ? 'All Bookings' : st}
                      {appointments && st !== 'all' && (
                        <span className="ml-1 opacity-70">
                          ({appointments.filter((a) => a.status === st).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    placeholder="Search patient name / phone…"
                    className="field-input text-xs py-1.5 w-60"
                    value={apptSearch}
                    onChange={(e) => setApptSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={loadAppointments}
                    title="Refresh bookings"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {appointments === null ? (
                <LoadingBlock label="Loading facility bookings…" />
              ) : appointments.length === 0 ? (
                <EmptyState
                  title="No booking requests yet"
                  description="When patients book appointments for your services, they will appear here for confirmation."
                  action={
                    <button
                      type="button"
                      className="btn-secondary mt-2 text-sm"
                      onClick={() => setShowTestBookingModal(true)}
                    >
                      Create a Test Booking
                    </button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {appointments
                    .filter((a) => (apptStatusFilter === 'all' ? true : a.status === apptStatusFilter))
                    .filter((a) => {
                      if (!apptSearch.trim()) return true;
                      const q = apptSearch.toLowerCase();
                      return (
                        a.patient_name?.toLowerCase().includes(q) ||
                        a.patient_phone?.toLowerCase().includes(q) ||
                        a.doctor_name?.toLowerCase().includes(q)
                      );
                    })
                    .map((appt) => {
                      const service = selectedHospital.services?.find((s) => s.id === appt.service_id);
                      const isBusy = updatingApptId === appt.id;

                      return (
                        <div
                          key={appt.id}
                          className="card p-5 transition hover:shadow-md flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="font-bold text-navy text-base">{appt.patient_name}</h3>
                              <Badge tone={APPT_STATUS_TONES[appt.status] || 'neutral'}>
                                {appt.status}
                              </Badge>
                              {service && (
                                <span className="rounded-md bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy/70">
                                  {service.name} ({service.currency} {service.fee?.toLocaleString()})
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-navy/60">
                              📞 <a href={`tel:${appt.patient_phone}`} className="hover:underline font-semibold text-navy">{appt.patient_phone}</a>
                              {appt.patient_email && (
                                <> · ✉️ <a href={`mailto:${appt.patient_email}`} className="hover:underline">{appt.patient_email}</a></>
                              )}
                              {appt.doctor_name && (
                                <> · 👨‍⚕️ <strong>Dr. {appt.doctor_name}</strong></>
                              )}
                            </p>

                            <p className="text-xs text-navy/70">
                              📅 <strong>Preferred Date:</strong> {formatDate(appt.preferred_date)}
                              {appt.preferred_time ? ` at ${appt.preferred_time}` : ''}
                              <span className="text-navy/40"> · Booked on {formatDate(appt.created_at)}</span>
                            </p>

                            {appt.notes && (
                              <p className="mt-2 rounded-lg bg-navy/5 p-2 text-xs text-navy/80 italic">
                                &ldquo;{appt.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                            {appt.status === 'requested' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateApptStatus(appt.id, 'confirmed')}
                                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                                >
                                  {isBusy ? <Spinner className="h-3 w-3 inline mr-1" /> : '✓ '}
                                  Confirm Booking
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateApptStatus(appt.id, 'cancelled')}
                                  className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </>
                            )}

                            {appt.status === 'confirmed' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateApptStatus(appt.id, 'completed')}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isBusy ? <Spinner className="h-3 w-3 inline mr-1" /> : '✓ '}
                                  Mark Completed
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdateApptStatus(appt.id, 'cancelled')}
                                  className="rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy/60 transition hover:bg-navy/5 disabled:opacity-50"
                                >
                                  Cancel Booking
                                </button>
                              </>
                            )}

                            {(appt.status === 'completed' || appt.status === 'cancelled') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUpdateApptStatus(appt.id, 'confirmed')}
                                className="text-xs text-navy/50 underline hover:text-navy disabled:opacity-50"
                              >
                                Reopen as Confirmed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Services & Pricing */}
          {activeTab === 'services' && (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-navy">Offered Medical Services & Consultation Fees</h3>
                  <p className="text-xs text-navy/55">
                    Patients search facilities by specialty and compare consultation rates in KES.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => setShowAddService(true)}
                >
                  + Add Service / Specialty
                </button>
              </div>

              {showAddService && (
                <AddServiceCard
                  hospitalId={selectedHospital.id}
                  categories={categories}
                  onCancel={() => setShowAddService(false)}
                  onCreated={() => {
                    setShowAddService(false);
                    loadHospitals(selectedHospital.id);
                    toast.success('New service added successfully!');
                  }}
                />
              )}

              {(!selectedHospital.services || selectedHospital.services.length === 0) ? (
                <EmptyState
                  title="No services listed yet"
                  description="Your hospital needs at least one active service with a consultation fee to accept bookings."
                  action={
                    <button
                      type="button"
                      className="btn-primary mt-2"
                      onClick={() => setShowAddService(true)}
                    >
                      + Add Your First Service
                    </button>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedHospital.services.map((svc) => (
                    <div key={svc.id} className="card p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-navy text-base">{svc.name}</h4>
                          <p className="text-xs text-navy/50">{svc.fee_label || 'Consultation fee'}</p>
                        </div>
                        <span className="font-mono text-base font-extrabold text-brand-600">
                          {svc.currency} {svc.fee?.toLocaleString()}
                        </span>
                      </div>

                      {svc.doctors && svc.doctors.length > 0 && (
                        <div className="text-xs text-navy/70 border-t border-navy/10 pt-2.5">
                          <span className="font-semibold text-navy/90">Specialists: </span>
                          {svc.doctors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab 3: Facility Profile & Settings */}
          {activeTab === 'settings' && (
            <FacilitySettingsCard
              hospital={selectedHospital}
              insuranceCatalog={insuranceCatalog}
              onSaved={(updated) => {
                setHospitals((prev) =>
                  prev.map((h) => (h.id === updated.id ? { ...h, ...updated } : h))
                );
                toast.success('Facility settings updated successfully!');
              }}
            />
          )}

          {/* Tab 4: Desk Patient Reference Lookup */}
          {activeTab === 'lookup' && (
            <section className="card p-7 max-w-xl mx-auto space-y-5">
              <div>
                <h3 className="text-lg font-bold text-navy">Reception Desk Intake Verification</h3>
                <p className="mt-1 text-xs text-navy/60">
                  When a patient arrives at the desk, verify their GlandFind pre-registration code to retrieve
                  their confirmed check-in identification without exposing confidential clinical notes.
                </p>
              </div>

              <form onSubmit={handleDeskLookup} className="space-y-3">
                <Field label="Patient Intake Reference Code" htmlFor="lookup_code_desk">
                  <div className="flex gap-2">
                    <input
                      id="lookup_code_desk"
                      className="field-input font-mono uppercase tracking-wider text-base"
                      placeholder="GF-XXXXXXXX"
                      value={lookupCode}
                      onChange={(e) => setLookupCode(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={lookupBusy || !lookupCode.trim()}
                      className="btn-primary whitespace-nowrap"
                    >
                      {lookupBusy ? <Spinner /> : 'Verify Code'}
                    </button>
                  </div>
                </Field>
              </form>

              {lookupError && <Alert tone="error">{lookupError}</Alert>}

              {lookupResult && (
                <div className="rounded-xl border border-brand-500/25 bg-brand-50/70 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                      ✓ Verified Patient Record
                    </span>
                    <span className="font-mono text-xs font-bold text-brand-700">
                      {lookupResult.profile_code}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-brand-950">
                    {lookupResult.personal?.first_name} {lookupResult.personal?.last_name}
                  </h4>
                  <p className="text-xs text-brand-900/80">
                    County: <strong>{lookupResult.personal?.county}</strong>
                  </p>
                  <p className="text-xs text-brand-900/60 pt-2 border-t border-brand-500/20">
                    Intake completed and on file. Patient is ready for check-in.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Test Booking Simulation Modal */}
      {showTestBookingModal && selectedHospital && (
        <SimulateBookingModal
          hospital={selectedHospital}
          onClose={() => setShowTestBookingModal(false)}
          onBooked={() => {
            setShowTestBookingModal(false);
            loadAppointments();
            toast.success('Test patient appointment created! Check your Bookings tab.');
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// Facility Registration Card
// =========================================================================
function FacilityRegistrationCard({ categories, insuranceCatalog, onCancel, onCreated }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    facility_type: 'specialist_clinic',
    county: 'Nairobi',
    town: 'Westlands',
    address_line: '',
    phone: '',
    email: '',
    bed_capacity: '',
    specialist_count: '',
    about: '',
    accepts_walk_ins: true,
    supports_booking: true,
    insurance_providers: ['NHIF'],
  });

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleInsurance(providerName) {
    setForm((prev) => {
      const exists = prev.insurance_providers.includes(providerName);
      return {
        ...prev,
        insurance_providers: exists
          ? prev.insurance_providers.filter((p) => p !== providerName)
          : [...prev.insurance_providers, providerName],
      };
    });
  }

  function handleQuickFillDemo() {
    setForm({
      name: 'Westlands Specialist Medical Centre',
      facility_type: 'specialist_clinic',
      county: 'Nairobi',
      town: 'Westlands',
      address_line: 'Parklands Road, Suite 402',
      phone: '+254 722 123 456',
      email: 'info@westlandsspecialist.co.ke',
      bed_capacity: '40',
      specialist_count: '15',
      about: 'A premier outpatient and diagnostic specialty centre offering cardiology, oncology, pediatric and dental consultations.',
      accepts_walk_ins: true,
      supports_booking: true,
      insurance_providers: ['NHIF', 'Jubilee Health', 'AAR Insurance', 'CIC Insurance'],
    });
    toast.success('Sample facility data populated!');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const payload = {
        name: form.name.trim(),
        facility_type: form.facility_type,
        county: form.county.trim(),
        town: form.town.trim(),
        address_line: form.address_line.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        bed_capacity: form.bed_capacity ? Number(form.bed_capacity) : null,
        specialist_count: form.specialist_count ? Number(form.specialist_count) : null,
        about: form.about.trim() || undefined,
        accepts_walk_ins: form.accepts_walk_ins,
        supports_booking: form.supports_booking,
        insurance_providers: form.insurance_providers,
      };

      const hospital = await Api.createHospital(payload);

      // Auto-add default Consultation service so facility is immediately bookable
      try {
        await Api.addHospitalService(hospital.id, {
          service_name: 'General Practice',
          consultation_fee: 1500,
          fee_label: 'Standard Consultation',
          currency: 'KES',
          doctors: ['Dr. On-Duty Physician'],
          description: 'Initial general medical evaluation and patient triage.',
        });
      } catch {
        /* non-fatal */
      }

      onCreated(hospital);
    } catch (e) {
      setError(e.message || 'Failed to register facility');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-7 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-navy">Register a New Healthcare Facility</h2>
          <p className="text-xs text-navy/60">
            Enter facility details to join GlandFind Kenya directory and start receiving appointments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="rounded-lg border border-brand-500/30 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100"
          >
            ⚡ Quick-fill Demo Data
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facility Name *" htmlFor="reg_name">
            <input
              id="reg_name"
              required
              className="field-input"
              placeholder="e.g. Nairobi Premier Hospital"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <Field label="Facility Type *" htmlFor="reg_type">
            <select
              id="reg_type"
              required
              className="field-input"
              value={form.facility_type}
              onChange={(e) => set('facility_type', e.target.value)}
            >
              {FACILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="County *" htmlFor="reg_county">
            <select
              id="reg_county"
              required
              className="field-input"
              value={form.county}
              onChange={(e) => set('county', e.target.value)}
            >
              {KENYA_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Town / Area *" htmlFor="reg_town">
            <input
              id="reg_town"
              required
              className="field-input"
              placeholder="e.g. Westlands, Upper Hill"
              value={form.town}
              onChange={(e) => set('town', e.target.value)}
            />
          </Field>

          <Field label="Street / Address Line" htmlFor="reg_address">
            <input
              id="reg_address"
              className="field-input"
              placeholder="e.g. Ngong Road, Block B"
              value={form.address_line}
              onChange={(e) => set('address_line', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Official Phone Number" htmlFor="reg_phone" hint="Used for appointment SMS/calls">
            <input
              id="reg_phone"
              type="tel"
              className="field-input"
              placeholder="+254 700 000 000"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>

          <Field label="Official Email" htmlFor="reg_email">
            <input
              id="reg_email"
              type="email"
              className="field-input"
              placeholder="contact@facility.co.ke"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bed Capacity" htmlFor="reg_beds">
            <input
              id="reg_beds"
              type="number"
              min="0"
              className="field-input"
              placeholder="e.g. 50"
              value={form.bed_capacity}
              onChange={(e) => set('bed_capacity', e.target.value)}
            />
          </Field>

          <Field label="Number of Specialists / Doctors" htmlFor="reg_specs">
            <input
              id="reg_specs"
              type="number"
              min="0"
              className="field-input"
              placeholder="e.g. 12"
              value={form.specialist_count}
              onChange={(e) => set('specialist_count', e.target.value)}
            />
          </Field>
        </div>

        <Field label="About Facility / Overview" htmlFor="reg_about">
          <textarea
            id="reg_about"
            rows={3}
            className="field-input"
            placeholder="Describe clinical departments, emergency services, ICU capacity, or specialities offered..."
            value={form.about}
            onChange={(e) => set('about', e.target.value)}
          />
        </Field>

        <div>
          <label className="field-label">Accepted Insurance Plans</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(insuranceCatalog.length > 0 ? insuranceCatalog : [{ name: 'NHIF' }, { name: 'Jubilee Health' }, { name: 'AAR Insurance' }, { name: 'CIC Insurance' }]).map((p) => {
              const active = form.insurance_providers.includes(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => toggleInsurance(p.name)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-navy/15 text-navy/60 hover:border-navy/30'
                  }`}
                >
                  {active ? '✓ ' : '+ '} {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-navy font-medium cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-navy/20 text-brand-500"
              checked={form.accepts_walk_ins}
              onChange={(e) => set('accepts_walk_ins', e.target.checked)}
            />
            Accepts Walk-In Patients
          </label>
          <label className="flex items-center gap-2 text-sm text-navy font-medium cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-navy/20 text-brand-500"
              checked={form.supports_booking}
              onChange={(e) => set('supports_booking', e.target.checked)}
            />
            Enable Online Booking on GlandFind
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy/10">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Registering Facility…' : 'Register Facility'}
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================================================
// Add Service Card / Modal
// =========================================================================
function AddServiceCard({ hospitalId, categories, onCancel, onCreated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    category_id: categories?.[0]?.id || '',
    service_name: categories?.[0]?.name || 'Cardiology',
    consultation_fee: '2000',
    fee_label: 'Consultation fee',
    currency: 'KES',
    doctors: 'Dr. Jane Mwangi, Dr. David Otieno',
    description: 'Comprehensive specialty consultation, diagnostic review and follow-up.',
  });

  function handleCategoryChange(e) {
    const catId = e.target.value;
    const cat = categories.find((c) => c.id === catId);
    setForm((prev) => ({
      ...prev,
      category_id: catId,
      service_name: cat ? cat.name : prev.service_name,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const doctorsList = form.doctors
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      await Api.addHospitalService(hospitalId, {
        category_id: form.category_id || undefined,
        service_name: form.service_name.trim(),
        consultation_fee: Number(form.consultation_fee),
        fee_label: form.fee_label.trim() || 'Consultation fee',
        currency: form.currency || 'KES',
        doctors: doctorsList,
        description: form.description.trim() || undefined,
      });

      onCreated();
    } catch (e) {
      setError(e.message || 'Could not add service');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 border-brand-500/30 bg-brand-50/20 max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-navy/10 pb-3">
        <h4 className="font-bold text-navy text-base">Add New Medical Service / Specialty</h4>
        <button type="button" onClick={onCancel} className="btn-ghost text-xs">✕ Close</button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {categories.length > 0 && (
          <Field label="Service Category *" htmlFor="svc_cat">
            <select
              id="svc_cat"
              className="field-input"
              value={form.category_id}
              onChange={handleCategoryChange}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Service Name / Specialty Title *" htmlFor="svc_name">
          <input
            id="svc_name"
            required
            className="field-input"
            value={form.service_name}
            onChange={(e) => setForm((prev) => ({ ...prev, service_name: e.target.value }))}
            placeholder="e.g. Cardiology, Dental Care, Pediatrics"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Consultation Fee (KES) *" htmlFor="svc_fee">
            <input
              id="svc_fee"
              required
              type="number"
              min="0"
              className="field-input font-semibold"
              value={form.consultation_fee}
              onChange={(e) => setForm((prev) => ({ ...prev, consultation_fee: e.target.value }))}
            />
          </Field>

          <Field label="Fee Label" htmlFor="svc_label">
            <input
              id="svc_label"
              className="field-input"
              value={form.fee_label}
              onChange={(e) => setForm((prev) => ({ ...prev, fee_label: e.target.value }))}
              placeholder="e.g. Standard consultation"
            />
          </Field>
        </div>

        <Field label="Assigned Doctors / Specialists (Comma-separated)" htmlFor="svc_docs" hint="e.g. Dr. Jane Mwangi, Dr. David Otieno">
          <input
            id="svc_docs"
            className="field-input"
            value={form.doctors}
            onChange={(e) => setForm((prev) => ({ ...prev, doctors: e.target.value }))}
          />
        </Field>

        <Field label="Service Description" htmlFor="svc_desc">
          <textarea
            id="svc_desc"
            rows={2}
            className="field-input text-xs"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy/10">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs" disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary text-xs" disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Adding Service…' : 'Save Service'}
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================================================
// Facility Settings Card
// =========================================================================
function FacilitySettingsCard({ hospital, insuranceCatalog, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: hospital.name || '',
    facility_type: hospital.facility_type || 'specialist_clinic',
    county: hospital.county || '',
    town: hospital.town || '',
    address_line: hospital.address_line || '',
    phone: hospital.phone || '',
    email: hospital.email || '',
    bed_capacity: hospital.bed_capacity ?? '',
    specialist_count: hospital.specialist_count ?? '',
    about: hospital.about || '',
    accepts_walk_ins: Boolean(hospital.accepts_walk_ins),
    supports_booking: Boolean(hospital.supports_booking),
    is_open: Boolean(hospital.is_open),
    insurance_providers: hospital.insurance_providers || [],
  });

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleInsurance(providerName) {
    setForm((prev) => {
      const exists = prev.insurance_providers.includes(providerName);
      return {
        ...prev,
        insurance_providers: exists
          ? prev.insurance_providers.filter((p) => p !== providerName)
          : [...prev.insurance_providers, providerName],
      };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const updated = await Api.updateHospital(hospital.id, {
        name: form.name.trim(),
        facility_type: form.facility_type,
        county: form.county.trim(),
        town: form.town.trim(),
        address_line: form.address_line.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        bed_capacity: form.bed_capacity ? Number(form.bed_capacity) : null,
        specialist_count: form.specialist_count ? Number(form.specialist_count) : null,
        about: form.about.trim() || undefined,
        accepts_walk_ins: form.accepts_walk_ins,
        supports_booking: form.supports_booking,
        is_open: form.is_open,
        insurance_providers: form.insurance_providers,
      });

      onSaved(updated);
    } catch (e) {
      setError(e.message || 'Could not update facility');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card p-7 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-navy">Facility Profile & Operational Configuration</h3>
          <p className="text-xs text-navy/60">Manage operational parameters, contact information, and public listing details.</p>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Facility Name" htmlFor="set_name">
          <input
            id="set_name"
            required
            className="field-input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field label="Facility Type" htmlFor="set_type">
          <select
            id="set_type"
            className="field-input"
            value={form.facility_type}
            onChange={(e) => set('facility_type', e.target.value)}
          >
            {FACILITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="County" htmlFor="set_county">
          <input
            id="set_county"
            required
            className="field-input"
            value={form.county}
            onChange={(e) => set('county', e.target.value)}
          />
        </Field>
        <Field label="Town" htmlFor="set_town">
          <input
            id="set_town"
            required
            className="field-input"
            value={form.town}
            onChange={(e) => set('town', e.target.value)}
          />
        </Field>
        <Field label="Address Line" htmlFor="set_address">
          <input
            id="set_address"
            className="field-input"
            value={form.address_line}
            onChange={(e) => set('address_line', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Official Phone" htmlFor="set_phone">
          <input
            id="set_phone"
            className="field-input"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Official Email" htmlFor="set_email">
          <input
            id="set_email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bed Capacity" htmlFor="set_beds">
          <input
            id="set_beds"
            type="number"
            min="0"
            className="field-input"
            value={form.bed_capacity}
            onChange={(e) => set('bed_capacity', e.target.value)}
          />
        </Field>
        <Field label="Specialist Doctors" htmlFor="set_specs">
          <input
            id="set_specs"
            type="number"
            min="0"
            className="field-input"
            value={form.specialist_count}
            onChange={(e) => set('specialist_count', e.target.value)}
          />
        </Field>
      </div>

      <Field label="About Facility" htmlFor="set_about">
        <textarea
          id="set_about"
          rows={3}
          className="field-input"
          value={form.about}
          onChange={(e) => set('about', e.target.value)}
        />
      </Field>

      <div>
        <label className="field-label">Accepted Insurance Plans</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {insuranceCatalog.map((p) => {
            const active = form.insurance_providers.includes(p.name);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => toggleInsurance(p.name)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-navy/15 text-navy/60 hover:border-navy/30'
                }`}
              >
                {active ? '✓ ' : '+ '} {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm text-navy font-medium cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-navy/20 text-brand-500"
            checked={form.is_open}
            onChange={(e) => set('is_open', e.target.checked)}
          />
          Facility is Currently Open
        </label>
        <label className="flex items-center gap-2 text-sm text-navy font-medium cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-navy/20 text-brand-500"
            checked={form.accepts_walk_ins}
            onChange={(e) => set('accepts_walk_ins', e.target.checked)}
          />
          Accepts Walk-In Patients
        </label>
        <label className="flex items-center gap-2 text-sm text-navy font-medium cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-navy/20 text-brand-500"
            checked={form.supports_booking}
            onChange={(e) => set('supports_booking', e.target.checked)}
          />
          Online Booking Enabled
        </label>
      </div>

      <div className="flex justify-end pt-4 border-t border-navy/10">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner />}
          {busy ? 'Saving Changes…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// =========================================================================
// Simulate Test Booking Modal
// =========================================================================
function SimulateBookingModal({ hospital, onClose, onBooked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const services = hospital.services || [];
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [patientName, setPatientName] = useState('Samuel Omondi');
  const [patientPhone, setPatientPhone] = useState('+254 711 234 567');
  const [patientEmail, setPatientEmail] = useState('samuel.omondi@test.ke');
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [preferredTime, setPreferredTime] = useState('10:30 AM');
  const [doctorName, setDoctorName] = useState(services[0]?.doctors?.[0] || '');
  const [notes, setNotes] = useState('Requesting regular specialist check-up and blood pressure assessment.');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!serviceId) {
      setError('Please add a service to your hospital before booking');
      return;
    }
    setBusy(true);
    setError('');

    try {
      await Api.bookAppointment({
        hospital_id: hospital.id,
        service_id: serviceId,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim() || undefined,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        doctor_name: doctorName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onBooked();
    } catch (e) {
      setError(e.message || 'Failed to simulate booking');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-navy/10 pb-3">
          <div>
            <h3 className="font-bold text-navy text-lg">Simulate Patient Booking</h3>
            <p className="text-xs text-navy/60">Creates a real booking request to test your administration workflow.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-xs">✕ Close</button>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Select Service *" htmlFor="sim_svc">
            <select
              id="sim_svc"
              required
              className="field-input"
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const s = services.find((svc) => svc.id === e.target.value);
                if (s?.doctors?.[0]) setDoctorName(s.doctors[0]);
              }}
            >
              {services.length === 0 ? (
                <option value="">No services available (add one first)</option>
              ) : (
                services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency} {s.fee?.toLocaleString()})
                  </option>
                ))
              )}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Patient Name *" htmlFor="sim_pname">
              <input
                id="sim_pname"
                required
                className="field-input"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </Field>
            <Field label="Patient Phone *" htmlFor="sim_pphone">
              <input
                id="sim_pphone"
                required
                className="field-input"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preferred Date" htmlFor="sim_date">
              <input
                id="sim_date"
                type="date"
                className="field-input"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </Field>
            <Field label="Preferred Time" htmlFor="sim_time">
              <input
                id="sim_time"
                className="field-input"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Doctor Preference" htmlFor="sim_doc">
            <input
              id="sim_doc"
              className="field-input"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. Jane Mwangi"
            />
          </Field>

          <Field label="Patient Notes / Reason for Visit" htmlFor="sim_notes">
            <textarea
              id="sim_notes"
              rows={2}
              className="field-input text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy/10">
            <button type="button" onClick={onClose} className="btn-secondary text-xs" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs" disabled={busy || !serviceId}>
              {busy && <Spinner />}
              {busy ? 'Booking…' : 'Submit Test Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}
