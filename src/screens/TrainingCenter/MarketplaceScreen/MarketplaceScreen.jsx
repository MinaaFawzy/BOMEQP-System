import { useEffect, useState } from 'react';
import { trainingCenterAPI } from '../../../services/api';
import { FileText, ShoppingCart, Eye, Download, Package } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import './MarketplaceScreen.css';

const MarketplaceScreen = () => {
  const [materials, setMaterials] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'marketplace') {
        const data = await trainingCenterAPI.browseMaterials();
        setMaterials(data.materials || []);
      } else {
        const data = await trainingCenterAPI.getLibrary();
        setLibrary(data.library || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (material) => {
    setSelectedMaterial(material);
    setDetailModalOpen(true);
  };

  const handlePurchase = (material) => {
    setSelectedMaterial(material);
    setPurchaseModalOpen(true);
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    try {
      await trainingCenterAPI.purchaseFromMarketplace({
        purchase_type: 'material',
        item_id: selectedMaterial.id,
        acc_id: selectedMaterial.acc_id,
        payment_method: 'credit_card', // Changed from 'wallet' to 'credit_card' - wallet option removed
      });
      await loadData();
      setPurchaseModalOpen(false);
      alert('Purchase successful!');
    } catch (error) {
      alert('Failed to purchase: ' + (error.message || 'Unknown error'));
    } finally {
      setPurchasing(false);
    }
  };

  const handleDownload = (item) => {
    if (item.item?.file_url) {
      window.open(item.item.file_url, '_blank');
    } else {
      alert('File not available');
    }
  };

  const marketplaceColumns = [
    {
      header: 'Material',
      accessor: 'name',
      render: (value, row) => (
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <span className="font-medium text-gray-900">{value}</span>
            <div className="text-sm text-gray-500">{row.material_type}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'ACC',
      accessor: 'acc',
      render: (value) => typeof value === 'string' ? value : (value?.name || 'N/A'),
    },
    {
      header: 'Course',
      accessor: 'course',
      render: (value) => typeof value === 'string' ? value : (value?.name || 'N/A'),
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (value) => `$${parseFloat(value || 0).toFixed(2)}`,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const libraryColumns = [
    {
      header: 'Item',
      accessor: 'item',
      render: (value, row) => (
        <div className="flex items-center">
          <Package className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <span className="font-medium text-gray-900">{value?.name || 'N/A'}</span>
            <div className="text-sm text-gray-500">{row.purchase_type}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'purchase_type',
      render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A',
    },
    {
      header: 'Purchased Date',
      accessor: 'purchased_at',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-2">Browse and purchase course materials</p>
      </div>

      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('marketplace');
            setLoading(true);
            loadData();
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'marketplace' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'
          }`}
        >
          Marketplace ({materials.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('library');
            setLoading(true);
            loadData();
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'library' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'
          }`}
        >
          My Library ({library.length})
        </button>
      </div>

      {activeTab === 'marketplace' ? (
        <DataTable
          columns={marketplaceColumns}
          data={materials}
          onView={handleViewDetails}
          onRowClick={handleViewDetails}
          isLoading={loading}
          emptyMessage="No materials available in marketplace."
        />
      ) : (
        <DataTable
          columns={libraryColumns}
          data={library}
          onView={(item) => handleDownload(item)}
          onRowClick={(item) => handleDownload(item)}
          isLoading={loading}
          emptyMessage="No purchased items in library."
        />
      )}

      {/* Material Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedMaterial(null);
        }}
        title="Material Details"
        size="lg"
      >
        {selectedMaterial && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-base font-semibold text-gray-900">{selectedMaterial.name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Type</p>
                <p className="text-base font-semibold text-gray-900">{selectedMaterial.material_type}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">ACC</p>
                <p className="text-base font-semibold text-gray-900">{selectedMaterial.acc}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-base font-semibold text-gray-900">${parseFloat(selectedMaterial.price || 0).toFixed(2)}</p>
              </div>
            </div>
            {selectedMaterial.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-base text-gray-900">{selectedMaterial.description}</p>
              </div>
            )}
            {selectedMaterial.preview_url && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <a
                  href={selectedMaterial.preview_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center"
                >
                  <Eye size={16} className="mr-2" />
                  View Preview
                </a>
              </div>
            )}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  handlePurchase(selectedMaterial);
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center"
              >
                <ShoppingCart size={20} className="mr-2" />
                Purchase
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Purchase Confirmation Modal */}
      <Modal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setSelectedMaterial(null);
        }}
        title="Confirm Purchase"
        size="md"
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to purchase <strong>{selectedMaterial.name}</strong>?
            </p>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Price</p>
              <p className="text-2xl font-bold text-gray-900">${parseFloat(selectedMaterial.price || 0).toFixed(2)}</p>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setPurchaseModalOpen(false);
                  setSelectedMaterial(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MarketplaceScreen;
