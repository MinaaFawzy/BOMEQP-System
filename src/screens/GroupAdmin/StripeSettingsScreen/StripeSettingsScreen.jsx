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
    <div className="stripe-settings-screen">
      {/* Main Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Payment Configuration</h2>
                    <p className="text-sm text-primary-100 mt-1">Manage your Stripe API credentials</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${form.is_active ? 'text-green-300' : 'text-gray-300'}`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChange('is_active', !form.is_active)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white ${
                      form.is_active 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute h-6 w-6 rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
                        form.is_active ? 'left-[28px]' : 'left-[4px]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {errors.general && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl shadow-lg animate-fade-in">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-800 font-semibold">{errors.general}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Publishable Key Field */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                      <Key className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Stripe Publishable Key
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Public key for client-side operations</p>
                    </div>
                  </div>
                  <div className="relative">
                    <FormInput
                      name="publishable_key"
                      value={form.publishable_key}
                      onChange={(e) => handleChange('publishable_key', e.target.value)}
                      placeholder="pk_live_51ABC..."
                      required
                      error={errors.publishable_key}
                    />
                    {form.publishable_key && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">
                      Your Stripe publishable key starts with <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-blue-900">pk_live_</code> or <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-blue-900">pk_test_</code>
                    </p>
                  </div>
                </div>

                {/* Secret Key Field */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                      <Lock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Stripe Secret Key
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Private key for server-side operations</p>
                    </div>
                  </div>
                  <div className="relative">
                    <FormInput
                      name="secret_key"
                      type={showSecretKey ? 'text' : 'password'}
                      value={form.secret_key}
                      onChange={(e) => handleChange('secret_key', e.target.value)}
                      placeholder="sk_live_51ABC..."
                      required
                      error={errors.secret_key}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showSecretKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-purple-800">
                      <strong>Keep this secure!</strong> Your secret key starts with <code className="bg-purple-100 px-1.5 py-0.5 rounded font-mono text-purple-900">sk_live_</code> or <code className="bg-purple-100 px-1.5 py-0.5 rounded font-mono text-purple-900">sk_test_</code>. Never share this key publicly.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-600 text-white rounded-xl hover:from-primary-700 hover:via-primary-800 hover:to-primary-700 font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span>Saving Settings...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-6 w-6" />
                        <span>Save Stripe Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Info Card - Takes 1 column on large screens */}
        <div className="lg:col-span-1">
          {/* Quick Guide Card */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-lg border border-blue-200 p-4 h-fit sticky top-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-200">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <Info className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Quick Guide</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-xs font-bold text-white">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 mb-1">Get Your Keys</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Log in to Stripe Dashboard and navigate to API keys.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-200">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-xs font-bold text-white">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 mb-1">Enter Keys</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Copy and paste your keys into the form.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-purple-200">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 mb-1">Save</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Click Save Settings to complete setup.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200">
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                <span>Visit Stripe Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeSettingsScreen;
