import { useEffect, useState } from 'react';
import { accAPI } from '../../../services/api';
import { FileText, Plus } from 'lucide-react';
import Pagination from '../../../components/Pagination/Pagination';
import './MaterialsScreen.css';

const MaterialsScreen = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 12,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    loadMaterials();
  }, [pagination.currentPage, pagination.perPage]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      };
      const data = await accAPI.listMaterials(params);
      
      let materialsArray = [];
      if (data.data) {
        materialsArray = data.data || [];
        setPagination(prev => ({
          ...prev,
          totalPages: data.last_page || data.total_pages || 1,
          totalItems: data.total || 0,
        }));
      } else if (data.materials) {
        materialsArray = data.materials || [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: data.materials?.length || 0,
        }));
      } else {
        materialsArray = Array.isArray(data) ? data : [];
        setPagination(prev => ({
          ...prev,
          totalPages: 1,
          totalItems: materialsArray.length,
        }));
      }
      
      setMaterials(materialsArray);
    } catch (error) {
      console.error('Failed to load materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  
  const handlePerPageChange = (perPage) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Materials</h1>
          <p className="text-gray-600 mt-2">Manage course materials</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center">
          <Plus size={20} className="mr-2" />
          Add Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {materials.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No materials found</p>
          </div>
        ) : (
          materials.map((material) => (
            <div key={material.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <FileText className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{material.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{material.material_type}</p>
              <p className="text-xl font-bold text-gray-900">${material.price?.toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
      
      {!loading && pagination.totalItems > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPageOptions={[12, 24, 48, 96]}
          />
        </div>
      )}
    </div>
  );
};

export default MaterialsScreen;
