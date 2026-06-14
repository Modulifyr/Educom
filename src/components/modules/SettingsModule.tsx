import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import type { InstitutionSettings, UpdateInfo } from '../../types';
import { Save, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';

const DEFAULT_SETTINGS: InstitutionSettings = {
  institutionName: '',
  institutionType: 'school',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  currency: 'NPR',
  githubRepo: '',
  address: '',
  phone: '',
  email: '',
};

export function SettingsModule() {
  const [settings, setSettings] = useState<InstitutionSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [currentVersion, setCurrentVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [devResetting, setDevResetting] = useState(false);

  // isDev flag — only show dev tools in debug builds
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('unknown'));
    invoke<InstitutionSettings>('get_institution_settings')
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await invoke('save_institution_settings', { settings });
      setSaveMsg('Settings saved.');
    } catch (e) {
      setSaveMsg(`Error: ${e}`);
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    setUpdateInfo(null);
    try {
      const info = await invoke<UpdateInfo>('check_for_updates', {
        githubRepo: settings.githubRepo,
        currentVersion,
      });
      setUpdateInfo(info);
    } catch (e) {
      setUpdateError(String(e));
    }
    setCheckingUpdate(false);
  };

  const handleDevReset = async () => {
    if (!confirm('This will delete ALL data in the database and reload the app. Continue?')) return;
    setDevResetting(true);
    try {
      await invoke('reset_for_dev');
      window.location.reload();
    } catch (e) {
      alert(String(e));
      setDevResetting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* ── Institution ─────────────────────────────────────────────────── */}
      <Section title="Institution">
        <Field label="Institution Name">
          <input type="text" value={settings.institutionName}
            onChange={e => setSettings({ ...settings, institutionName: e.target.value })}
            className="input" placeholder="e.g. Everest Secondary School" />
        </Field>

        <Field label="Institution Type"
          hint="Controls which student fields are required — Grade for schools, Semester for colleges.">
          <select value={settings.institutionType}
            onChange={e => setSettings({ ...settings, institutionType: e.target.value as InstitutionSettings['institutionType'] })}
            className="input">
            <option value="school">School (Grades 1–12)</option>
            <option value="college">College (Semesters 1–8)</option>
            <option value="university">University (Semesters 1–8)</option>
          </select>
        </Field>

        <Field label="Academic Year">
          <input type="text" value={settings.academicYear}
            onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
            className="input" placeholder="2024-2025" />
        </Field>

        <Field label="Currency Code">
          <input type="text" value={settings.currency}
            onChange={e => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
            className="input w-28" placeholder="NPR" maxLength={5} />
        </Field>

        <Field label="Phone">
          <input type="tel" value={settings.phone ?? ''}
            onChange={e => setSettings({ ...settings, phone: e.target.value })}
            className="input" />
        </Field>

        <Field label="Email">
          <input type="email" value={settings.email ?? ''}
            onChange={e => setSettings({ ...settings, email: e.target.value })}
            className="input" />
        </Field>

        <Field label="Address">
          <textarea value={settings.address ?? ''}
            onChange={e => setSettings({ ...settings, address: e.target.value })}
            rows={2} className="input" />
        </Field>
      </Section>

      {/* ── Updates ─────────────────────────────────────────────────────── */}
      <Section title="Updates">
        <Field label="GitHub Repository"
          hint={`Format: owner/repo — e.g. modulifyr-lab/educom. Releases must use tags like v1.2.3.`}>
          <input type="text" value={settings.githubRepo}
            onChange={e => setSettings({ ...settings, githubRepo: e.target.value.trim() })}
            className="input" placeholder="owner/repo" />
        </Field>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            Current version: <span className="font-mono font-medium text-slate-700">{currentVersion || '—'}</span>
          </span>
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate || !settings.githubRepo}
            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={15} className={checkingUpdate ? 'animate-spin' : ''} />
            {checkingUpdate ? 'Checking…' : 'Check for Update'}
          </button>
        </div>

        {updateError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        {updateInfo && (
          <div className={`p-4 rounded-lg border ${
            updateInfo.available
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
          }`}>
            {updateInfo.available ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <span className="font-semibold text-amber-800">
                    Update available: v{updateInfo.latestVersion}
                  </span>
                </div>
                <p className="text-sm text-amber-700 mb-1">
                  Published {new Date(updateInfo.publishedAt).toLocaleDateString()}
                </p>
                {updateInfo.releaseNotes && (
                  <p className="text-sm text-amber-700 mb-3 line-clamp-3">{updateInfo.releaseNotes}</p>
                )}
                <a
                  href={updateInfo.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <ExternalLink size={14} />
                  View Release on GitHub
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle size={16} />
                <span className="font-medium">You are on the latest version (v{updateInfo.currentVersion})</span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Save ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
          <Save size={18} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saveMsg && (
          <span className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* ── Dev Tools — only in development builds ──────────────────────── */}
      {isDev && (
        <Section title="Developer Tools" className="mt-8 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 mb-3">
            These options are only visible in development builds. They do not compile into production releases.
          </p>
          <button
            onClick={handleDevReset}
            disabled={devResetting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 size={16} />
            {devResetting ? 'Resetting…' : 'Wipe All Data & Re-run Setup Wizard'}
          </button>
        </Section>
      )}
    </div>
  );
}

// ── Local layout helpers ─────────────────────────────────────────────────────

function Section({
  title, children, className = ''
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-4 ${className}`}>
      <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label, hint, children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}