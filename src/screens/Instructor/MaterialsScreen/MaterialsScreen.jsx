import { useEffect, useState } from 'react';
import { instructorAPI } from '../../../services/api';
import { FileText, Download, Eye } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import DataTable from '../../../components/DataTable/DataTable';
import './MaterialsScreen.css';

const InstructorMaterialsScreen = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = await instructorAPI.getAvailableMaterials();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (material) => {
    setSelectedMaterial(material);
    setDetailModalOpen(true);
  };

  const handleDownload = (material) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank');
    } else {
      alert('File not available');
    }
  };

  const columns = [
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
      header: 'Course',
      accessor: 'course',
      render: (value) => typeof value === 'string' ? value : (value?.name || 'N/A'),
    },
    {
      header: 'Type',
      accessor: 'material_type',
      render: (value) => value ? value.toUpperCase() : 'N/A',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
        <p className="text-gray-600 mt-2">Access course materials for your classes</p>
      </div>

      <DataTable
        columns={columns}
        data={materials}
        onView={handleViewDetails}
        onRowClick={handleViewDetails}
        isLoading={loading}
        emptyMessage="No materials available."
      />

      {/* Material Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedMaterial(null);
        }}
        title="Material Details"
        size="md"
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Name</p>
              <p className="text-base font-semibold text-gray-900">{selectedMaterial.name}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Course</p>
              <p className="text-base font-semibold text-gray-900">{selectedMaterial.course}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Type</p>
              <p className="text-base font-semibold text-gray-900">{selectedMaterial.material_type?.toUpperCase() || 'N/A'}</p>
            </div>
            {selectedMaterial.file_url && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownload(selectedMaterial)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center"
                >
                  <Download size={20} className="mr-2" />
                  Download
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstructorMaterialsScreen;
