import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { InstitutionType, UserRole } from '../../types';
import { Building2, GraduationCap, BookOpen, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface WizardState {
  // Step 1: Institution
  institutionName: string;
  institutionType: InstitutionType;
  academicYear: string;
  currency: string;
  githubRepo: string;
  // Step 2: Admin account
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const INITIAL: WizardState = {
  institutionName: '',
  institutionType: 'school',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  currency: 'NPR',
  githubRepo: '',
  fullName: '',
  username: 'admin',
  password: '',
  confirmPassword: '',
};

const INST_OPTIONS: { type: InstitutionType; label: string; desc: string; icon: typeof Building2 }[] = [
  {
    type: 'school',
    label: 'School',
    desc: 'Uses Grades 1–12, sections, stream for Grade 11-12. Parent/guardian contact required.',
    icon: GraduationCap,
  },
  {
    type: 'college',
    label: 'College',
    desc: 'Uses Semesters 1–8. Emergency contact instead of parent.',
    icon: BookOpen,
  },
  {
    type: 'university',
    label: 'University',
    desc: 'Uses Semesters 1–8 with year/level grouping.',
    icon: Building2,
  },
];

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  // ── Validation per step ─────────────────────────────────────────────────

  const validate = (): string | null => {
    if (step === 0) {
      if (!state.institutionName.trim()) return 'Institution name is required';
    }
    if (step === 1) {
      if (!state.fullName.trim()) return 'Your full name is required';
      if (!state.username.trim()) return 'Username is required';
      if (state.password.length < 8) return 'Password must be at least 8 characters';
      if (state.password !== state.confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(null); setStep(s => s - 1); };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save institution settings
      await invoke('save_institution_settings', {
        settings: {
          institutionName: state.institutionName.trim(),
          institutionType: state.institutionType,
          academicYear: state.academicYear.trim(),
          currency: state.currency.trim(),
          githubRepo: state.githubRepo.trim(),
          address: null,
          phone: null,
          email: null,
        }
      });

      // 2. Create admin user
      await invoke('create_user', {
        data: {
          username: state.username.trim(),
          role: 'admin' as UserRole,
          fullName: state.fullName.trim(),
          email: null,
          password: state.password,
        }
      });

      onComplete();
    } catch (e) {
      setError(String(e));
    }
    setSubmitting(false);
  };

  const steps = ['Institution', 'Admin Account', 'Review'];
  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Welcome to Educom</h1>
          <p className="text-sm text-slate-500 mt-1">Set up your institution in a few steps</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                  i < step  ? 'bg-primary-600 text-white' :
                  i === step ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' :
                               'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-sm ${i === step ? 'font-medium text-primary-700' : 'text-slate-400'}`}>
                  {label}
                </span>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 w-6" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[320px]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Step 0: Institution ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={state.institutionName}
                  onChange={e => update({ institutionName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Everest Secondary School" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Institution Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {INST_OPTIONS.map(({ type, label, desc, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => update({ institutionType: type })}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors flex items-start gap-3 ${
                        state.institutionType === type
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={20} className={state.institutionType === type ? 'text-primary-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                      <div>
                        <p className={`font-medium ${state.institutionType === type ? 'text-primary-700' : 'text-slate-700'}`}>
                          {label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input type="text" value={state.academicYear}
                    onChange={e => update({ academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="2024-2025" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <input type="text" value={state.currency}
                    onChange={e => update({ currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="NPR" maxLength={5} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GitHub Repository{' '}
                  <span className="font-normal text-slate-400">(optional — for update notifications)</span>
                </label>
                <input type="text" value={state.githubRepo}
                  onChange={e => update({ githubRepo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="owner/repo" />
              </div>
            </div>
          )}

          {/* ── Step 1: Admin Account ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                This creates the administrator account. You can add more users after setup.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={state.fullName}
                  onChange={e => update({ fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Full name" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input type="text" value={state.username}
                  onChange={e => update({ username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="admin" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input type="password" value={state.password}
                  onChange={e => update({ password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min 8 characters" autoComplete="new-password" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input type="password" value={state.confirmPassword}
                  onChange={e => update({ confirmPassword: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    state.confirmPassword && state.password !== state.confirmPassword
                      ? 'border-red-400'
                      : 'border-slate-300'
                  }`}
                  placeholder="Repeat password" autoComplete="new-password" />
                {state.confirmPassword && state.password !== state.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Review ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">Review before creating your setup:</p>

              <ReviewRow label="Institution" value={state.institutionName} />
              <ReviewRow label="Type"
                value={INST_OPTIONS.find(o => o.type === state.institutionType)?.label ?? state.institutionType} />
              <ReviewRow label="Academic Year" value={state.academicYear} />
              <ReviewRow label="Currency" value={state.currency} />
              {state.githubRepo && <ReviewRow label="GitHub Repo" value={state.githubRepo} />}
              <div className="my-3 border-t border-slate-100" />
              <ReviewRow label="Admin Name" value={state.fullName} />
              <ReviewRow label="Admin Username" value={state.username} />
              <ReviewRow label="Password" value="••••••••" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          {step > 0 ? (
            <button onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}

          {isLastStep ? (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              <Check size={18} />
              {submitting ? 'Setting up…' : 'Complete Setup'}
            </button>
          ) : (
            <button onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}