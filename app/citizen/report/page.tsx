'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import LocationPicker from '@/components/location-picker';
import { GeotagCamera, GeotagData } from '@/components/geotag-camera';
import { calculateWastePriority } from '@/lib/priority-engine';
import { addNotification } from '@/lib/notification-service';
import { saveReportToLocalCache } from '@/lib/report-service';
import { CollectionPoint, WasteCategory, SeverityLevel } from '@/types/database';
import { 
  PlusCircle, 
  Upload, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Building2,
  X
} from 'lucide-react';

export default function ReportWastePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, tLocation } = useLanguage();

  // Form Fields
  const [category, setCategory] = useState<WasteCategory>('overflowing_bin');
  const [severity, setSeverity] = useState<SeverityLevel>('HIGH');
  const [description, setDescription] = useState('Overflowing bin requiring urgent municipal pickup.');
  const [locationName, setLocationName] = useState('Narasipuram Main Road');
  const [latitude, setLatitude] = useState(11.0003);
  const [longitude, setLongitude] = useState(76.7725);
  const [collectionPointId, setCollectionPointId] = useState<string>('');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Collection Points List
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [createdReport, setCreatedReport] = useState<{
    id: string;
    status: string;
    priorityScore: number;
    priorityLevel: string;
  } | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const { data } = await supabase.from('collection_points').select('*').limit(20);
        if (data && data.length > 0) {
          setCollectionPoints(data as CollectionPoint[]);
        }
      } catch (err) {
        console.error('Error fetching collection points:', err);
      }
    };
    fetchPoints();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setErrorMsg('Invalid image type. Please select JPEG, PNG, WEBP, or GIF.');
        return;
      }
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        setErrorMsg('Image size exceeds 5MB limit.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const locationType = locationName.toLowerCase().includes('school')
    ? 'school'
    : locationName.toLowerCase().includes('hospital') || locationName.toLowerCase().includes('health')
    ? 'hospital'
    : locationName.toLowerCase().includes('market')
    ? 'market'
    : 'residential';

  const priorityResult = calculateWastePriority({
    location_type: locationType as any,
    estimated_volume: severity === 'CRITICAL' ? 'massive' : severity === 'HIGH' ? 'large' : severity === 'MEDIUM' ? 'medium' : 'small',
    waste_category: category as any,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!category) {
      setErrorMsg('Please select a waste category.');
      return;
    }

    if (!locationName || locationName.trim().length < 3) {
      setErrorMsg('Please enter a valid location name (at least 3 characters).');
      return;
    }

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setErrorMsg('Invalid GPS coordinates. Select on map.');
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10) {
      setErrorMsg('Description must be at least 10 characters long.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800';

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('waste-photos')
          .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('waste-photos').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            uploadedImageUrl = publicUrlData.publicUrl;
          }
        }
      }

      const fullDescription = `${locationName.trim()}: ${trimmedDesc}`;

      // Step 1: Validate collection_point_id & user_id against DB FK constraints
      let validCpId: string | null = null;
      if (collectionPointId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collectionPointId)) {
        validCpId = collectionPointId;
      }

      let validUserId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          validUserId = session.user.id;
        } else if (user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
          const { data: prof } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
          if (prof?.id) validUserId = prof.id;
        }
      } catch (e) {
        console.warn('Auth session check notice:', e);
      }

      const insertPayload = {
        user_id: validUserId,
        collection_point_id: validCpId,
        category,
        severity,
        description: fullDescription,
        latitude,
        longitude,
        image_url: uploadedImageUrl,
        status: 'pending',
      };

      console.log('[Citizen Report Submit] Inserting into Supabase waste_reports:', insertPayload);

      // Step 2: Execute REAL Supabase INSERT
      const { data, error } = await supabase
        .from('waste_reports')
        .insert([insertPayload])
        .select('*')
        .single();

      if (error) {
        console.error('[Citizen Report Submit] Supabase error:', error);
        setErrorMsg(`Failed to save report to database: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        setErrorMsg('Database returned empty response. Please try again.');
        setIsSubmitting(false);
        return;
      }

      console.log('[Citizen Report Submit] Successfully inserted report:', data.id);

      const generatedReportId = data.id;
      const reportStatus = 'Submitted';

      saveReportToLocalCache({
        id: generatedReportId,
        report_code: `WR-${generatedReportId.slice(-6).toUpperCase()}`,
        user_id: user?.id || undefined,
        collection_point_id: validCpId || undefined,
        location_name: locationName.trim(),
        category,
        severity,
        description: trimmedDesc,
        latitude,
        longitude,
        image_url: uploadedImageUrl,
        photo_url: uploadedImageUrl,
        status: reportStatus as any,
        priority_score: priorityResult.score,
        priority_level: priorityResult.level,
        created_at: data.created_at || new Date().toISOString(),
      });

      await addNotification({
        title: t('notifOverdueTitle'),
        message: `${locationName.trim()}: ${trimmedDesc.slice(0, 50)}...`,
        type: 'alert',
        user_id: validUserId || undefined,
        report_id: generatedReportId,
      });

      setCreatedReport({
        id: generatedReportId,
        status: reportStatus,
        priorityScore: priorityResult.score,
        priorityLevel: priorityResult.level,
      });

    } catch (err: any) {
      console.error('[Citizen Report Submit] Unexpected exception:', err);
      setErrorMsg(err?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center sm:justify-start space-x-2">
          <PlusCircle className="w-6 h-6 text-emerald-600" />
          <span>{t('citizenReportOverflowing')}</span>
        </h1>
        <p className="text-xs text-slate-500">
          {t('citizenReportOverflowingSub')}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        
        {/* Step 1: Waste Category Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            1. {t('citizenCategory')} *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { id: 'overflowing_bin', label: t('statusOverflowing'), desc: 'Public bin overflow' },
              { id: 'organic', label: t('catGeneralHousehold'), desc: 'Organic waste' },
              { id: 'hazardous', label: t('catHazardousMedical'), desc: 'Medical & hazardous' },
              { id: 'recyclable', label: t('catPlasticPaper'), desc: 'Plastic & Paper' },
              { id: 'construction', label: t('catConstruction'), desc: 'Debris & rubble' },
              { id: 'general', label: t('catGeneralHousehold'), desc: 'Mixed waste' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as WasteCategory)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  category === cat.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <p className="font-bold">{cat.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            2. {t('citizenSeverity')} *
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
            {[
              { id: 'LOW', label: t('priorityLow'), color: 'border-emerald-400 text-emerald-700 bg-emerald-50' },
              { id: 'MEDIUM', label: t('priorityMedium'), color: 'border-blue-400 text-blue-700 bg-blue-50' },
              { id: 'HIGH', label: t('priorityHigh'), color: 'border-amber-400 text-amber-700 bg-amber-50' },
              { id: 'CRITICAL', label: t('priorityCritical'), color: 'border-red-400 text-red-700 bg-red-50' },
            ].map((sev) => (
              <button
                key={sev.id}
                type="button"
                onClick={() => setSeverity(sev.id as SeverityLevel)}
                className={`py-2 rounded-xl border text-center transition-all ${
                  severity === sev.id
                    ? `${sev.color} ring-2 ring-emerald-500 shadow-sm`
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collection Point Dropdown (Optional) */}
        {collectionPoints.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('adminStatTotalPoints')}</span>
            </label>
            <select
              value={collectionPointId}
              onChange={(e) => {
                setCollectionPointId(e.target.value);
                const cp = collectionPoints.find(p => p.id === e.target.value);
                if (cp) {
                  setLocationName(cp.name);
                  setLatitude(cp.latitude);
                  setLongitude(cp.longitude);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Choose nearest dumping point (or enter location below)</option>
              {collectionPoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {tLocation(cp.name)} ({cp.current_fill_percent}% filled)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: Location Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            3. {t('citizenLocationName')} *
          </label>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            locationName={locationName}
            onLocationNameChange={setLocationName}
          />
        </div>

        {/* Step 4: Description Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              4. {t('citizenDescription')} *
            </label>
            <span className="text-[10px] text-slate-400">
              {description.trim().length} / 500 chars (min 10)
            </span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the waste situation..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Step 5: Geotag Camera & Photo Proof */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            5. {t('citizenPhotoUrl')} (Geotagged Photo Verification)
          </label>

          <GeotagCamera
            roleLabel="CITIZEN REPORT"
            defaultLandmark={locationName}
            defaultLat={latitude}
            defaultLng={longitude}
            onCapture={(gData: GeotagData) => {
              setPreviewUrl(gData.dataUrl);
              if (gData.file) setSelectedFile(gData.file);
              if (gData.latitude && gData.longitude) {
                setLatitude(gData.latitude);
                setLongitude(gData.longitude);
              }
              if (gData.landmark) {
                setLocationName(gData.landmark);
              }
            }}
            onClear={() => {
              setPreviewUrl(null);
              setSelectedFile(null);
            }}
          />
        </div>

        {/* Priority Engine Preview */}
        <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{t('pulseTitle')}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Formula score calculated dynamically before submission
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {priorityResult.score} / 100
            </span>
            <span className="block text-[10px] font-bold uppercase text-emerald-600">
              {priorityResult.level}
            </span>
          </div>
        </div>

        {/* Step 6: Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>{t('actionSubmit')}</span>
            </>
          )}
        </button>

      </form>

      {/* Submission Confirmation Modal */}
      {createdReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-center">
            
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {t('citizenSubmitSuccess', { code: createdReport.id })}
              </h3>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => router.push(`/citizen/reports/${createdReport.id}`)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                {t('actionViewDetails')}
              </button>
              <button
                onClick={() => {
                  setCreatedReport(null);
                  router.push('/citizen/reports');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                {t('navMyReports')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
