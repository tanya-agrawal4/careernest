import { useEffect, useState, useCallback, type FormEvent } from 'react';
import {
  PlusCircle, Briefcase, Users, Loader2,
  Sparkles, ChevronDown, ChevronUp, RefreshCw,
  Search, Mail, Trash2,
  FileText, ExternalLink, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { cn } from '../../lib/cn';
import CircularProgress from '../../components/CircularProgress';

// =============================================================================
// Types (UNCHANGED)
// =============================================================================
interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  minCgpa: number;
  minExperience: number;
  isActive: boolean;
  createdAt: string;
  _count?: { applications: number };
}

// BUG FIX (Bug 3 + Bug 5): Real applicant type from the API — replaces
// the old hardcoded mock `Applicant` interface with actual DB-backed data.
interface RealApplicant {
  id: string;
  matchScore: number | null;
  status: string;
  appliedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    college: string;
    cgpa: number;
    experienceYears: number;
    resumeUrl: string | null;
    parsedSkills: string[];
    user: { email: string };
  };
}

/**
 * Recruiter Dashboard Component.
 * Primary interface for recruiters to post new jobs, manage existing active listings,
 * and review algorithmic candidate matches.
 * 
 * @architecture
 * Client-Side Filtering: The dashboard fetches only the active jobs belonging to the 
 * authenticated recruiter. "View Applicants" triggers a lazy, on-demand fetch to 
 * avoid loading heavy applicant datasets for jobs the user isn't currently inspecting.
 * 
 * REDESIGN: Enterprise light theme — white cards, slate borders, indigo accents.
 * All API calls, state hooks, event handlers are UNCHANGED.
 */
