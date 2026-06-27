import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../../components/FileUpload';
import { submitKyc, getMyKycDetails } from '../../api/retailer';
import { uploadSingle } from '../../api/upload';
import {
  Loader2, AlertTriangle, CheckCircle, Info, MapPin,
  User, Building2, FileText, ShieldCheck, Clock, XCircle,
  ChevronRight, BadgeCheck,
} from 'lucide-react';
import Swal from 'sweetalert2';

/* ─────────────────── helpers ─────────────────── */
const Field = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {label} {required && <span className="text-red-500 normal-case">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
        <XCircle size={11} /> {error.message}
      </p>
    )}
  </div>
);

const inputCls = (hasError) =>
  `w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium text-slate-800 bg-white
   focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400
   ${hasError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'}`;

const SectionHeader = ({ icon: Icon, title, subtitle, step }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
      {step}
    </div>
    <div>
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
        <Icon size={16} className="text-blue-500" /> {title}
      </h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ─────────────────── component ─────────────────── */
const KycPage = () => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  const [pageLoading, setPageLoading]         = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [kycData, setKycData]                 = useState(null);
  const navigate = useNavigate();

  /* ── fetch KYC ── */
  useEffect(() => {
    async function fetchKycStatus() {
      try {
        const { data } = await getMyKycDetails();
        setKycData(data);
        const fileFields = ['aadhaarFront', 'aadhaarBack', 'panCardImage', 'photo', 'bankDocument'];
        if (data.details) {
          Object.keys(data.details).forEach((key) => {
            if (!fileFields.includes(key) && key !== 'status' && key !== 'rejectionReason')
              setValue(key, data.details[key]);
          });
          if (data.details?.aadhaarNumber)
            setValue('aadhaarLast4', data.details.aadhaarNumber.slice(-4));
        }
      } catch {
        toast.error('Failed to load your KYC status.');
      } finally {
        setPageLoading(false);
      }
    }
    fetchKycStatus();
  }, [setValue]);

  /* ── location ── */
  const handleGetLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setValue('plusCode', `${latitude}, ${longitude}`);
        setLocationLoading(false);
        toast.success('Location captured!');
      },
      () => { toast.error('Unable to fetch location.'); setLocationLoading(false); }
    );
  };

  /* ── submit ── */
  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    Swal.fire({ title: 'Submitting KYC…', text: 'Uploading documents…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      formData.aadhaarNumber = `XXXXXXXX${formData.aadhaarLast4}`;
      const payload = { ...formData };
      delete payload.aadhaarLast4;
      const fileFields = ['aadhaarFront', 'aadhaarBack', 'panCardImage', 'photo', 'bankDocument'];
      const uploads = [];
      for (const field of fileFields) {
        if (formData[field]?.[0]) {
          uploads.push(uploadSingle(formData[field][0]).then((res) => { payload[field] = res.data.url; }));
        } else {
          payload[field] = kycData?.details?.[field] || null;
        }
        if (field === 'bankDocument' && !payload[field]) delete payload[field];
      }
      await Promise.all(uploads);
      await submitKyc(payload);
      Swal.fire({ title: 'Success!', text: 'KYC submitted successfully.', icon: 'success', confirmButtonText: 'Go to Dashboard' })
        .then(() => navigate('/retailer/dashboard'));
    } catch (error) {
      Swal.fire({ title: 'Failed', text: error.response?.data?.message || 'Something went wrong.', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── loading ── */
  if (pageLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 animate-pulse">
        <ShieldCheck size={26} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-500">Loading your KYC status…</p>
    </div>
  );

  /* ── approved ── */
  if (kycData?.kycStatus === 'approved') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <BadgeCheck size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">KYC Verified</h2>
        <p className="text-slate-500 mt-2 text-sm">Your identity has been successfully verified. You have full access to all services.</p>
        <button onClick={() => navigate('/retailer/dashboard')} className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Go to Dashboard <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  /* ── pending ── */
  if (kycData?.kycStatus === 'pending') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock size={36} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Under Review</h2>
        <p className="text-slate-500 mt-2 text-sm">Your documents have been submitted and are currently being reviewed by our team. This usually takes 24–48 hours.</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl">
          <Info size={13} /> We'll notify you once the review is complete.
        </div>
      </div>
    </div>
  );

  /* ════════════════════════ MAIN FORM ════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">KYC Verification</h1>
            <p className="text-xs text-slate-400">Complete your Know Your Customer verification to unlock all features</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-6">

        {/* ── Rejection banner ── */}
        {kycData?.kycStatus === 'rejected' && (
          <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-sm">KYC Rejected</p>
              <p className="text-red-600 text-xs mt-1">
                Reason: <span className="font-semibold">{kycData.details?.rejectionReason || 'No reason provided'}</span>
              </p>
              <p className="text-red-500 text-xs mt-1">Please review the reason above, correct your details, and resubmit.</p>
            </div>
          </div>
        )}

        {/* ── Progress steps ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between relative">
            <div className="absolute inset-x-0 top-4 h-px bg-slate-200 mx-12" />
            {[
              { label: 'Personal Info', icon: User },
              { label: 'Address',       icon: Building2 },
              { label: 'Documents',     icon: FileText },
              { label: 'Submit',        icon: ShieldCheck },
            ].map(({ label, icon: Icon }, i) => (
              <div key={i} className="relative flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-100">
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Section 1: Personal Info ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <SectionHeader icon={User} title="Personal Information" subtitle="Enter your identity details exactly as they appear on official documents" step="1" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Outlet Name */}
              <Field label="Outlet Name" required error={errors.outletName}>
                <input
                  type="text"
                  {...register('outletName', { required: 'Outlet name is required' })}
                  placeholder="e.g. Sharma Enterprises"
                  className={inputCls(errors.outletName)}
                />
              </Field>

              {/* Aadhaar */}
              <Field label="Aadhaar Number (Last 4 Digits)" required error={errors.aadhaarLast4}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-4 py-2.5 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-500 font-mono text-sm flex-shrink-0 select-none">
                    XXXX&nbsp;XXXX
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    {...register('aadhaarLast4', {
                      required: 'Enter last 4 digits',
                      pattern: { value: /^[0-9]{4}$/, message: 'Must be 4 digits' },
                    })}
                    placeholder="1234"
                    className={`${inputCls(errors.aadhaarLast4)} w-24 text-center font-mono tracking-widest`}
                  />
                </div>
              </Field>

              {/* PAN */}
              <Field label="PAN Number" required error={errors.panNumber}>
                <input
                  type="text"
                  maxLength={10}
                  {...register('panNumber', { required: 'PAN is required' })}
                  onInput={(e) => (e.target.value = e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`${inputCls(errors.panNumber)} uppercase tracking-widest font-mono`}
                />
              </Field>

            </div>
          </div>

          {/* ── Section 2: Address ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <SectionHeader icon={Building2} title="Outlet Address" subtitle="Provide your registered outlet address for verification" step="2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <Field label="State" required error={errors.state}>
                <input type="text" {...register('state', { required: 'State is required' })} placeholder="e.g. Uttar Pradesh" className={inputCls(errors.state)} />
              </Field>

              <Field label="District" required error={errors.district}>
                <input type="text" {...register('district', { required: 'District is required' })} placeholder="e.g. Lucknow" className={inputCls(errors.district)} />
              </Field>

              <Field label="Post Office" required error={errors.postOffice}>
                <input type="text" {...register('postOffice', { required: 'Post Office is required' })} placeholder="e.g. Hazratganj" className={inputCls(errors.postOffice)} />
              </Field>

              <Field label="PIN Code" required error={errors.pinCode}>
                <input
                  type="text"
                  {...register('pinCode', {
                    required: 'PIN is required',
                    pattern: { value: /^\d{6}$/, message: 'Must be 6 digits' },
                  })}
                  placeholder="226001"
                  className={`${inputCls(errors.pinCode)} tracking-widest font-mono`}
                  maxLength={6}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Full Address" required error={errors.address}>
                  <textarea
                    {...register('address', { required: 'Address is required' })}
                    rows={3}
                    placeholder="House/Shop no., Street, Locality, City…"
                    className={`${inputCls(errors.address)} resize-none`}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Live Location (GPS Coordinates)" required error={errors.plusCode}>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      {...register('plusCode', { required: 'Location is required' })}
                      placeholder="Click the button to capture your location"
                      className={`${inputCls(errors.plusCode)} bg-slate-50 flex-1 cursor-not-allowed`}
                    />
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                    >
                      {locationLoading
                        ? <Loader2 size={15} className="animate-spin" />
                        : <MapPin size={15} />}
                      <span className="hidden sm:inline">{locationLoading ? 'Fetching…' : 'Capture'}</span>
                    </button>
                  </div>
                </Field>
              </div>

            </div>
          </div>

          {/* ── Section 3: Documents ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <SectionHeader icon={FileText} title="Document Upload" subtitle="Upload clear, legible photos or scans of each required document" step="3" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUpload label="Aadhaar Front" name="aadhaarFront" register={register} error={errors.aadhaarFront} watch={watch} setValue={setValue} required={!kycData?.details?.aadhaarFront} existingFileUrl={kycData?.details?.aadhaarFront} />
              <FileUpload label="Aadhaar Back" name="aadhaarBack" register={register} error={errors.aadhaarBack} watch={watch} setValue={setValue} required={!kycData?.details?.aadhaarBack} existingFileUrl={kycData?.details?.aadhaarBack} />
              <FileUpload label="PAN Card" name="panCardImage" register={register} error={errors.panCardImage} watch={watch} setValue={setValue} required={!kycData?.details?.panCardImage} existingFileUrl={kycData?.details?.panCardImage} />
              <FileUpload label="Your Passport Photo" name="photo" register={register} error={errors.photo} watch={watch} setValue={setValue} required={!kycData?.details?.photo} existingFileUrl={kycData?.details?.photo} />
              <div className="md:col-span-2">
                <FileUpload label="Shop Photo (Optional)" name="bankDocument" register={register} error={errors.bankDocument} watch={watch} setValue={setValue} existingFileUrl={kycData?.details?.bankDocument} />
              </div>
            </div>

            {/* Upload tips */}
            <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 space-y-0.5">
                <p className="font-semibold">Upload Guidelines</p>
                <p>• Files must be JPG, PNG, or PDF · Max size 5 MB each</p>
                <p>• Ensure all text is clearly readable and the image is not blurry</p>
                <p>• Do not upload password-protected files</p>
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <SectionHeader icon={ShieldCheck} title="Review & Submit" subtitle="By submitting, you confirm all provided information is accurate and genuine" step="4" />

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <CheckCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Your data is encrypted and stored securely. It will only be used for identity verification purposes as per our Privacy Policy.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
            >
              {isSubmitting
                ? <><Loader2 size={16} className="animate-spin" /> Submitting your KYC…</>
                : <><ShieldCheck size={16} /> Submit for Verification</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KycPage;