import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { CreditCard, CheckCircle, XCircle, Save, Eye, EyeOff, Lock, Key, AlertCircle, Info } from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import './StripeSettingsScreen.css';

const StripeSettingsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeSetting, setStripeSetting] = useState(null);
  const [form, setForm] = useState({
    publishable_key: '',
    secret_key: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setHeaderTitle('Stripe Settings');
    setHeaderSubtitle('Configure Stripe publishable and secret keys used for online payments');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadSettings = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Try to get active setting first
      let active = null;
      try {
        const activeData = await adminAPI.getActiveStripeSetting();
        active = activeData?.stripe_setting || activeData?.data || activeData || null;
      } catch (e) {
        // Ignore if endpoint not implemented, we'll fallback to list
      }

      if (!active) {
        const listData = await adminAPI.listStripeSettings();
        const items = listData?.stripe_settings || listData?.data || [];
        active = items.length > 0 ? items[0] : null;
      }

      setStripeSetting(active);
      if (active) {
        setForm({
          publishable_key:
            active.publishable_key || active.public_key || active.stripe_key || '',
          // Try common field names from different backends
          secret_key:
            active.secret_key || active.secret || active.stripe_secret || '',
          is_active:
            typeof active.is_active === 'boolean'
              ? active.is_active
              : active.status
                ? active.status === 'active'
                : true,
        });
      }
    } catch (error) {
      console.error('Failed to load Stripe settings:', error);
      setErrors({
        general:
          error.response?.data?.message ||
          error.message ||
          'Failed to load Stripe settings. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      publishable_key: form.publishable_key.trim(),
      secret_key: form.secret_key.trim(),
      is_active: !!form.is_active,
    };

    try {
      if (stripeSetting?.id) {
        await adminAPI.updateStripeSetting(stripeSetting.id, payload);
      } else {
        await adminAPI.createStripeSetting(payload);
      }
      await loadSettings();
      alert('Stripe settings saved successfully!');
    } catch (error) {
      console.error('Failed to save Stripe settings:', error);
      const data = error.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else if (data?.message) {
        setErrors({ general: data.message });
      } else {
        setErrors({
          general: error.message || 'Failed to save Stripe settings. Please try again.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="stripe-settings-screen max-w-7xl mx-auto px-4 py-8">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Main Configuration Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100/50 to-purple-100/50 rounded-full blur-3xl -z-0 pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>

            {/* Header */}
            <div className="relative z-10 p-8 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-200">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Payment Configuration</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Manage your Stripe API credentials</p>
                  </div>
                </div>

                {/* Status Toggle 
                  <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <span className={`text-sm font-semibold ${form.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                      {form.is_active ? 'Live Mode Active' : 'Payments Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChange('is_active', !form.is_active)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${form.is_active
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-200'
                        : 'bg-gray-300'
                        }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${form.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>*/}
              </div>
            </div>

            {/* Form Content */}
            <div className="relative z-10 p-8">
              {errors.general && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <div className="p-1 bg-red-100 rounded-full flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Configuration Error</h4>
                    <p className="text-sm text-red-600 mt-1">{errors.general}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Publishable Key */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary-500" />
                      publishable Key
                    </label>
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline">
                      Find in Dashboard
                    </a>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg group-focus-within:bg-primary-50 group-focus-within:text-primary-600 transition-colors">
                        <Key className="h-4 w-4" />
                      </div>
                    </div>
                    <input
                      name="publishable_key"
                      value={form.publishable_key}
                      onChange={(e) => handleChange('publishable_key', e.target.value)}
                      placeholder="pk_live_..."
                      className={`block w-full pl-12 pr-10 py-4 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono text-sm ${errors.publishable_key ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                        }`}
                    />
                    {form.publishable_key && !errors.publishable_key && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 px-1">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <p>Standard prefix: <span className="font-mono text-primary-600 bg-primary-50 px-1 rounded">pk_live_</span> or <span className="font-mono text-gray-600 bg-gray-100 px-1 rounded">pk_test_</span></p>
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-500" />
                      Secret Key
                    </label>
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full font-medium">
                      Server-side only
                    </span>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg group-focus-within:bg-purple-50 group-focus-within:text-purple-600 transition-colors">
                        <Lock className="h-4 w-4" />
                      </div>
                    </div>
                    <input
                      name="secret_key"
                      type={showSecretKey ? 'text' : 'password'}
                      value={form.secret_key}
                      onChange={(e) => handleChange('secret_key', e.target.value)}
                      placeholder="sk_live_..."
                      className={`block w-full pl-12 pr-12 py-4 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm ${errors.secret_key ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showSecretKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 px-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <p>Keep secert! Prefix: <span className="font-mono text-purple-600 bg-purple-50 px-1 rounded">sk_live_</span> or <span className="font-mono text-gray-600 bg-gray-100 px-1 rounded">sk_test_</span></p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-8 flex items-center justify-end border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="relative group overflow-hidden px-8 py-3.5 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-2">
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving keys...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>Save Configuration</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar Guide */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Info className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Setup Guide</h3>
            </div>

            <div className="space-y-6 relative">
              {/* Timeline Line */}
              <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-gray-100"></div>

              {/* Steps */}
              {[
                { title: 'Get API Keys', desc: 'Login to Stripe Dashboard > Developers > API keys', icon: '1', color: 'blue' },
                { title: 'Copy Credentials', desc: 'Copy the Publishable key and Secret key', icon: '2', color: 'indigo' },
                { title: 'Paste & Save', desc: 'Enter keys in the form and save changes', icon: '3', color: 'purple' }
              ].map((step, idx) => (
                <div key={idx} className="relative flex gap-4 group">
                  <div className={`w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center text-xs font-bold text-white z-10 transition-transform group-hover:scale-110 bg-${step.color}-500`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-sm font-bold text-gray-900">{step.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Links</h4>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 transition-all group"
              >
                <span className="text-sm font-medium">Stripe Dashboard</span>
                <span className="p-1 bg-white rounded-lg shadow-sm group-hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default StripeSettingsScreen;
