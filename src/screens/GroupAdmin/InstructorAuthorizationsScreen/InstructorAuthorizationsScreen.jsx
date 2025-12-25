import { useEffect, useState } from 'react';
import { adminAPI } from '../../../services/api';
import { useHeader } from '../../../context/HeaderContext';
import { Users, DollarSign, Percent, Building2, Clock, CheckCircle, Eye, Search } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import './InstructorAuthorizationsScreen.css';

const InstructorAuthorizationsScreen = () => {
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setHeaderTitle('Instructor Authorization Commissions');
    setHeaderSubtitle('Set commission percentages for instructor authorizations');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getPendingCommissionRequests();
      setAuthorizations(data.authorizations || []);
    } catch (error) {
      console.error('Failed to load authorizations:', error);
      setAuthorizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCommission = (authorization) => {
    setSelectedAuthorization(authorization);
    setCommissionPercentage('');
    setErrors({});
    setCommissionModalOpen(true);
  };

  const handleSubmitCommission = async (e) => {
    e.preventDefault();
    if (!commissionPercentage || parseFloat(commissionPercentage) < 0 || parseFloat(commissionPercentage) > 100) {
      setErrors({ commission_percentage: 'Please enter a valid commission percentage (0-100)' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      await adminAPI.setInstructorAuthorizationCommission(selectedAuthorization.id, {
        commission_percentage: parseFloat(commissionPercentage),
      });
      await loadData();
      setCommissionModalOpen(false);
      setSelectedAuthorization(null);
      setCommissionPercentage('');
      alert('Commission percentage set successfully. Training Center can now complete payment.');
    } catch (error) {
      console.error('Failed to set commission:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (errorData.message) {
          setErrors({ general: errorData.message });
        } else {
          setErrors(errorData);
        }
      } else if (error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to set commission percentage. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredAuthorizations = authorizations.filter(auth => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (auth.instructor?.first_name || '').toLowerCase().includes(term) ||
      (auth.instructor?.last_name || '').toLowerCase().includes(term) ||
      (auth.acc?.name || '').toLowerCase().includes(term) ||
      (auth.training_center?.name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by instructor name, ACC, or training center..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header-gradient">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Instructor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">ACC</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Training Center</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Authorization Price</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAuthorizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-gray-400" size={32} />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {searchTerm ? 'No authorizations found matching your search' : 'No pending commission requests'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm ? 'Try adjusting your search terms' : 'All authorizations have commission percentages set'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAuthorizations.map((auth, index) => (
                  <tr
                    key={auth.id}
                    className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-white transition-all duration-200 table-row-animated"
                    style={{ '--animation-delay': `${index * 0.03}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {auth.instructor?.first_name} {auth.instructor?.last_name}
                          </div>
                          {auth.instructor?.email && (
                            <div className="text-xs text-gray-500">{auth.instructor.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        {auth.acc?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {auth.training_center?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                        {parseFloat(auth.authorization_price || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300">
                        <Clock size={12} className="mr-1" />
                        Pending Commission
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleSetCommission(auth)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md font-medium flex items-center gap-2"
                      >
                        <Percent size={16} />
                        Set Commission
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Commission Modal */}
      <Modal
        isOpen={commissionModalOpen}
        onClose={() => {
          setCommissionModalOpen(false);
          setSelectedAuthorization(null);
          setCommissionPercentage('');
          setErrors({});
        }}
        title="Set Commission Percentage"
        size="md"
      >
        <form onSubmit={handleSubmitCommission} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {selectedAuthorization && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">Instructor: <span className="font-semibold text-gray-900">{selectedAuthorization.instructor?.first_name} {selectedAuthorization.instructor?.last_name}</span></p>
              <p className="text-sm text-gray-600">ACC: <span className="font-semibold text-gray-900">{selectedAuthorization.acc?.name}</span></p>
              <p className="text-sm text-gray-600">Authorization Price: <span className="font-semibold text-gray-900">${parseFloat(selectedAuthorization.authorization_price || 0).toFixed(2)}</span></p>
            </div>
          )}

          <FormInput
            label="Commission Percentage (%)"
            name="commission_percentage"
            type="number"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            required
            min="0"
            max="100"
            step="0.1"
            placeholder="15.5"
            error={errors.commission_percentage}
            helpText="Enter the percentage that Group will receive from the authorization payment"
          />

          {selectedAuthorization && commissionPercentage && !isNaN(parseFloat(commissionPercentage)) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Commission Breakdown:</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  Group receives: <span className="font-semibold">${(parseFloat(selectedAuthorization.authorization_price || 0) * parseFloat(commissionPercentage) / 100).toFixed(2)}</span>
                </p>
                <p className="text-gray-700">
                  ACC receives: <span className="font-semibold">${(parseFloat(selectedAuthorization.authorization_price || 0) * (100 - parseFloat(commissionPercentage)) / 100).toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setCommissionModalOpen(false);
                setSelectedAuthorization(null);
                setCommissionPercentage('');
                setErrors({});
              }}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
            >
              {saving ? 'Saving...' : 'Set Commission'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InstructorAuthorizationsScreen;

