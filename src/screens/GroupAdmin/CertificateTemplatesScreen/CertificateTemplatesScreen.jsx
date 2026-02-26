import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import {
  Plus, Type, Edit2, CheckCircle, XCircle,
  Layout, Clock, AlertCircle, FileText
} from 'lucide-react';
import './CertificateTemplatesScreen.css';

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (status === 'active') {
    return (
      <span className="status-badge active">
        <CheckCircle size={12} />
        Active
      </span>
    );
  }
  return (
    <span className="status-badge inactive">
      <XCircle size={12} />
      Inactive
    </span>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const CertificateTemplatesScreen = () => {
  const navigate = useNavigate();
  const { setHeaderActions, setHeaderTitle, setHeaderSubtitle } = useHeader();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // ── Header ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setHeaderTitle('Instructor Certificate Templates');
    setHeaderSubtitle('Design and manage the multi-ACC achievement certificate');
    setHeaderActions(null);
    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderActions, setHeaderTitle, setHeaderSubtitle]);

  // ── Load templates on mount ────────────────────────────────────────────────
  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.listCertificateTemplates({
        template_type: 'instructor',
        per_page: 20,
      });
      // API returns paginated response: { data: [...], total: N, … }
      const list = data?.data ?? data?.templates ?? (Array.isArray(data) ? data : []);
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load certificate templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Open designer (create or edit) ─────────────────────────────────────────
  const openDesigner = async (existingId = null) => {
    if (existingId) {
      navigate(`/admin/certificate-templates/${existingId}/design`);
      return;
    }

    try {
      setCreating(true);
      const newTemplate = await adminAPI.createCertificateTemplate({
        name: 'Instructor Achievement Certificate',
        status: 'active',
        orientation: 'landscape',
      });
      if (newTemplate?.template?.id) {
        navigate(`/admin/certificate-templates/${newTemplate.template.id}/design`);
      }
    } catch (err) {
      console.error('Failed to create template:', err);
      // If a 422 comes back, the API tells us the existing template id
      const existingId = err?.response?.data?.existing_template_id;
      if (existingId) {
        navigate(`/admin/certificate-templates/${existingId}/design`);
      } else {
        alert('Failed to create certificate template. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '—';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="certificate-templates-screen">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="loading-spinner" />
          <p className="text-gray-500 text-sm">Loading templates…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="certificate-templates-screen">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchTemplates}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="certificate-templates-screen">


      {/* ── Templates list / empty state ─────────────────────────────────── */}
      {templates.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <p className="empty-state-title">No templates yet</p>
            <p className="empty-state-description mb-6">
              Create your first instructor achievement certificate template to get started.
            </p>
            <button
              onClick={() => openDesigner()}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {creating
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Plus size={18} />}
              {creating ? 'Creating…' : 'Create Certificate Template'}
            </button>
          </div>
        </div>
      ) : (
        /* Template cards */
        <div className="flex flex-col gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Status stripe */}
              <div
                className="h-1 w-full"
                style={{
                  backgroundColor:
                    tmpl.status === 'active' ? '#10B981' : '#9CA3AF',
                }}
              />

              <div className="p-6 flex items-center gap-5">
                {/* Background preview / placeholder */}
                <div
                  className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100"
                  style={{ backgroundColor: 'var(--primary-50)' }}
                >
                  {tmpl.background_image_url ? (
                    <img
                      src={tmpl.background_image_url}
                      alt="bg"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Layout size={28} style={{ color: 'var(--primary-300, #7894ba)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{tmpl.name}</h3>
                    <StatusBadge status={tmpl.status} />
                    <span className="type-badge instructor">Instructor</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Layout size={12} />
                      {tmpl.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Updated {formatDate(tmpl.updated_at)}
                    </span>
                    {tmpl.created_by_user && (
                      <span>by {tmpl.created_by_user.name}</span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => openDesigner(tmpl.id)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    color: 'var(--primary-color)',
                    borderColor: 'var(--primary-200)',
                    backgroundColor: 'var(--primary-50)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                    e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                >
                  <Edit2 size={14} />
                  Edit Design
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── About box ────────────────────────────────────────────────────── */}
      <div
        className="mt-6 p-5 rounded-xl border text-sm"
        style={{
          backgroundColor: 'var(--primary-50)',
          borderColor: 'var(--primary-200)',
          color: 'var(--primary-800)',
        }}
      >
        <p className="font-semibold mb-2" style={{ color: 'var(--primary-900)' }}>
          How it works
        </p>
        <ul className="space-y-1.5">
          {[
            'Automatically generated when an instructor is authorized by 3 or more distinct ACCs.',
            'The PDF is emailed to the instructor with all authorizing ACC names listed.',
            'Only one active template can exist at a time — deactivate the current one to create a new one.',
            'Supports landscape and portrait orientations with full drag-and-drop design.',
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-2">
              <span style={{ color: 'var(--primary-color)' }} className="mt-0.5">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CertificateTemplatesScreen;
