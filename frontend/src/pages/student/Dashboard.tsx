import { useEffect, useRef, useState, useCallback } from 'react';
import {
  UploadCloud, FileText, Zap, Trophy, TrendingUp,
  Briefcase, CheckCircle, Loader2, RefreshCw, ChevronRight,
  Info, GraduationCap, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import CircularProgress from '../../components/CircularProgress';
import { cn } from '../../lib/cn';

// =============================================================================
// Types (UNCHANGED)
// =============================================================================
interface StudentProfile {
  firstName:      string;
  lastName:       string;
  college:        string;
  cgpa:           number;
  experienceYears: number;
  resumeUrl:      string | null;
  parsedSkills:   string[];
}

interface MatchedJob {
  matchScore: number;
  hasApplied: boolean; // BUG 2 FIX: injected by backend so apply state survives page refresh
  job: {
    id:            string;
    title:         string;
    description:   string;
    requiredSkills: string[];
    minCgpa:       number;
    minExperience: number;
    recruiter?: {
      recruiterProfile?: { companyName: string; designation: string } | null;
    };
  };
}

// =============================================================================
// Frontend Skill Alias Map — mirrors backend matcher.service.ts
// =============================================================================
// When parsedSkills has "dsa" but JD requires "data structures and algorithms",
// the display should show a green ✓. This map normalizes both sides before
// comparison, exactly matching what the backend matcher does.
// =============================================================================
const FRONTEND_SKILL_ALIASES: Record<string, string> = {
  'dsa':                              'data structures and algorithms',
  'data structures':                  'data structures and algorithms',
  'data structure':                   'data structures and algorithms',
  'algorithms':                       'data structures and algorithms',
  'ds & algorithms':                  'data structures and algorithms',
  'oop':                              'object-oriented programming',
  'oops':                             'object-oriented programming',
  'object oriented programming':      'object-oriented programming',
  'object-oriented':                  'object-oriented programming',
  'os':                               'operating system',
  'operating systems':                'operating system',
  'dbms':                             'database management system',
  'database management':              'database management system',
  'cn':                               'computer networks',
  'computer networking':              'computer networks',
  'networking':                       'computer networks',
  'ml':                               'machine learning',
  'dl':                               'deep learning',
  'ai':                               'artificial intelligence',
  'nlp':                              'natural language processing',
  'cv':                               'computer vision',
  'computer-vision':                  'computer vision',
  'cicd':                             'ci cd',
  'ci/cd':                            'ci cd',
  // REST API — most common mismatch
  'restapi':                          'rest api',
  'rest apis':                        'rest api',
  'restful':                          'rest api',
  'restful api':                      'rest api',
  'restful apis':                     'rest api',
  'rest':                             'rest api',
  // Language shorthands
  'js':                               'javascript',
  'ts':                               'typescript',
  // Framework/Library normalizations
  'reactjs':                          'react',
  'react.js':                         'react',
  'vuejs':                            'vue.js',
  'vue':                              'vue.js',
  'angularjs':                        'angular',
  'nodejs':                           'node.js',
  'node js':                          'node.js',
  'nextjs':                           'next.js',
  'next js':                          'next.js',
  'expressjs':                        'express',
  'express.js':                       'express',
  // Database normalizations
  'postgres':                         'postgresql',
  'mongo':                            'mongodb',
  // Cloud/DevOps
  'gcp':                              'google cloud platform',
  'google cloud':                     'google cloud platform',
  'k8s':                              'kubernetes',
  'kube':                             'kubernetes',
  // ML/Data Science
  'sklearn':                          'scikit-learn',
  'scikit learn':                     'scikit-learn',
  'tf':                               'tensorflow',
  'torch':                            'pytorch',
};

function normalizeSkillFrontend(s: string): string {
  const lower = s.toLowerCase().trim();
  return FRONTEND_SKILL_ALIASES[lower] ?? lower;
}

/**
 * Performs a zero-token local computation to determine the skill gap.
 * Both sides are alias-normalized (same as backend) so display pills
 * are accurate: "dsa" in parsedSkills correctly matches "data structures and algorithms" in JD.
 */
function analyzeSkillGap(required: string[], studentSkills: string[]) {
  // Normalize ALL student skills through the alias map before building the lookup set

  const studentNormalized = new Set(studentSkills.map(s => normalizeSkillFrontend(s)));
  const matched: string[] = [];
  const missing: string[] = [];

  required.forEach(skill => {
    // Normalize the JD skill too before checking membership
    const normalizedJobSkill = normalizeSkillFrontend(skill);
    if (studentNormalized.has(normalizedJobSkill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  return { matched, missing };
}


// =============================================================================
// Skill Advice Map — Actionable, Recruiter-Quality Tips
// =============================================================================
// Each entry maps a canonical lowercase skill name to a one-line actionable tip.
// Shown in the skill gap advice panel. Generic fallback used for unlisted skills.
// =============================================================================
const SKILL_ADVICE: Record<string, string> = {
  'data structures and algorithms': 'Practice on LeetCode — start with NeetCode 150 roadmap (Arrays → Linked Lists → Trees). Target 2–3 problems/day.',
  'react':          'Build a portfolio project: a todo-app → weather dashboard → e-commerce page. Official docs + Scrimba React course cover 90% of interviews.',
  'node.js':        'Build a REST API with Express + MongoDB. Add authentication (JWT) to stand out in interviews.',
  'rest api':       'Create a CRUD API with Node.js + Express. Document it with Postman/Swagger — this alone impresses most interviewers.',
  'express':        'Build 2–3 REST APIs with Express. Middleware, routing, and error handling are the key interview topics.',
  'python':         'Complete Python basics on freeCodeCamp, then build a web scraper or data analysis script with pandas to demonstrate applied skills.',
  'machine learning': 'Start with Andrew Ng’s ML Specialization on Coursera. Build a classification or regression project using scikit-learn.',
  'deep learning':  'Complete fast.ai’s Practical Deep Learning course. Build an image classifier using PyTorch or TensorFlow.',
  'docker':         'Complete Docker’s official “Get Started” guide (2 hrs). Then containerize one of your existing projects — mention this in your resume.',
  'kubernetes':     'After Docker, do the official Kubernetes Basics tutorial on kubernetes.io. Focus on Pods, Services, and Deployments.',
  'ci cd':          'Set up a GitHub Actions pipeline for one of your projects: lint → test → build. This is a top hiring differentiator.',
  'sql':            'Complete SQLZoo or Mode Analytics SQL Tutorial. Practice JOINs, GROUP BY, and window functions — all common in interviews.',
  'postgresql':     'Install Postgres locally, design a schema for a real project, practice complex queries and indexing strategies.',
  'mongodb':        'Build a CRUD app with Mongoose + Express. Understand schema design, indexing, and aggregation pipelines.',
  'typescript':     'Convert one of your JavaScript projects to TypeScript. Focus on interfaces, generics, and strict mode.',
  'javascript':     'Master async/await, closures, prototypes, and the event loop. These are the most tested JS concepts in interviews.',
  'html':           'Build 2–3 responsive layouts from scratch. Focus on semantic HTML5 and accessibility (ARIA labels).',
  'css':            'Learn Flexbox and CSS Grid (css-tricks.com guides). Rebuild a popular website layout as a practice exercise.',
  'java':           'Practice OOP design patterns (Singleton, Factory, Observer) in Java. These appear in almost every Java interview.',
  'spring':         'Build a Spring Boot REST API with JPA/Hibernate. Add Spring Security for authentication — shows production-readiness.',
  'aws':            'Get the AWS Cloud Practitioner certification (free practice exams on ExamTopics). Set up an EC2 + S3 project.',
  'google cloud platform': 'Complete the Google Cloud Skills Boost free labs. Build a basic Cloud Run deployment to demonstrate hands-on experience.',
  'system design':  'Study Grokking the System Design Interview. Practice designing URL shortener, Twitter feed, and ride-sharing apps.',
  'object-oriented programming': 'Study the SOLID principles and practice implementing design patterns in your primary language.',
  'git':            'Practice branching strategies (GitFlow), pull requests, and conflict resolution. Contribute to an open-source project.',
  'computer networks': 'Study OSI model, TCP/IP, HTTP/HTTPS, DNS, and sockets. Computer Networking by Kurose & Ross is the best reference.',
  'operating system': 'Focus on process management, memory management, deadlocks, and threading. OSTEP (Three Easy Pieces) is free online.',
  'database management system': 'Study normalization (1NF–3NF–BCNF), ACID properties, transactions, and indexing. These are core to every backend interview.',
  'tensorflow':     'Complete TensorFlow’s official tutorials. Build a CNN for image classification to demonstrate practical ML skills.',
  'pytorch':        'Complete fast.ai’s PyTorch course. Build a custom neural network from scratch to show deep understanding.',
  'scikit-learn':   'Build end-to-end ML pipelines: data preprocessing → model training → evaluation → hyperparameter tuning.',
  'next.js':        'Build a full-stack app using Next.js App Router with server components and API routes. Deploy on Vercel.',
  'graphql':        'Add a GraphQL API to one of your projects using Apollo Server. Compare REST vs GraphQL in your project README.',
  'redis':          'Implement caching and session management with Redis in a Node.js app. Rate limiting with Redis is a bonus.',
};


/**
 * Student Dashboard Component.
 * Acts as the primary interface for students to upload resumes, view their profile, 
 * and browse AI-matched job opportunities.
 * 
 * REDESIGN: Enterprise light theme — white cards, slate borders, indigo accents.
 * All API calls, state hooks, and event handlers are UNCHANGED.
 */
export default function StudentDashboard() {
  const [profile,   setProfile]   = useState<StudentProfile | null>(null);
  const [matches,   setMatches]   = useState<MatchedJob[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [applying,   setApplying]   = useState<string | null>(null); // jobId
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set()); // Track applied jobs
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);


  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: StudentProfile }>('/student/profile');
      setProfile(data.data);
    } catch {
      // 404 means profile not yet created — handled gracefully in UI
    } finally {
      setLoadingProfile(false);
    }
  }, []);


  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const { data } = await api.get<{ data: MatchedJob[] }>('/eligibility/matches');
      const fetched = data.data ?? [];
      setMatches(fetched);

      // BUG 2 FIX: Initialize appliedJobs Set from the hasApplied flags the
      // backend injected. This ensures the 'Applied' button state is correct
      // on every page load — not just within the same session.
      const preApplied = new Set(
        fetched.filter((m) => m.hasApplied).map((m) => m.job.id),
      );
      setAppliedJobs(preApplied);
    } catch {
      // Silently fail — matches can be empty while resume is pending
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    void fetchMatches();
  }, [fetchProfile, fetchMatches]);


  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB.');
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append('resume', file);

    try {
      await api.post('/student/resume', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resume uploaded & parsed! ✨');
      await fetchProfile();
      await fetchMatches();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Upload failed. Please try again.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };


  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplying(jobId);
    try {
      await api.post(
        `/eligibility/apply/${jobId}`,
      );
      toast.success(`Successfully applied to "${jobTitle}"! 🎉`);
      setAppliedJobs(prev => new Set(prev).add(jobId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Application failed.';
      toast.error(msg);
    } finally {
      setApplying(null);
    }
  };


  const stats = [
    {
      label:    'Skills Parsed',
      value:    profile?.parsedSkills.length ?? 0,
      icon:     <Zap size={20} style={{ color: '#ff6b4a' }} />,
      iconBg:   'rgba(255,107,74,0.12)',
      iconBorder: 'rgba(255,107,74,0.2)',
      color:    '#ff6b4a',
    },
    {
      label:    'Job Matches',
      value:    matches.length,
      icon:     <Trophy size={20} style={{ color: '#22d3a0' }} />,
      iconBg:   'rgba(34,211,160,0.12)',
      iconBorder: 'rgba(34,211,160,0.2)',
      color:    '#22d3a0',
    },
    {
      label:    'Top Score',
      value:    matches[0] ? `${matches[0].matchScore}%` : '—',
      icon:     <TrendingUp size={20} style={{ color: '#c084fc' }} />,
      iconBg:   'rgba(192,132,252,0.12)',
      iconBorder: 'rgba(192,132,252,0.2)',
      color:    '#c084fc',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#f0f2f8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Student Dashboard
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#8b92a9' }}>
              Welcome back,{' '}
              <span className="font-bold" style={{ color: '#ff9a5c' }}>
                {(profile?.firstName?.trim())
                  ? `${profile.firstName}${profile.lastName?.trim() ? ' ' + profile.lastName : ''}`.trim()
                  : 'Student'}
              </span>
            </p>
          </div>
          {profile && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.25)' }}>
              <CheckCircle size={16} style={{ color: '#22d3a0' }} />
              <span className="text-xs font-bold" style={{ color: '#22d3a0' }}>Profile Active</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats grid — 1 col mobile / 3 col desktop ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingProfile
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="enterprise-card p-6">
                <div className="skeleton h-4 w-24 mb-4" />
                <div className="skeleton h-8 w-16" />
              </div>
            ))
          : stats.map(({ label, value, icon, iconBg, iconBorder, color }) => (
              <div
                key={label}
                className="enterprise-card p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold" style={{ color: '#8b92a9' }}>{label}</span>
                  <div className="p-2 rounded-xl" style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>{icon}</div>
                </div>
                <p className="text-3xl font-black" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              </div>
            ))
        }
      </div>

      {/* ── Profile info strip ───────────────────────────────────────────── */}
      {profile && (
        <div className="enterprise-card p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#8b92a9' }}>
            <GraduationCap size={14} style={{ color: '#ff6b4a' }} />
            Profile Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'CGPA',       value: profile.cgpa.toFixed(1),                     color: '#ff9a5c' },
              { label: 'Experience', value: `${profile.experienceYears} yrs`,             color: '#f0f2f8' },
              { label: 'College',    value: profile.college,                               color: '#f0f2f8' },
              { label: 'Resume',     value: profile.resumeUrl ? 'Uploaded ✓' : 'Missing', color: profile.resumeUrl ? '#22d3a0' : '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs uppercase tracking-wider mb-1 font-semibold" style={{ color: '#8b92a9' }}>{label}</p>
                <p className="text-sm font-bold truncate" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Skills */}
          {profile.parsedSkills.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5" style={{ color: '#8b92a9' }}>
                <Zap size={12} style={{ color: '#ff6b4a' }} />
                Parsed Skills from Resume
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.parsedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg"
                    style={{ background: 'rgba(255,107,74,0.1)', border: '1px solid rgba(255,107,74,0.2)', color: '#ff9a5c' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Resume upload dropzone ────────────────────────────────────────── */}
      <div className="enterprise-card p-6">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: '#f0f2f8' }}>
          <FileText size={16} style={{ color: '#ff6b4a' }} />
          Resume Upload
        </h2>

        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleUpload(file);
          }}
          className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
          style={{
            borderColor: uploading
              ? 'rgba(255,107,74,0.4)'
              : dragOver
              ? '#ff6b4a'
              : 'rgba(255,255,255,0.12)',
            background: uploading
              ? 'rgba(255,107,74,0.06)'
              : dragOver
              ? 'rgba(255,107,74,0.08)'
              : 'rgba(255,255,255,0.02)',
            transform: dragOver ? 'scale(1.01)' : 'scale(1)',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={36} style={{ color: '#ff6b4a' }} className="animate-spin" />
              <p className="font-bold text-sm" style={{ color: '#ff9a5c' }}>Uploading &amp; parsing…</p>
              <p className="text-xs" style={{ color: '#8b92a9' }}>AI is extracting your skills</p>
            </>
          ) : profile?.resumeUrl ? (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,211,160,0.12)', border: '1px solid rgba(34,211,160,0.25)' }}>
                <CheckCircle size={24} style={{ color: '#22d3a0' }} />
              </div>
              <p className="font-bold text-sm" style={{ color: '#22d3a0' }}>Resume uploaded ✓</p>
              <p className="text-xs" style={{ color: '#8b92a9' }}>Drop a new PDF to replace it</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <UploadCloud size={24} style={{ color: '#8b92a9' }} />
              </div>
              <p className="font-bold text-sm" style={{ color: '#f0f2f8' }}>
                Drop your PDF here or{' '}
                <span style={{ color: '#ff6b4a', textDecoration: 'underline', textUnderlineOffset: '3px' }}>click to browse</span>
              </p>
              <p className="text-xs" style={{ color: '#8b92a9' }}>Max 5 MB · PDF only · AI parses on upload</p>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* ── Job matches feed ─────────────────────────────────────────────── */}
      <div className="enterprise-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#f0f2f8' }}>
            <Briefcase size={16} style={{ color: '#ff6b4a' }} />
            AI Job Matches
            {!loadingMatches && matches.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,107,74,0.12)', color: '#ff9a5c', border: '1px solid rgba(255,107,74,0.2)' }}>
                {matches.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => void fetchMatches()}
            disabled={loadingMatches}
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#8b92a9' }}
            aria-label="Refresh matches"
          >
            <RefreshCw size={15} className={loadingMatches ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingMatches ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="skeleton h-4 w-1/2 mb-3" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Briefcase size={28} style={{ color: '#8b92a9' }} />
            </div>
            <p className="font-bold text-base" style={{ color: '#f0f2f8' }}>No matches yet</p>
            <p className="text-sm mt-1" style={{ color: '#8b92a9' }}>Upload your resume to start matching jobs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(({ matchScore, job }) => {
              const { matched, missing } = analyzeSkillGap(job.requiredSkills, profile?.parsedSkills ?? []);
              const companyName = job.recruiter?.recruiterProfile?.companyName || 'this company';
              const isApplied   = appliedJobs.has(job.id);
              const canApply    = matchScore >= 50 && !isApplied;

              return (
                <div
                  key={job.id}
                  className="job-card flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Score ring */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <CircularProgress score={matchScore} size={72} stroke={7} />
                      {/* Score label badge */}
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        matchScore >= 80
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : matchScore >= 50
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200',
                      )}>
                        {matchScore >= 80 ? 'Excellent' : matchScore >= 50 ? 'Good Fit' : 'Low Match'}
                      </span>
                    </div>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg leading-snug mb-1" style={{ color: '#f0f2f8' }}>{job.title}</h3>
                      {job.recruiter?.recruiterProfile && (
                        <p className="text-sm mb-3 flex items-center gap-1.5" style={{ color: '#8b92a9' }}>
                          <Building2 size={13} style={{ color: '#8b92a9' }} />
                          <span className="font-bold" style={{ color: '#ff9a5c' }}>
                            {job.recruiter.recruiterProfile.companyName}
                          </span>
                          <span style={{ color: '#8b92a9' }}>·</span>
                          <span>{job.recruiter.recruiterProfile.designation}</span>
                        </p>
                      )}

                      <div className="flex gap-3 text-xs" style={{ color: '#8b92a9' }}>
                        <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Min CGPA: <span className="font-black ml-0.5" style={{ color: '#f0f2f8' }}>{job.minCgpa}</span>
                        </span>
                        <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Min Exp: <span className="font-black ml-0.5" style={{ color: '#f0f2f8' }}>{job.minExperience} yrs</span>
                        </span>
                      </div>
                    </div>

                    {/* Apply button */}
                    <button
                      onClick={() => void handleApply(job.id, job.title)}
                      disabled={applying === job.id || !canApply}
                      className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 w-full sm:w-auto"
                      style={{
                        background: isApplied
                          ? 'rgba(34,211,160,0.1)'
                          : canApply
                          ? 'linear-gradient(135deg, #ff6b4a, #ff9a5c)'
                          : 'rgba(255,255,255,0.04)',
                        color: isApplied ? '#22d3a0' : canApply ? '#ffffff' : '#8b92a9',
                        border: isApplied
                          ? '1px solid rgba(34,211,160,0.25)'
                          : canApply
                          ? 'none'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: canApply && !isApplied ? '0 4px 14px rgba(255,107,74,0.35)' : 'none',
                        cursor: (!canApply || applying === job.id) ? 'not-allowed' : 'pointer',
                        opacity: applying === job.id ? 0.6 : 1,
                      }}
                    >
                      {applying === job.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : isApplied ? (
                        <CheckCircle size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                      {isApplied ? 'Applied' : matchScore >= 50 ? 'Apply Now' : 'Below Threshold'}
                    </button>
                  </div>

                  {/* ── Skill Gap Analysis ────────────────────────────── */}
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8b92a9' }}>
                      Skill Gap Analysis
                    </h4>
                    <div className="flex flex-col gap-3">

                      {/* Matched / Missing Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {matched.map(skill => (
                          <span key={skill} className="skill-matched">✓ {skill}</span>
                        ))}
                        {missing.map(skill => (
                          <span key={skill} className="skill-missing">✗ {skill}</span>
                        ))}
                      </div>

                      {/* Smart Resume Improvement Advice */}
                      {missing.length === 0 && matched.length > 0 ? (
                        <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)' }}>
                          <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#22d3a0' }} />
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#22d3a0' }}>Perfect Match! 🎉</p>
                            <p className="text-xs mt-0.5" style={{ color: '#6ee7ca' }}>
                              Your resume covers all {matched.length} required skill{matched.length !== 1 ? 's' : ''}.
                              You have a strong chance of standing out to {companyName}.
                            </p>
                          </div>
                        </div>
                      ) : missing.length > 0 ? (
                        <div
                          className="rounded-xl p-4 space-y-3"
                          style={{
                            background: missing.length <= 2
                              ? 'rgba(245,158,11,0.07)'
                              : missing.length <= 5
                              ? 'rgba(251,146,60,0.07)'
                              : 'rgba(248,113,113,0.07)',
                            border: `1px solid ${
                              missing.length <= 2
                                ? 'rgba(245,158,11,0.2)'
                                : missing.length <= 5
                                ? 'rgba(251,146,60,0.2)'
                                : 'rgba(248,113,113,0.2)'
                            }`,
                          }}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Info size={14} className="flex-shrink-0" style={{ color: missing.length <= 2 ? '#f59e0b' : missing.length <= 5 ? '#fb923c' : '#f87171' }} />
                              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: missing.length <= 2 ? '#f59e0b' : missing.length <= 5 ? '#fb923c' : '#f87171' }}>
                                {missing.length <= 2 ? 'Almost There — ' : missing.length <= 5 ? 'Skill Gap — ' : 'Significant Gap — '}
                                {matched.length}/{matched.length + missing.length} skills matched
                              </p>
                            </div>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: missing.length <= 2 ? 'rgba(245,158,11,0.15)' : missing.length <= 5 ? 'rgba(251,146,60,0.15)' : 'rgba(248,113,113,0.15)',
                                color: missing.length <= 2 ? '#f59e0b' : missing.length <= 5 ? '#fb923c' : '#f87171',
                                border: `1px solid ${ missing.length <= 2 ? 'rgba(245,158,11,0.3)' : missing.length <= 5 ? 'rgba(251,146,60,0.3)' : 'rgba(248,113,113,0.3)' }`,
                              }}
                            >
                              {missing.length} missing
                            </span>
                          </div>

                          {/* Per-skill actionable advice (top 3) */}
                          <div className="space-y-2">
                            {missing.slice(0, 3).map((skill) => {
                              const advice = SKILL_ADVICE[skill.toLowerCase()] ??
                                `Build a hands-on project demonstrating ${skill}. Document it on GitHub with a clear README.`;
                              return (
                                <div
                                  key={skill}
                                  className="flex items-start gap-2.5 rounded-xl p-2.5"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                    style={{ background: missing.length <= 2 ? '#f59e0b' : missing.length <= 5 ? '#fb923c' : '#f87171' }}
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold capitalize" style={{ color: '#f0f2f8' }}>{skill}</span>
                                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#8b92a9' }}>{advice}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Overflow indicator */}
                          {missing.length > 3 && (
                            <p className="text-xs font-semibold pl-4" style={{ color: missing.length <= 5 ? '#fb923c' : '#f87171' }}>
                              + {missing.length - 3} more skill{missing.length - 3 > 1 ? 's' : ''} to work on — focus on the above first.
                            </p>
                          )}
                        </div>
                      ) : null}

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