export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // BUG FIX (Bug 3 + Bug 5): Replace mock applicants state with real API state
  const [viewingApplicantsFor, setViewingApplicantsFor] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<RealApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  // Tracks which applicant's resume is currently being downloaded (shows spinner)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Tracks which applicant's resume is currently being viewed (shows spinner on View btn)
  const [viewingId, setViewingId] = useState<string | null>(null);


  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [minExp, setMinExp] = useState('');


  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await api.get<{ data: Job[] }>('/jobs/my-postings'); // BUG FIX ← was '/jobs'
      setJobs(data.data ?? []);
    } catch {
      toast.error('Failed to load your job listings.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);


  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/jobs', {
        title: title.trim(),
        description: description.trim(),
        // Send empty strings as undefined so the backend defaults to LLM extraction
        minCgpa:      minCgpa.trim()  ? parseFloat(minCgpa)  : undefined,
        minExperience: minExp.trim()  ? parseFloat(minExp)   : undefined,
      });

      toast.success('Job posted! AI has parsed the skills. 🤖');
      setTitle(''); setDescription(''); setMinCgpa(''); setMinExp('');
      setFormOpen(false);
      await fetchJobs();
    } catch {
      toast.error('Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This cannot be undone.')) return;

    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Job successfully deleted.');
      // Optimistically update the UI to avoid a full refetch
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (viewingApplicantsFor === id) {
        setViewingApplicantsFor(null);
        setApplicants([]);
      }
    } catch {
      toast.error('Failed to delete job.');
    }
  };


  const handleViewApplicants = async (jobId: string) => {
    // Toggle visibility if clicking the same job
    if (viewingApplicantsFor === jobId) {
      setViewingApplicantsFor(null);
      setApplicants([]);
      return;
    }

    setViewingApplicantsFor(jobId);
    setApplicants([]);
    setLoadingApplicants(true);

    try {
      const { data } = await api.get<{ data: RealApplicant[]; totalApplicants: number }>(
        `/jobs/${jobId}/applicants`, // BUG FIX: real endpoint — was hardcoded mock array
      );
      setApplicants(data.data ?? []);
    } catch {
      toast.error('Failed to load applicants.');
      setViewingApplicantsFor(null);
    } finally {
      setLoadingApplicants(false);
    }
  };


  // ===========================================================================
  // handleDownloadResume — Blob-based PDF Download
  // ===========================================================================
  // WHY NOT fl_attachment URL injection:
  //   Cloudinary only supports transformation flags (fl_attachment, fl_attachment:filename)
  //   on `image` and `video` resource types. Our resumes are uploaded as resource_type:
  //   "raw", which deliberately bypasses Cloudini's transformation pipeline. Injecting
  //   `fl_attachment` into a raw URL simply returns a 400 or serves the file unchanged.
  //
  // WHY NOT <a href={url} download>:
  //   The HTML `download` attribute is silently ignored by all browsers for cross-origin
  //   URLs (Cloudinary's domain ≠ your app's domain) — it falls back to navigation,
  //   opening the raw binary as text in the tab.
  //
  // THE FIX — fetch → Blob → createObjectURL:
  //   1. We fetch the raw PDF bytes directly (no axios interceptors — plain fetch).
  //   2. We explicitly wrap the bytes in a new Blob({ type: 'application/pdf' }).
  //      This forces the browser to treat the data as a PDF regardless of the
  //      Content-Type header the remote server sent.
  //   3. We create a fully local blob:// URL via URL.createObjectURL(blob).
  //   4. We click an invisible <a> with the blob URL + download attribute.
  //      The `download` attribute WORKS on same-origin blob:// URLs, so the
  //      browser always saves it as a named .pdf file — no CORS issue at all.
  //   5. We immediately revoke the blob URL to free memory.
  //
  // ⚠️  TEST WITH A NEWLY UPLOADED RESUME:
  //     Old database URLs were generated before Cloudinary was configured with
  //     resource_type: "raw" and the careernest_resumes folder. Re-upload from
  //     the Student Dashboard to generate a valid, fetchable URL before testing.
  // ===========================================================================
  const handleDownloadResume = async (resumeUrl: string, studentName: string, applicantId: string) => {
    setDownloadingId(applicantId);
    try {
      // Step 1: Fetch the raw PDF bytes from Cloudinary.
      // Using native fetch (not axios) to avoid the JWT interceptor adding
      // an Authorization header to the Cloudinary request (would cause a 401).
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
      }

      // Step 2: Read as ArrayBuffer and wrap in a Blob with forced MIME type.
      // This guarantees the browser treats the data as a PDF even if Cloudinary
      // served it with a generic Content-Type: application/octet-stream header.
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

      // Step 3: Create a fully local blob:// URL.
      // blob:// URLs are same-origin by definition — the `download` attribute
      // is guaranteed to work here.
      const blobUrl = window.URL.createObjectURL(blob);

      // Step 4: Build a sanitized filename and trigger the download.
      const safeName = studentName.trim().replace(/\s+/g, '_') || 'resume';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${safeName}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Step 5: Revoke the blob URL immediately after click to free memory.
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${safeName}'s resume`);
    } catch (err) {
      console.error('[Download] Resume fetch failed:', err);
      toast.error('Failed to download resume. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ===========================================================================
  // handleViewResume — Blob-based PDF Preview in New Tab
  // ===========================================================================
  // WHY NOT a plain <a href target="_blank">:
  //   Resumes are stored as resource_type:"raw" on Cloudinary. Cloudinary serves
  //   raw resources with Content-Type: application/octet-stream, NOT application/pdf.
  //   The browser sees octet-stream and renders the raw binary as garbled text
  //   instead of opening the built-in PDF viewer.
  //
  // THE FIX — same fetch → Blob → createObjectURL pattern as Download:
  //   1. Fetch the raw PDF bytes (plain fetch, no axios, avoids JWT 401 on Cloudinary).
  //   2. Wrap bytes in a new Blob({ type: 'application/pdf' }) to force MIME type.
  //   3. Create a local blob:// URL — the browser's PDF viewer opens blob:// URLs
  //      correctly regardless of what Content-Type the remote server sent.
  //   4. Open the blob URL in a new tab.
  //   NOTE: We do NOT revoke the blob URL immediately — the new tab needs it alive
  //   while the PDF is rendering. The browser will release the memory when the tab closes.
  // ===========================================================================
  const handleViewResume = async (resumeUrl: string, applicantId: string) => {
    setViewingId(applicantId);
    try {
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
      }

      // Force application/pdf MIME type so the browser's PDF viewer opens it
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      // Open in new tab — blob:// URLs always trigger the PDF viewer
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[View] Resume fetch failed:', err);
      toast.error('Failed to open resume. Please try again.');
    } finally {
      setViewingId(null);
    }
  };

  const totalApps = jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0);
  const activeJobs = jobs.filter((j) => j.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="section-header">
        <h1 className="text-2xl font-extrabold" style={{ color: '#f0f2f8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Recruiter Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#8b92a9' }}>
          Manage your job postings and review AI-scored applicants
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Your Open Positions"
          value={activeJobs}
          icon={<Briefcase size={20} style={{ color: '#ff6b4a' }} />}
          iconBg="rgba(255,107,74,0.12)"
          iconBorder="rgba(255,107,74,0.2)"
          sub="Your active listings only"
        />
        <StatCard
          label="Total Applications Received"
          value={totalApps}
          icon={<Users size={20} style={{ color: '#22d3a0' }} />}
          iconBg="rgba(34,211,160,0.12)"
          iconBorder="rgba(34,211,160,0.2)"
          sub="Across all your postings"
        />
      </div>

       {/* ── Post job form ───────────────────────────────────────────────── */}
      <div className="enterprise-card overflow-hidden">
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-5 transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,107,74,0.12)', border: '1px solid rgba(255,107,74,0.2)' }}>
              <PlusCircle size={20} style={{ color: '#ff6b4a' }} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base" style={{ color: '#f0f2f8' }}>Post a New Job</p>
              <p className="text-xs flex items-center gap-1.5 mt-0.5 font-semibold" style={{ color: '#8b92a9' }}>
                <Sparkles size={11} style={{ color: '#ff6b4a' }} />
                AI will automatically extract required skills from your description
              </p>
            </div>
          </div>
          {formOpen
            ? <ChevronUp size={18} style={{ color: '#8b92a9' }} />
            : <ChevronDown size={18} style={{ color: '#8b92a9' }} />
          }
        </button>

        {formOpen && (
          <div className="px-6 pb-6 border-t animate-slide-up" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <form onSubmit={(e) => { void handlePost(e); }} className="space-y-5 pt-6">
              <FormField
                label="Job Title"
                value={title}
                onChange={setTitle}
                placeholder="e.g. Full Stack Developer Intern"
              />

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#8b92a9' }}>
                  Job Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Describe the role, responsibilities, and requirements.\n\nExample:\nWe are looking for a React/Node.js developer with 1+ year of experience...\nRequired: React, TypeScript, MongoDB, REST APIs\nMin CGPA: 7.5`}
                  rows={6}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm resize-y transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f0f2f8',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#ff6b4a')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Min CGPA (optional — leave blank for AI to decide)"
                  value={minCgpa}
                  onChange={setMinCgpa}
                  placeholder="e.g. 7.0"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                />
                <FormField
                  label="Min Experience (years, optional)"
                  value={minExp}
                  onChange={setMinExp}
                  placeholder="e.g. 1"
                  type="number"
                  step="0.5"
                  min="0"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #ff6b4a, #ff9a5c)',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(255,107,74,0.35)',
                    opacity: submitting ? 0.5 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Sparkles size={16} />
                  }
                  {submitting ? 'Posting & Parsing…' : 'Post Job with AI'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b92a9' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Job listings ───────────────────────────────────────────────────── */}
      <div className="enterprise-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#f0f2f8' }}>
            <Briefcase size={16} style={{ color: '#ff6b4a' }} />
            Your Postings
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.07)', color: '#8b92a9', border: '1px solid rgba(255,255,255,0.1)' }}>
              {jobs.length}
            </span>
          </h2>
          <button
            onClick={() => void fetchJobs()}
            disabled={loadingJobs}
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#8b92a9' }}
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loadingJobs ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingJobs ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Briefcase size={28} style={{ color: '#8b92a9' }} />
            </div>
            <p className="font-bold text-base" style={{ color: '#f0f2f8' }}>No jobs posted yet</p>
            <p className="text-sm mt-1" style={{ color: '#8b92a9' }}>Click "Post a New Job" above to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,74,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,107,74,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                {/* Job Header */}
                <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate" style={{ color: '#f0f2f8' }}>{job.title}</h3>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: '#8b92a9' }}>
                        Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: job.isActive ? 'rgba(34,211,160,0.1)' : 'rgba(255,255,255,0.05)',
                        color: job.isActive ? '#22d3a0' : '#8b92a9',
                        border: job.isActive ? '1px solid rgba(34,211,160,0.25)' : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {job.isActive ? '● Active' : '● Closed'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.requiredSkills.slice(0, 5).map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs font-bold rounded-lg" style={{ background: 'rgba(255,107,74,0.1)', border: '1px solid rgba(255,107,74,0.2)', color: '#ff9a5c' }}>
                        {s}
                      </span>
                    ))}
                    {job.requiredSkills.length > 5 && (
                      <span className="text-xs font-medium self-center px-1" style={{ color: '#8b92a9' }}>
                        +{job.requiredSkills.length - 5} more
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: '#8b92a9' }}>
                    <span>CGPA ≥ <span className="font-bold" style={{ color: '#f0f2f8' }}>{job.minCgpa}</span></span>
                    <span>Exp ≥ <span className="font-bold" style={{ color: '#f0f2f8' }}>{job.minExperience} yrs</span></span>
                    <span className="font-bold" style={{ color: '#22d3a0' }}>
                      {job._count?.applications ?? 0} Applicant{(job._count?.applications ?? 0) !== 1 ? 's' : ''}
                    </span>

                    <div className="ml-auto flex items-center gap-3">
                      <button
                        onClick={() => void handleDeleteJob(job.id)}
                        className="flex items-center gap-1 font-bold transition-colors text-xs"
                        style={{ color: '#f87171' }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                      <button
                        onClick={() => void handleViewApplicants(job.id)}
                        className="flex items-center gap-1 font-bold transition-colors text-xs"
                        style={{ color: '#ff6b4a' }}
                      >
                        <Users size={13} />
                        {viewingApplicantsFor === job.id ? 'Hide Applicants' : 'View Applicants'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Real Applicants Panel ─────────────────────────────────── */}
                {viewingApplicantsFor === job.id && (
                  <div className="border-t p-5 animate-slide-up" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#8b92a9' }}>
                      <Search size={13} style={{ color: '#ff6b4a' }} />
                      AI Ranked Applicants
                      {!loadingApplicants && (
                        <span className="ml-auto font-bold normal-case text-sm" style={{ color: '#ff6b4a' }}>
                          {applicants.length} {applicants.length === 1 ? 'applicant' : 'applicants'}
                        </span>
                      )}
                    </h4>

                    {loadingApplicants ? (
                      <div className="flex items-center justify-center py-8 gap-3" style={{ color: '#8b92a9' }}>
                        <Loader2 size={20} className="animate-spin" style={{ color: '#ff6b4a' }} />
                        <span className="text-sm font-semibold">Loading applicants…</span>
                      </div>
                    ) : applicants.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <Users size={22} style={{ color: '#8b92a9' }} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: '#8b92a9' }}>No applications yet</p>
                        <p className="text-xs mt-1" style={{ color: '#8b92a9', opacity: 0.6 }}>Students will appear here once they apply</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {applicants.map((applicant) => {
                          const name = `${applicant.student.firstName} ${applicant.student.lastName}`.trim()
                            || applicant.student.user.email;
                          const score = applicant.matchScore ?? 0;

                          return (
                            <div
                              key={applicant.id}
                              className="rounded-xl p-4 flex items-center justify-between transition-all duration-150"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,74,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,74,0.04)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <CircularProgress score={score} size={56} stroke={5} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm" style={{ color: '#f0f2f8' }}>{name}</p>
                                  <p className="text-xs mt-0.5" style={{ color: '#8b92a9' }}>
                                    {applicant.student.college} · <span className="font-bold" style={{ color: '#ff9a5c' }}>{applicant.student.cgpa}</span> CGPA
                                  </p>
                                  {/* Status badge */}
                                  <span
                                    className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                                    style={{
                                      background: applicant.status === 'PENDING'
                                        ? 'rgba(245,158,11,0.1)'
                                        : applicant.status === 'SHORTLISTED'
                                        ? 'rgba(34,211,160,0.1)'
                                        : 'rgba(248,113,113,0.1)',
                                      color: applicant.status === 'PENDING' ? '#f59e0b' : applicant.status === 'SHORTLISTED' ? '#22d3a0' : '#f87171',
                                      border: applicant.status === 'PENDING'
                                        ? '1px solid rgba(245,158,11,0.25)'
                                        : applicant.status === 'SHORTLISTED'
                                        ? '1px solid rgba(34,211,160,0.25)'
                                        : '1px solid rgba(248,113,113,0.25)',
                                    }}
                                  >
                                    {applicant.status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Resume Actions — only shown if student has uploaded a resume */}
                                {applicant.student.resumeUrl ? (
                                  <div className="flex items-center gap-1.5">
                                     {/* View: fetch→Blob→window.open so browser PDF viewer
                                         opens correctly even for Cloudinary raw resources
                                         (plain <a href> shows garbled binary text because
                                          Cloudinary serves raw files as octet-stream) */}
                                     <button
                                       type="button"
                                       disabled={viewingId === applicant.id}
                                       onClick={() => void handleViewResume(applicant.student.resumeUrl!, applicant.id)}
                                       className="px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                       style={{ background: 'rgba(255,107,74,0.1)', color: '#ff9a5c', border: '1px solid rgba(255,107,74,0.2)' }}
                                       title="View resume in new tab"
                                     >
                                       {viewingId === applicant.id
                                         ? <Loader2 size={12} className="animate-spin" />
                                         : <FileText size={12} />}
                                       {viewingId === applicant.id ? 'Opening…' : 'View'}
                                       {viewingId !== applicant.id && <ExternalLink size={10} />}
                                     </button>
                                     {/* Download: fetch→Blob→createObjectURL pattern
                                        bypasses ALL cross-origin download restrictions */}
                                    <button
                                      type="button"
                                      disabled={downloadingId === applicant.id}
                                      onClick={() => {
                                        const name = `${applicant.student.firstName} ${applicant.student.lastName}`.trim()
                                          || applicant.student.user.email;
                                        void handleDownloadResume(applicant.student.resumeUrl!, name, applicant.id);
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                      style={{ background: 'rgba(34,211,160,0.1)', color: '#22d3a0', border: '1px solid rgba(34,211,160,0.2)' }}
                                      title="Download resume as PDF"
                                    >
                                      {downloadingId === applicant.id
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <Download size={12} />
                                      }
                                      {downloadingId === applicant.id ? 'Saving…' : 'Download'}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="px-3 py-1.5 text-xs rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: '#8b92a9', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    No Resume
                                  </span>
                                )}
                                {/* Contact via email */}
                                <a
                                  href={`mailto:${applicant.student.user.email}`}
                                  className="p-1.5 rounded-xl transition-colors"
                                  style={{ color: '#8b92a9' }}
                                  title={`Email ${applicant.student.user.email}`}
                                >
                                  <Mail size={16} />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, iconBg, iconBorder, sub,
}: {
  label: string; value: number; icon: React.ReactNode; iconBg: string; iconBorder?: string; sub: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: '#8b92a9' }}>{label}</span>
        <div className="p-2.5 rounded-xl" style={{ background: iconBg, border: `1px solid ${iconBorder ?? 'rgba(255,255,255,0.1)'}` }}>{icon}</div>
      </div>
      <p className="text-4xl font-black" style={{ color: '#f0f2f8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className="text-xs mt-2 font-semibold" style={{ color: '#8b92a9' }}>{sub}</p>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, type = 'text', step, min, max,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string; min?: string; max?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#8b92a9' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5
                   text-sm text-slate-900 placeholder-slate-400
                   focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                   transition-colors"
      />
    </div>
  );
}
